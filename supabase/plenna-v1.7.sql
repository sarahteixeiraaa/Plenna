-- Plenna v1.7 — Portal do Cliente
-- Execute no SQL Editor do Supabase APÓS a v1.6.

create extension if not exists pgcrypto with schema extensions;

-- =========================================================
-- 1. CONFIGURAÇÃO DO PORTAL EM CADA CLIENTE
-- =========================================================

alter table public.clients
  add column if not exists portal_token uuid not null default gen_random_uuid(),
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists portal_access_code_hash text not null default '',
  add column if not exists portal_welcome_message text not null default 'Bem-vindo ao seu espaço na Plenna. Acompanhe conteúdos, reuniões, arquivos e pendências em um só lugar.',
  add column if not exists portal_last_access_at timestamptz;

create unique index if not exists clients_portal_token_uidx on public.clients(portal_token);
create index if not exists clients_portal_enabled_idx on public.clients(portal_enabled);

-- =========================================================
-- 2. PENDÊNCIAS COMPARTILHADAS
-- =========================================================

create table if not exists public.client_portal_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  status text not null default 'Pendente' check (status in ('Pendente', 'Em andamento', 'Concluída')),
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta')),
  client_response text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_portal_tasks_owner_idx on public.client_portal_tasks(owner_id);
create index if not exists client_portal_tasks_client_idx on public.client_portal_tasks(client_id);
create index if not exists client_portal_tasks_status_idx on public.client_portal_tasks(status);
create index if not exists client_portal_tasks_due_idx on public.client_portal_tasks(due_date);

alter table public.client_portal_tasks enable row level security;

drop policy if exists "Usuários visualizam pendências de seus clientes" on public.client_portal_tasks;
create policy "Usuários visualizam pendências de seus clientes"
on public.client_portal_tasks for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram pendências de seus clientes" on public.client_portal_tasks;
create policy "Usuários cadastram pendências de seus clientes"
on public.client_portal_tasks for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários editam pendências de seus clientes" on public.client_portal_tasks;
create policy "Usuários editam pendências de seus clientes"
on public.client_portal_tasks for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários excluem pendências de seus clientes" on public.client_portal_tasks;
create policy "Usuários excluem pendências de seus clientes"
on public.client_portal_tasks for delete
to authenticated
using (owner_id = (select auth.uid()));

-- =========================================================
-- 3. ARQUIVOS E LINKS COMPARTILHADOS
-- =========================================================

create table if not exists public.client_portal_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  category text not null default 'Geral',
  url text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists client_portal_files_owner_idx on public.client_portal_files(owner_id);
create index if not exists client_portal_files_client_idx on public.client_portal_files(client_id);

alter table public.client_portal_files enable row level security;

drop policy if exists "Usuários visualizam arquivos de seus clientes" on public.client_portal_files;
create policy "Usuários visualizam arquivos de seus clientes"
on public.client_portal_files for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram arquivos de seus clientes" on public.client_portal_files;
create policy "Usuários cadastram arquivos de seus clientes"
on public.client_portal_files for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários editam arquivos de seus clientes" on public.client_portal_files;
create policy "Usuários editam arquivos de seus clientes"
on public.client_portal_files for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.owner_id = (select auth.uid())
  )
);

drop policy if exists "Usuários excluem arquivos de seus clientes" on public.client_portal_files;
create policy "Usuários excluem arquivos de seus clientes"
on public.client_portal_files for delete
to authenticated
using (owner_id = (select auth.uid()));

-- Reutiliza a função de updated_at das versões anteriores.
drop trigger if exists client_portal_tasks_set_updated_at on public.client_portal_tasks;
create trigger client_portal_tasks_set_updated_at
before update on public.client_portal_tasks
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 4. CONFIGURAÇÃO INTERNA DO PORTAL
-- =========================================================

create or replace function public.configure_client_portal(
  p_client_id uuid,
  p_enabled boolean,
  p_access_code text,
  p_welcome_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target public.clients%rowtype;
  updated public.clients%rowtype;
begin
  select * into target
  from public.clients
  where id = p_client_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Cliente não encontrado.';
  end if;

  if p_enabled
     and nullif(target.portal_access_code_hash, '') is null
     and nullif(btrim(coalesce(p_access_code, '')), '') is null then
    raise exception 'Defina um código de acesso antes de ativar o portal.';
  end if;

  update public.clients
  set
    portal_enabled = coalesce(p_enabled, false),
    portal_welcome_message = coalesce(nullif(btrim(p_welcome_message), ''), portal_welcome_message),
    portal_access_code_hash = case
      when nullif(btrim(coalesce(p_access_code, '')), '') is not null
        then crypt(btrim(p_access_code), gen_salt('bf'))
      else portal_access_code_hash
    end
  where id = p_client_id
  returning * into updated;

  return jsonb_build_object(
    'id', updated.id,
    'name', updated.name,
    'segment', updated.segment,
    'contact_name', updated.contact_name,
    'email', updated.email,
    'phone', updated.phone,
    'instagram', updated.instagram,
    'accent', updated.accent,
    'portal_token', updated.portal_token,
    'portal_enabled', updated.portal_enabled,
    'portal_welcome_message', updated.portal_welcome_message,
    'portal_last_access_at', updated.portal_last_access_at,
    'has_portal_code', nullif(updated.portal_access_code_hash, '') is not null
  );
end;
$$;

revoke all on function public.configure_client_portal(uuid, boolean, text, text) from public;
grant execute on function public.configure_client_portal(uuid, boolean, text, text) to authenticated;

-- =========================================================
-- 5. ACESSO PÚBLICO PROTEGIDO POR TOKEN + CÓDIGO
-- =========================================================

create or replace function public.get_client_portal_info(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'client_name', c.name,
    'client_segment', c.segment,
    'client_accent', c.accent,
    'portal_enabled', c.portal_enabled
  )
  from public.clients c
  where c.portal_token = p_token
  limit 1;
$$;

create or replace function public.get_client_portal(
  p_token uuid,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target public.clients%rowtype;
  result jsonb;
begin
  select * into target
  from public.clients
  where portal_token = p_token
    and portal_enabled = true;

  if not found then
    raise exception 'Portal não encontrado ou desativado.';
  end if;

  if nullif(target.portal_access_code_hash, '') is null
     or crypt(coalesce(p_access_code, ''), target.portal_access_code_hash) <> target.portal_access_code_hash then
    raise exception 'Código de acesso incorreto.';
  end if;

  update public.clients
  set portal_last_access_at = now()
  where id = target.id;

  select jsonb_build_object(
    'client', jsonb_build_object(
      'id', target.id,
      'name', target.name,
      'segment', target.segment,
      'accent', target.accent,
      'welcome_message', target.portal_welcome_message,
      'instagram', target.instagram
    ),
    'contents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'content_format', c.content_format,
        'status', c.status,
        'publication_date', c.publication_date,
        'publication_time', case when c.publication_time is null then '' else to_char(c.publication_time, 'HH24:MI') end,
        'caption', c.caption,
        'cta', c.cta,
        'asset_url', c.asset_url,
        'approval_token', c.approval_token,
        'approval_status', c.approval_status,
        'approval_due_date', c.approval_due_date
      ) order by c.publication_date nulls last, c.created_at desc)
      from public.content_items c
      where c.client_id = target.id
        and c.status in ('Aprovação', 'Agendado', 'Publicado')
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'event_type', e.event_type,
        'status', e.status,
        'start_at', e.start_at,
        'end_at', e.end_at,
        'location', e.location,
        'platform', e.platform,
        'meeting_url', e.meeting_url
      ) order by e.start_at)
      from public.calendar_events e
      where e.client_id = target.id
        and e.status <> 'Cancelado'
        and e.start_at >= now() - interval '30 days'
    ), '[]'::jsonb),
    'briefings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'status', b.status,
        'progress', b.progress,
        'public_token', b.public_token,
        'updated_at', b.updated_at
      ) order by b.updated_at desc)
      from public.briefings b
      where b.client_id = target.id
    ), '[]'::jsonb),
    'files', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'client_id', f.client_id,
        'name', f.name,
        'category', f.category,
        'url', f.url,
        'notes', f.notes,
        'created_at', f.created_at
      ) order by f.created_at desc)
      from public.client_portal_files f
      where f.client_id = target.id
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'client_id', t.client_id,
        'title', t.title,
        'description', t.description,
        'due_date', t.due_date,
        'status', t.status,
        'priority', t.priority,
        'client_response', t.client_response,
        'created_at', t.created_at,
        'updated_at', t.updated_at
      ) order by case when t.status = 'Concluída' then 1 else 0 end, t.due_date nulls last, t.created_at desc)
      from public.client_portal_tasks t
      where t.client_id = target.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.update_client_portal_task(
  p_token uuid,
  p_access_code text,
  p_task_id uuid,
  p_status text,
  p_client_response text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target public.clients%rowtype;
  updated public.client_portal_tasks%rowtype;
begin
  select * into target
  from public.clients
  where portal_token = p_token
    and portal_enabled = true;

  if not found then
    raise exception 'Portal não encontrado ou desativado.';
  end if;

  if nullif(target.portal_access_code_hash, '') is null
     or crypt(coalesce(p_access_code, ''), target.portal_access_code_hash) <> target.portal_access_code_hash then
    raise exception 'Código de acesso incorreto.';
  end if;

  if p_status not in ('Pendente', 'Em andamento', 'Concluída') then
    raise exception 'Status inválido.';
  end if;

  update public.client_portal_tasks
  set
    status = p_status,
    client_response = btrim(coalesce(p_client_response, '')),
    updated_at = now()
  where id = p_task_id
    and client_id = target.id
  returning * into updated;

  if not found then
    raise exception 'Pendência não encontrada.';
  end if;

  return jsonb_build_object(
    'id', updated.id,
    'client_id', updated.client_id,
    'title', updated.title,
    'description', updated.description,
    'due_date', updated.due_date,
    'status', updated.status,
    'priority', updated.priority,
    'client_response', updated.client_response,
    'created_at', updated.created_at,
    'updated_at', updated.updated_at
  );
end;
$$;

revoke all on function public.get_client_portal_info(uuid) from public;
revoke all on function public.get_client_portal(uuid, text) from public;
revoke all on function public.update_client_portal_task(uuid, text, uuid, text, text) from public;
grant execute on function public.get_client_portal_info(uuid) to anon, authenticated;
grant execute on function public.get_client_portal(uuid, text) to anon, authenticated;
grant execute on function public.update_client_portal_task(uuid, text, uuid, text, text) to anon, authenticated;
