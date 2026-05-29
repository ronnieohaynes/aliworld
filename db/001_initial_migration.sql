-- ============================================================
-- ALIWORLD v1.1 — initial database migration
-- creates all tables for v1.1 + v2 hook tables (empty in v1.1)
-- run this once in the supabase SQL editor
-- ============================================================

-- ============================================================
-- core user + profile tables
-- ============================================================

-- aw_users: extends supabase auth.users with aliworld-specific fields
create table if not exists public.aw_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  email text not null,
  created_at timestamptz default now() not null,
  last_played_at timestamptz default now() not null,
  finished_v1_1 boolean default false not null,
  v2_carryover_eligible boolean default false not null
);

create index if not exists aw_users_handle_idx on public.aw_users(handle);
create index if not exists aw_users_last_played_idx on public.aw_users(last_played_at desc);

-- aw_profiles: the public-facing vault — avatar config, accessories, moves, progress
create table if not exists public.aw_profiles (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  avatar_config jsonb default '{}'::jsonb not null,
  outerwear_starter text,  -- remembers original starter outerwear before red jacket replaces it
  accessory_loadout jsonb default '{}'::jsonb not null,
  accessories_owned jsonb default '[]'::jsonb not null,
  moves_equipped jsonb default '["strike","slip","whisper","hold"]'::jsonb not null,
  moves_unlocked jsonb default '["strike","slip","whisper","hold"]'::jsonb not null,
  current_episode integer default 1 not null,
  episodes_completed jsonb default '[]'::jsonb not null,
  badges jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- game state + progression
-- ============================================================

-- aw_runs: each playthrough is a run; players can have many runs over time
create table if not exists public.aw_runs (
  run_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  started_at timestamptz default now() not null,
  finished_at timestamptz,
  final_screen_seen boolean default false not null,
  current_episode integer default 1 not null,
  current_scene text,
  run_state jsonb default '{}'::jsonb not null,
  death_count integer default 0 not null
);

create index if not exists aw_runs_user_idx on public.aw_runs(user_id, started_at desc);
create index if not exists aw_runs_unfinished_idx on public.aw_runs(user_id) where finished_at is null;

-- aw_progress: per-user persistent stats across all runs
create table if not exists public.aw_progress (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  highest_episode_reached integer default 1 not null,
  total_battles_won integer default 0 not null,
  total_battles_lost integer default 0 not null,
  total_play_time_seconds integer default 0 not null,
  first_finished_at timestamptz,
  runs_completed integer default 0 not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- currency primitive (v2 hook, earns now, spends in v2)
-- ============================================================

create table if not exists public.aw_currency (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  balance integer default 0 not null,
  lifetime_earned integer default 0 not null,
  lifetime_spent integer default 0 not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.aw_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  type text not null check (type in ('earn', 'spend', 'gift', 'admin')),
  amount integer not null,
  reason text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create index if not exists aw_transactions_user_idx on public.aw_transactions(user_id, created_at desc);

-- ============================================================
-- events / analytics (lightweight — supabase as the event log)
-- ============================================================

create table if not exists public.aw_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.aw_users(user_id) on delete set null,
  event_type text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create index if not exists aw_events_type_idx on public.aw_events(event_type, created_at desc);
create index if not exists aw_events_user_idx on public.aw_events(user_id, created_at desc) where user_id is not null;

-- ============================================================
-- email log (tracks transactional email sends)
-- ============================================================

create table if not exists public.aw_email_log (
  email_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.aw_users(user_id) on delete set null,
  type text not null,
  sent_at timestamptz default now() not null,
  resend_message_id text
);

create index if not exists aw_email_log_user_idx on public.aw_email_log(user_id, sent_at desc) where user_id is not null;

-- ============================================================
-- v2 hook tables (created now, populated later)
-- these stay empty in v1.1; v2 reads them on first login
-- ============================================================

create table if not exists public.aw_v2_inventory_unlocks (
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  item_id text not null,
  unlocked_at timestamptz default now() not null,
  source text,
  primary key (user_id, item_id)
);

create table if not exists public.aw_v2_skills (
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  skill_name text not null,
  current_xp integer default 0 not null,
  current_level integer default 1 not null,
  updated_at timestamptz default now() not null,
  primary key (user_id, skill_name)
);

create table if not exists public.aw_v2_locations (
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  location_id text not null,
  first_visited_at timestamptz default now() not null,
  last_visited_at timestamptz default now() not null,
  primary key (user_id, location_id)
);

-- ============================================================
-- helper trigger: keep updated_at fresh
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_profiles on public.aw_profiles;
create trigger set_updated_at_profiles
  before update on public.aw_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_progress on public.aw_progress;
create trigger set_updated_at_progress
  before update on public.aw_progress
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_currency on public.aw_currency;
create trigger set_updated_at_currency
  before update on public.aw_currency
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_v2_skills on public.aw_v2_skills;
create trigger set_updated_at_v2_skills
  before update on public.aw_v2_skills
  for each row execute function public.set_updated_at();

-- ============================================================
-- helper trigger: bootstrap rows on new user signup
-- when a user signs up via supabase auth, we automatically
-- create their aw_users + aw_profiles + aw_progress + aw_currency rows
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_handle text;
begin
  -- generate a temporary handle from email until they pick a real one
  -- handle uniqueness is enforced; in v1.1 the customization screen forces a real handle
  v_handle := 'player_' || substr(new.id::text, 1, 8);

  insert into public.aw_users (user_id, handle, email)
    values (new.id, v_handle, new.email)
    on conflict (user_id) do nothing;

  insert into public.aw_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  insert into public.aw_progress (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  insert into public.aw_currency (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- row level security (RLS)
-- enables, then locks each table to user-scoped access only
-- ============================================================

-- enable RLS on every table
alter table public.aw_users enable row level security;
alter table public.aw_profiles enable row level security;
alter table public.aw_runs enable row level security;
alter table public.aw_progress enable row level security;
alter table public.aw_currency enable row level security;
alter table public.aw_transactions enable row level security;
alter table public.aw_events enable row level security;
alter table public.aw_email_log enable row level security;
alter table public.aw_v2_inventory_unlocks enable row level security;
alter table public.aw_v2_skills enable row level security;
alter table public.aw_v2_locations enable row level security;

-- aw_users: users can read their own row + read other handles publicly
drop policy if exists "users can read own row" on public.aw_users;
create policy "users can read own row" on public.aw_users
  for select using (auth.uid() = user_id);

drop policy if exists "users can read public handles" on public.aw_users;
create policy "users can read public handles" on public.aw_users
  for select using (true);  -- handles are public; refined later if needed

drop policy if exists "users can update own row" on public.aw_users;
create policy "users can update own row" on public.aw_users
  for update using (auth.uid() = user_id);

-- aw_profiles: profiles are public-readable (the vault concept), self-writable
drop policy if exists "profiles are public" on public.aw_profiles;
create policy "profiles are public" on public.aw_profiles
  for select using (true);

drop policy if exists "users can update own profile" on public.aw_profiles;
create policy "users can update own profile" on public.aw_profiles
  for update using (auth.uid() = user_id);

-- aw_runs: only the player can see their own runs
drop policy if exists "runs are private to owner" on public.aw_runs;
create policy "runs are private to owner" on public.aw_runs
  for all using (auth.uid() = user_id);

-- aw_progress: read public, write self (so others can see stats on profile)
drop policy if exists "progress is public read" on public.aw_progress;
create policy "progress is public read" on public.aw_progress
  for select using (true);

drop policy if exists "progress is self write" on public.aw_progress;
create policy "progress is self write" on public.aw_progress
  for update using (auth.uid() = user_id);

-- aw_currency + aw_transactions: private to owner
drop policy if exists "currency private to owner" on public.aw_currency;
create policy "currency private to owner" on public.aw_currency
  for all using (auth.uid() = user_id);

drop policy if exists "transactions private to owner" on public.aw_transactions;
create policy "transactions private to owner" on public.aw_transactions
  for select using (auth.uid() = user_id);

-- aw_events: writeable by self (via app), readable only by admin (no select policy for users)
-- the app inserts events as the authenticated user
drop policy if exists "users can insert own events" on public.aw_events;
create policy "users can insert own events" on public.aw_events
  for insert with check (auth.uid() = user_id or user_id is null);

-- aw_email_log: private to owner read
drop policy if exists "email log private to owner" on public.aw_email_log;
create policy "email log private to owner" on public.aw_email_log
  for select using (auth.uid() = user_id);

-- v2 hook tables: private to owner
drop policy if exists "v2 inventory private to owner" on public.aw_v2_inventory_unlocks;
create policy "v2 inventory private to owner" on public.aw_v2_inventory_unlocks
  for all using (auth.uid() = user_id);

drop policy if exists "v2 skills private to owner" on public.aw_v2_skills;
create policy "v2 skills private to owner" on public.aw_v2_skills
  for all using (auth.uid() = user_id);

drop policy if exists "v2 locations private to owner" on public.aw_v2_locations;
create policy "v2 locations private to owner" on public.aw_v2_locations
  for all using (auth.uid() = user_id);

-- ============================================================
-- done.
-- ============================================================
