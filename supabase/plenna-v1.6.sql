-- Plenna v1.6 — Aprovação de Conteúdos + Storymaker
-- Execute no SQL Editor do Supabase APÓS as versões anteriores.

-- =========================================================
-- 1. APROVAÇÃO PÚBLICA DE CONTEÚDOS
-- =========================================================

alter table public.content_items
  add column if not exists approval_token uuid not null default gen_random_uuid(),
  add column if not exists approval_status text not null default 'Não enviado',
  add column if not exists approval_due_date date,
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_decided_at timestamptz,
  add column if not exists approval_reviewer_name text not null default '',
  add column if not exists approval_feedback text not null default '';

create unique index if not exists content_items_approval_token_uidx
  on public.content_items(approval_token);

create index if not exists content_items_approval_status_idx
  on public.content_items(approval_status);

create index if not exists content_items_approval_due_date_idx
  on public.content_items(approval_due_date);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_approval_status_check'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_approval_status_check
      check (approval_status in ('Não enviado', 'Aguardando', 'Aprovado', 'Ajustes solicitados'));
  end if;
end $$;

create table if not exists public.content_approval_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  action text not null check (action in ('Solicitação enviada', 'Solicitação cancelada', 'Aprovado', 'Ajustes solicitados')),
  reviewer_name text not null default '',
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_approval_events_owner_id_idx
  on public.content_approval_events(owner_id);

create index if not exists content_approval_events_content_item_id_idx
  on public.content_approval_events(content_item_id);

alter table public.content_approval_events enable row level security;

drop policy if exists "Usuários visualizam histórico de aprovação" on public.content_approval_events;
create policy "Usuários visualizam histórico de aprovação"
on public.content_approval_events for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários registram histórico de aprovação" on public.content_approval_events;
create policy "Usuários registram histórico de aprovação"
on public.content_approval_events for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.content_items c
    where c.id = content_item_id
      and c.owner_id = (select auth.uid())
  )
);

create or replace function public.get_public_content_approval(p_token uuid)
returns table (
  id uuid,
  title text,
  content_format text,
  caption text,
  cta text,
  asset_url text,
  reference_url text,
  publication_date date,
  publication_time text,
  approval_status text,
  approval_due_date date,
  approval_requested_at timestamptz,
  approval_decided_at timestamptz,
  approval_reviewer_name text,
  approval_feedback text,
  client_name text,
  client_accent text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.title,
    c.content_format,
    c.caption,
    c.cta,
    c.asset_url,
    c.reference_url,
    c.publication_date,
    c.publication_time::text,
    c.approval_status,
    c.approval_due_date,
    c.approval_requested_at,
    c.approval_decided_at,
    c.approval_reviewer_name,
    c.approval_feedback,
    coalesce(cl.name, 'Cliente Plenna') as client_name,
    coalesce(cl.accent, '#7B214B') as client_accent
  from public.content_items c
  left join public.clients cl on cl.id = c.client_id
  where c.approval_token = p_token
    and c.approval_status <> 'Não enviado'
  limit 1;
$$;

create or replace function public.submit_content_approval(
  p_token uuid,
  p_action text,
  p_reviewer_name text,
  p_feedback text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.content_items%rowtype;
begin
  if p_action not in ('Aprovado', 'Ajustes solicitados') then
    raise exception 'Decisão de aprovação inválida.';
  end if;

  if nullif(btrim(p_reviewer_name), '') is null then
    raise exception 'Informe o nome de quem está aprovando.';
  end if;

  if p_action = 'Ajustes solicitados' and nullif(btrim(coalesce(p_feedback, '')), '') is null then
    raise exception 'Descreva os ajustes solicitados.';
  end if;

  select * into target
  from public.content_items
  where approval_token = p_token
  for update;

  if not found then
    raise exception 'Link de aprovação inválido.';
  end if;

  if target.approval_status <> 'Aguardando' then
    raise exception 'Esta solicitação não está mais aguardando uma decisão.';
  end if;

  update public.content_items
  set
    approval_status = p_action,
    approval_decided_at = now(),
    approval_reviewer_name = btrim(p_reviewer_name),
    approval_feedback = btrim(coalesce(p_feedback, '')),
    status = case when p_action = 'Aprovado' then 'Agendado' else 'Aprovação' end
  where id = target.id;

  insert into public.content_approval_events (
    owner_id,
    content_item_id,
    action,
    reviewer_name,
    feedback
  ) values (
    target.owner_id,
    target.id,
    p_action,
    btrim(p_reviewer_name),
    btrim(coalesce(p_feedback, ''))
  );

  return jsonb_build_object('success', true, 'status', p_action);
end;
$$;

revoke all on function public.get_public_content_approval(uuid) from public;
revoke all on function public.submit_content_approval(uuid, text, text, text) from public;
grant execute on function public.get_public_content_approval(uuid) to anon, authenticated;
grant execute on function public.submit_content_approval(uuid, text, text, text) to anon, authenticated;

-- =========================================================
-- 2. STORYMAKER
-- =========================================================

create table if not exists public.story_coverages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  event_date date,
  start_time time,
  end_time time,
  location text not null default '',
  objective text not null default '',
  style text not null default '',
  platform text not null default 'Instagram Stories',
  contact_name text not null default '',
  contact_phone text not null default '',
  schedule_notes text not null default '',
  important_people text[] not null default '{}'::text[],
  moments jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  mentions text not null default '',
  hashtags text not null default '',
  links text not null default '',
  cta text not null default '',
  delivered_url text not null default '',
  final_notes text not null default '',
  status text not null default 'Planejamento',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_coverages_status_check check (status in ('Planejamento', 'Confirmada', 'Em cobertura', 'Finalizada', 'Cancelada')),
  constraint story_coverages_moments_array check (jsonb_typeof(moments) = 'array'),
  constraint story_coverages_equipment_array check (jsonb_typeof(equipment) = 'array')
);

create index if not exists story_coverages_owner_id_idx on public.story_coverages(owner_id);
create index if not exists story_coverages_client_id_idx on public.story_coverages(client_id);
create index if not exists story_coverages_event_date_idx on public.story_coverages(event_date);
create index if not exists story_coverages_status_idx on public.story_coverages(status);

alter table public.story_coverages enable row level security;

drop policy if exists "Usuários visualizam suas coberturas" on public.story_coverages;
create policy "Usuários visualizam suas coberturas"
on public.story_coverages for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram suas coberturas" on public.story_coverages;
create policy "Usuários cadastram suas coberturas"
on public.story_coverages for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "Usuários editam suas coberturas" on public.story_coverages;
create policy "Usuários editam suas coberturas"
on public.story_coverages for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "Usuários excluem suas coberturas" on public.story_coverages;
create policy "Usuários excluem suas coberturas"
on public.story_coverages for delete
to authenticated
using (owner_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists story_coverages_set_updated_at on public.story_coverages;
create trigger story_coverages_set_updated_at
before update on public.story_coverages
for each row execute procedure public.set_updated_at();
