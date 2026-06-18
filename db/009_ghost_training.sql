-- ============================================================
-- Ghost training (Phase A) — aw_ghosts pool, daily sets, match log
-- Run once in Supabase SQL editor before deploying ghost-training edge fn.
-- ============================================================

create table if not exists public.aw_ghosts (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  handle text not null,
  archetype text not null default 'atk',
  skills jsonb not null,
  moves_equipped jsonb not null default '["strike","slip","whisper","hold"]'::jsonb,
  level integer not null default 1 check (level >= 1),
  build_type text,
  lean_skill text not null default 'attack',
  build_name text,
  variant_id text not null default 'default',
  updated_at timestamptz default now() not null
);

create index if not exists aw_ghosts_level_idx on public.aw_ghosts(level);
create index if not exists aw_ghosts_build_type_idx on public.aw_ghosts(build_type);
create index if not exists aw_ghosts_updated_idx on public.aw_ghosts(updated_at desc);

create table if not exists public.aw_ghost_training_state (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  day_key text not null default '',
  daily_opponents jsonb not null default '[]'::jsonb,
  daily_completed jsonb not null default '[]'::jsonb,
  daily_streak integer not null default 0,
  best_daily_streak integer not null default 0,
  champion_attempted_day_key text,
  champion_cleared_day_key text,
  passive_xp_today integer not null default 0,
  passive_xp_day_key text,
  explainer_seen boolean not null default false,
  news_pending jsonb,
  news_seen_day_key text,
  used_seed_fallback boolean not null default false,
  -- aggregate tracking (over-capture for badges / stats)
  ghosts_fought_total integer not null default 0,
  ghost_wins integer not null default 0,
  ghost_losses integer not null default 0,
  flawless_wins integer not null default 0,
  champion_attempts integer not null default 0,
  champion_wins integer not null default 0,
  daily_sets_completed integer not null default 0,
  your_ghost_wins integer not null default 0,
  your_ghost_losses integer not null default 0,
  your_ghost_served integer not null default 0,
  updated_at timestamptz default now() not null
);

create table if not exists public.aw_ghost_matches (
  id uuid primary key default gen_random_uuid(),
  fighter_user_id uuid not null references public.aw_users(user_id) on delete cascade,
  opponent_source text not null check (opponent_source in ('real', 'seed', 'champion')),
  opponent_id text not null,
  ghost_owner_user_id uuid references public.aw_users(user_id) on delete set null,
  won boolean not null,
  flawless boolean not null default false,
  is_champion boolean not null default false,
  is_daily_set boolean not null default true,
  daily_slot smallint,
  day_key text,
  created_at timestamptz default now() not null
);

create index if not exists aw_ghost_matches_fighter_idx
  on public.aw_ghost_matches(fighter_user_id, created_at desc);
create index if not exists aw_ghost_matches_owner_idx
  on public.aw_ghost_matches(ghost_owner_user_id, created_at desc)
  where ghost_owner_user_id is not null;
create index if not exists aw_ghost_matches_day_idx
  on public.aw_ghost_matches(fighter_user_id, day_key);

alter table public.aw_ghosts enable row level security;
alter table public.aw_ghost_training_state enable row level security;
alter table public.aw_ghost_matches enable row level security;

-- Ghost snapshots are public-readable (served to other players); only service role writes.
drop policy if exists "ghosts are public read" on public.aw_ghosts;
create policy "ghosts are public read" on public.aw_ghosts
  for select using (true);

drop policy if exists "users read own ghost training state" on public.aw_ghost_training_state;
create policy "users read own ghost training state" on public.aw_ghost_training_state
  for select using (auth.uid() = user_id);

drop policy if exists "users read own ghost matches" on public.aw_ghost_matches;
create policy "users read own ghost matches" on public.aw_ghost_matches
  for select using (auth.uid() = fighter_user_id or auth.uid() = ghost_owner_user_id);

-- Inserts/updates via edge function (service role) only; no direct client writes.
