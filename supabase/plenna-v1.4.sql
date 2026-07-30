-- Plenna v1.4 — Planejamento de Conteúdo
-- Execute no SQL Editor do Supabase APÓS as atualizações anteriores.

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  content_format text not null default 'Reel' check (content_format in ('Reel', 'Carrossel', 'Stories', 'Post', 'Live', 'Outro')),
  status text not null default 'Ideia' check (status in ('Ideia', 'Roteiro', 'Gravação', 'Edição', 'Aprovação', 'Agendado', 'Publicado')),
  pillar text not null default '',
  objective text not null default '',
  journey_stage text not null default 'Atração' check (journey_stage in ('Atração', 'Consideração', 'Conversão', 'Relacionamento')),
  hook text not null default '',
  script text not null default '',
  caption text not null default '',
  cta text not null default '',
  publication_date date,
  publication_time time,
  reference_url text not null default '',
  asset_url text not null default '',
  notes text not null default '',
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_owner_id_idx on public.content_items(owner_id);
create index if not exists content_items_client_id_idx on public.content_items(client_id);
create index if not exists content_items_status_idx on public.content_items(status);
create index if not exists content_items_publication_date_idx on public.content_items(publication_date);
create index if not exists content_items_format_idx on public.content_items(content_format);

alter table public.content_items enable row level security;

drop policy if exists "Usuários visualizam seus conteúdos" on public.content_items;
create policy "Usuários visualizam seus conteúdos"
on public.content_items for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram seus conteúdos" on public.content_items;
create policy "Usuários cadastram seus conteúdos"
on public.content_items for insert
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

drop policy if exists "Usuários editam seus conteúdos" on public.content_items;
create policy "Usuários editam seus conteúdos"
on public.content_items for update
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

drop policy if exists "Usuários excluem seus conteúdos" on public.content_items;
create policy "Usuários excluem seus conteúdos"
on public.content_items for delete
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

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
before update on public.content_items
for each row execute procedure public.set_updated_at();
