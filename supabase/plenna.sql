-- Plenna v1.1 — estrutura inicial do CRM
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  segment text not null default 'Não informado',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  instagram text not null default '',
  status text not null default 'Onboarding' check (status in ('Ativo', 'Onboarding', 'Pausado')),
  plan text not null default '',
  monthly_value numeric(12,2) not null default 0 check (monthly_value >= 0),
  next_action text not null default 'Definir próxima ação',
  progress integer not null default 0 check (progress between 0 and 100),
  accent text not null default '#7B214B',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients(owner_id);
create index if not exists clients_status_idx on public.clients(status);

alter table public.clients enable row level security;

drop policy if exists "Usuários visualizam seus clientes" on public.clients;
create policy "Usuários visualizam seus clientes"
on public.clients for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Usuários cadastram seus clientes" on public.clients;
create policy "Usuários cadastram seus clientes"
on public.clients for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Usuários editam seus clientes" on public.clients;
create policy "Usuários editam seus clientes"
on public.clients for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Usuários excluem seus clientes" on public.clients;
create policy "Usuários excluem seus clientes"
on public.clients for delete
to authenticated
using (owner_id = auth.uid());

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

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute procedure public.set_updated_at();
