-- Mothership v2: first-to-milestone records + admin aggregate RPCs.
-- Run in Supabase SQL Editor after 001–005.

-- Write-once first player per milestone (level / episode), from ship date forward.
create table if not exists public.aw_milestone_firsts (
  milestone_key text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  achieved_at timestamptz not null default now()
);

create index if not exists aw_milestone_firsts_user_idx on public.aw_milestone_firsts (user_id);

alter table public.aw_milestone_firsts enable row level security;

-- No client access, service role / edge function only.

create or replace function public.claim_milestone_first_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_since timestamptz := '2026-06-16T00:00:00+00'::timestamptz;
begin
  if new.user_id is null or new.created_at < v_since then
    return new;
  end if;

  if new.event_type = 'episode_complete' then
    v_key := 'episode:' || coalesce(new.metadata->>'episode', 'unknown');
  elsif new.event_type = 'player_level_milestone' then
    v_key := 'level:' || coalesce(new.metadata->>'level', '0');
  else
    return new;
  end if;

  insert into public.aw_milestone_firsts (milestone_key, user_id, achieved_at)
  values (v_key, new.user_id, new.created_at)
  on conflict (milestone_key) do nothing;

  return new;
end;
$$;

drop trigger if exists aw_events_claim_milestone_first on public.aw_events;
create trigger aw_events_claim_milestone_first
  after insert on public.aw_events
  for each row
  execute function public.claim_milestone_first_from_event();

-- Per-user heartbeat totals (hours = count * 1 min / 60).
create or replace function public.admin_user_playtime_heartbeats(p_since timestamptz)
returns table(user_id uuid, heartbeats bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.user_id, count(*)::bigint as heartbeats
  from public.aw_events e
  where e.event_type = 'session_heartbeat'
    and e.user_id is not null
    and e.created_at >= p_since
  group by e.user_id;
$$;

-- Per-user gym head win counts from battle_end.
create or replace function public.admin_user_gym_wins(p_since timestamptz)
returns table(user_id uuid, enemy_id text, wins bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.user_id,
    e.metadata->>'enemyId' as enemy_id,
    count(*)::bigint as wins
  from public.aw_events e
  where e.event_type = 'battle_end'
    and e.metadata->>'result' = 'win'
    and e.metadata->>'enemyId' in ('5ive-gym1')
    and e.user_id is not null
    and e.created_at >= p_since
  group by e.user_id, e.metadata->>'enemyId';
$$;
