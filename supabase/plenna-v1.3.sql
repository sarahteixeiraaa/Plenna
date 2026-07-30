-- Plenna v1.3 — Agenda e Reuniões
-- Execute este arquivo no SQL Editor do Supabase APÓS a atualização v1.2.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  event_type text not null default 'Reunião' check (event_type in ('Reunião', 'Gravação', 'Evento', 'Prazo', 'Interno')),
  status text not null default 'Agendado' check (status in ('Agendado', 'Confirmado', 'Concluído', 'Cancelado')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text not null default '',
  platform text not null default 'Google Meet' check (platform in ('Google Meet', 'Zoom', 'Presencial', 'WhatsApp', 'Outro')),
  meeting_url text not null default '',
  description text not null default '',
  agenda_items jsonb not null default '[]'::jsonb,
  notes text not null default '',
  decisions jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_valid_period check (end_at > start_at),
  constraint calendar_events_agenda_array check (jsonb_typeof(agenda_items) = 'array'),
  constraint calendar_events_decisions_array check (jsonb_typeof(decisions) = 'array'),
  constraint calendar_events_next_steps_array check (jsonb_typeof(next_steps) = 'array')
);

create index if not exists calendar_events_owner_id_idx on public.calendar_events(owner_id);
create index if not exists calendar_events_client_id_idx on public.calendar_events(client_id);
create index if not exists calendar_events_start_at_idx on public.calendar_events(start_at);
create index if not exists calendar_events_type_idx on public.calendar_events(event_type);
create index if not exists calendar_events_status_idx on public.calendar_events(status);

alter table public.calendar_events enable row level security;

drop policy if exists "Usuários visualizam seus compromissos" on public.calendar_events;
create policy "Usuários visualizam seus compromissos"
on public.calendar_events for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Usuários cadastram seus compromissos" on public.calendar_events;
create policy "Usuários cadastram seus compromissos"
on public.calendar_events for insert
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

drop policy if exists "Usuários editam seus compromissos" on public.calendar_events;
create policy "Usuários editam seus compromissos"
on public.calendar_events for update
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

drop policy if exists "Usuários excluem seus compromissos" on public.calendar_events;
create policy "Usuários excluem seus compromissos"
on public.calendar_events for delete
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

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute procedure public.set_updated_at();
