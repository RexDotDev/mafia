create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting',
  settings jsonb not null default '{"mafiaCount":1,"doctor":true,"detective":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  role text,
  has_confirmed boolean not null default false,
  is_host boolean not null default false,
  is_narrator boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.players add column if not exists last_seen timestamptz not null default now();
alter table public.players add column if not exists is_narrator boolean not null default false;

create unique index if not exists players_room_client_unique on public.players(room_id, client_id);
create index if not exists players_room_last_seen_idx on public.players(room_id, last_seen);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.players enable row level security;

drop policy if exists rooms_read_all on public.rooms;
create policy rooms_read_all on public.rooms for select using (true);

drop policy if exists players_read_all on public.players;
create policy players_read_all on public.players for select using (true);

alter table public.rooms replica identity full;
alter table public.players replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end $$;
