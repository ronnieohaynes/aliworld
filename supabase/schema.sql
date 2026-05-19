-- Run in Supabase SQL Editor (Dashboard → SQL) after creating a project.
-- Battle log tables for ALIWORLD; tighten RLS as your game grows.

create table if not exists public.battle_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.battle_sessions (id) on delete cascade,
  move_id text not null,
  player_hp int not null,
  foe_hp int not null,
  created_at timestamptz not null default now()
);

create index if not exists battle_events_session_id_idx on public.battle_events (session_id);

alter table public.battle_sessions enable row level security;
alter table public.battle_events enable row level security;

create policy "Users manage own battle sessions"
  on public.battle_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users insert events for own sessions"
  on public.battle_events
  for insert
  with check (
    exists (
      select 1 from public.battle_sessions s
      where s.id = battle_events.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users read own battle events"
  on public.battle_events
  for select
  using (
    exists (
      select 1 from public.battle_sessions s
      where s.id = battle_events.session_id and s.user_id = auth.uid()
    )
  );
