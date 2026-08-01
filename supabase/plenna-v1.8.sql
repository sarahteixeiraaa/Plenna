-- Plenna v1.8 — Biblioteca Criativa e Central de Arquivos
-- Execute no SQL Editor do Supabase APÓS a v1.7.

-- =========================================================
-- 1. METADADOS DOS MATERIAIS DE CLIENTES
-- =========================================================

alter table public.client_portal_files
  add column if not exists item_type text not null default 'Link',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists portal_visible boolean not null default true,
  add column if not exists favorite boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists client_portal_files_type_idx on public.client_portal_files(item_type);
create index if not exists client_portal_files_visible_idx on public.client_portal_files(portal_visible);
create index if not exists client_portal_files_favorite_idx on public.client_portal_files(favorite);

-- A restrição é criada de forma idempotente para não quebrar novas execuções.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_portal_files_item_type_check'
      and conrelid = 'public.client_portal_files'::regclass
  ) then
    alter table public.client_portal_files
      add constraint client_portal_files_item_type_check
      check (item_type in ('Link', 'Pasta', 'Documento', 'Identidade visual', 'Foto', 'Vídeo', 'Outro'));
  end if;
end $$;

drop trigger if exists client_portal_files_set_updated_at on public.client_portal_files;
create trigger client_portal_files_set_updated_at
before update on public.client_portal_files
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 2. BIBLIOTECA CRIATIVA INTERNA
-- =========================================================

create table if not exists public.creative_library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  item_type text not null default 'Ideia' check (item_type in ('Ideia', 'Roteiro', 'Gancho', 'Legenda', 'CTA', 'Sequência de Stories', 'Template', 'Mensagem')),
  content_format text not null default 'Reel' check (content_format in ('Reel', 'Carrossel', 'Stories', 'Post', 'Live', 'Outro')),
  category text not null default 'Educação' check (category in ('Educação', 'Autoridade', 'Relacionamento', 'Oferta', 'Prova social', 'Bastidores', 'Institucional', 'Outro')),
  hook text not null default '',
  body text not null default '',
  cta text not null default '',
  tags text[] not null default '{}'::text[],
  favorite boolean not null default false,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_library_items_owner_idx on public.creative_library_items(owner_id);
create index if not exists creative_library_items_type_idx on public.creative_library_items(item_type);
create index if not exists creative_library_items_format_idx on public.creative_library_items(content_format);
create index if not exists creative_library_items_favorite_idx on public.creative_library_items(favorite);

alter table public.creative_library_items enable row level security;

drop policy if exists "Usuários visualizam sua biblioteca criativa" on public.creative_library_items;
create policy "Usuários visualizam sua biblioteca criativa"
on public.creative_library_items for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram sua biblioteca criativa" on public.creative_library_items;
create policy "Usuários cadastram sua biblioteca criativa"
on public.creative_library_items for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Usuários editam sua biblioteca criativa" on public.creative_library_items;
create policy "Usuários editam sua biblioteca criativa"
on public.creative_library_items for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Usuários excluem sua biblioteca criativa" on public.creative_library_items;
create policy "Usuários excluem sua biblioteca criativa"
on public.creative_library_items for delete
to authenticated
using (owner_id = (select auth.uid()));

drop trigger if exists creative_library_items_set_updated_at on public.creative_library_items;
create trigger creative_library_items_set_updated_at
before update on public.creative_library_items
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 3. PORTAL DO CLIENTE: EXIBIR APENAS MATERIAIS COMPARTILHADOS
-- =========================================================

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
        'item_type', f.item_type,
        'tags', f.tags,
        'created_at', f.created_at,
        'updated_at', f.updated_at
      ) order by f.favorite desc, f.updated_at desc)
      from public.client_portal_files f
      where f.client_id = target.id
        and f.portal_visible = true
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

revoke all on function public.get_client_portal(uuid, text) from public;
grant execute on function public.get_client_portal(uuid, text) to anon, authenticated;
