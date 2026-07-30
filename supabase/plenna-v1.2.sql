-- Plenna v1.2 — Briefing e Onboarding
-- Execute este arquivo no SQL Editor do Supabase APÓS a estrutura da v1.1.

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null default 'Briefing Estratégico em 5 Pilares',
  status text not null default 'Não iniciado' check (status in ('Não iniciado', 'Em andamento', 'Concluído', 'Revisado')),
  public_token uuid not null unique default gen_random_uuid(),
  current_step integer not null default 0 check (current_step between 0 and 4),
  progress integer not null default 0 check (progress between 0 and 100),
  answers jsonb not null default '{}'::jsonb,
  internal_notes text not null default '',
  checklist jsonb not null default '{}'::jsonb,
  onboarding_notes jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists briefings_owner_id_idx on public.briefings(owner_id);
create index if not exists briefings_client_id_idx on public.briefings(client_id);
create index if not exists briefings_status_idx on public.briefings(status);
create unique index if not exists briefings_public_token_idx on public.briefings(public_token);

alter table public.briefings enable row level security;

drop policy if exists "Usuários visualizam seus briefings" on public.briefings;
create policy "Usuários visualizam seus briefings"
on public.briefings for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram briefings de seus clientes" on public.briefings;
create policy "Usuários cadastram briefings de seus clientes"
on public.briefings for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários editam seus briefings" on public.briefings;
create policy "Usuários editam seus briefings"
on public.briefings for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários excluem seus briefings" on public.briefings;
create policy "Usuários excluem seus briefings"
on public.briefings for delete
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

drop trigger if exists briefings_set_updated_at on public.briefings;
create trigger briefings_set_updated_at
before update on public.briefings
for each row execute procedure public.set_updated_at();

-- Retorna somente as informações necessárias ao formulário público.
create or replace function public.get_public_briefing(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'briefing_id', b.id,
    'title', b.title,
    'client_name', c.name,
    'client_segment', c.segment,
    'status', b.status,
    'current_step', b.current_step,
    'progress', b.progress,
    'answers', b.answers,
    'updated_at', b.updated_at
  )
  from public.briefings b
  join public.clients c on c.id = b.client_id
  where b.public_token = p_token
  limit 1;
$$;

-- Salva o formulário pelo token aleatório sem expor a tabela inteira ao visitante.
create or replace function public.save_public_briefing(
  p_token uuid,
  p_answers jsonb,
  p_current_step integer,
  p_progress integer,
  p_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  update public.briefings b
  set
    answers = coalesce(p_answers, '{}'::jsonb),
    current_step = least(greatest(coalesce(p_current_step, 0), 0), 4),
    progress = least(greatest(coalesce(p_progress, 0), 0), 100),
    status = case
      when b.status = 'Revisado' then 'Revisado'
      when p_submit then 'Concluído'
      when b.status = 'Concluído' then 'Concluído'
      when coalesce(p_progress, 0) > 0 then 'Em andamento'
      else 'Não iniciado'
    end,
    completed_at = case when p_submit then coalesce(b.completed_at, now()) else b.completed_at end,
    updated_at = now()
  where b.public_token = p_token
  returning jsonb_build_object(
    'briefing_id', b.id,
    'status', case when b.status = 'Revisado' then 'Revisado' when p_submit then 'Concluído' else b.status end,
    'progress', b.progress,
    'updated_at', b.updated_at
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_public_briefing(uuid) from public;
revoke all on function public.save_public_briefing(uuid, jsonb, integer, integer, boolean) from public;
grant execute on function public.get_public_briefing(uuid) to anon, authenticated;
grant execute on function public.save_public_briefing(uuid, jsonb, integer, integer, boolean) to anon, authenticated;
