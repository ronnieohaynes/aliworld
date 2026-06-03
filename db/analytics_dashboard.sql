-- =============================================================================
-- ALIWORLD analytics — aggregate queries for Supabase SQL Editor
-- =============================================================================
-- Run these in: Supabase Dashboard → SQL Editor → New query → Save
-- Access: SQL Editor runs as postgres (bypasses RLS). Safe — outputs counts only.
--
-- aw_events columns:
--   event_id, user_id, event_type, metadata (jsonb), created_at
-- Common metadata keys: session_id, city, enemyId, result, turns, npcId,
--   episode, questId, stepId, destination, buildName, skill, moveId, slot
--
-- Instrumented event_type values (player app):
--   app_open, session_heartbeat, city_enter, battle_start, battle_end,
--   npc_converted, episode_complete, quest_step_advance, build_name_changed,
--   skill_levelup, move_equipped, login_success, signup_success, logout,
--   external_link_click, theater_open
-- =============================================================================


-- ── 1. OVERVIEW — last 7 days ───────────────────────────────────────────────

-- Daily active users (logged-in) + anonymous sessions
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(distinct user_id) filter (where user_id is not null) as logged_in_users,
  count(distinct metadata->>'session_id') filter (where metadata->>'session_id' is not null) as unique_sessions,
  count(*) filter (where event_type = 'app_open') as app_opens,
  count(*) filter (where event_type = 'signup_success') as signups,
  count(*) filter (where event_type = 'login_success') as logins
from public.aw_events
where created_at >= now() - interval '7 days'
group by 1
order by 1 desc;


-- ── 2. EVENT VOLUME — by type, last 14 days ─────────────────────────────────

select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  event_type,
  count(*) as events,
  count(distinct user_id) filter (where user_id is not null) as unique_users,
  count(distinct metadata->>'session_id') as unique_sessions
from public.aw_events
where created_at >= now() - interval '14 days'
group by 1, 2
order by 1 desc, events desc;


-- Top event types (all time, excluding noisy heartbeats)
select
  event_type,
  count(*) as total,
  count(distinct user_id) filter (where user_id is not null) as unique_users,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from public.aw_events
where event_type <> 'session_heartbeat'
group by 1
order by total desc;


-- ── 3. SESSIONS & RETENTION ─────────────────────────────────────────────────

-- Sessions per day (session_id in metadata)
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(distinct metadata->>'session_id') as sessions,
  round(count(*)::numeric / nullif(count(distinct metadata->>'session_id'), 0), 1) as events_per_session
from public.aw_events
where metadata->>'session_id' is not null
  and created_at >= now() - interval '30 days'
group by 1
order by 1 desc;


-- Returning users (logged-in users active on 2+ distinct days, last 30 days)
with daily_users as (
  select
    date_trunc('day', created_at at time zone 'utc')::date as day,
    user_id
  from public.aw_events
  where user_id is not null
    and created_at >= now() - interval '30 days'
  group by 1, 2
)
select
  count(*) filter (where active_days = 1) as one_day_only,
  count(*) filter (where active_days between 2 and 3) as two_to_three_days,
  count(*) filter (where active_days >= 4) as four_plus_days
from (
  select user_id, count(distinct day) as active_days
  from daily_users
  group by user_id
) t;


-- ── 4. AUTH FUNNEL ──────────────────────────────────────────────────────────

select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(*) filter (where event_type = 'app_open') as app_opens,
  count(*) filter (where event_type = 'signup_success') as signups,
  count(*) filter (where event_type = 'login_success') as logins,
  count(*) filter (where event_type = 'logout') as logouts,
  round(
    100.0 * count(*) filter (where event_type = 'signup_success')
    / nullif(count(*) filter (where event_type = 'app_open'), 0),
    2
  ) as signup_rate_pct
from public.aw_events
where event_type in ('app_open', 'signup_success', 'login_success', 'logout')
  and created_at >= now() - interval '30 days'
group by 1
order by 1 desc;


-- ── 5. WORLD — city enters ──────────────────────────────────────────────────

select
  metadata->>'city' as city,
  count(*) as enters,
  count(distinct user_id) filter (where user_id is not null) as unique_players,
  count(distinct metadata->>'session_id') as unique_sessions
from public.aw_events
where event_type = 'city_enter'
  and metadata->>'city' is not null
group by 1
order by enters desc;


-- City enters over time (last 14 days)
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  metadata->>'city' as city,
  count(*) as enters
from public.aw_events
where event_type = 'city_enter'
  and created_at >= now() - interval '14 days'
group by 1, 2
order by 1 desc, enters desc;


-- ── 6. COMBAT — battles ─────────────────────────────────────────────────────

-- Win rate + avg turns by enemy
select
  metadata->>'enemyId' as enemy_id,
  count(*) filter (where event_type = 'battle_start') as starts,
  count(*) filter (where event_type = 'battle_end' and metadata->>'result' = 'win') as wins,
  count(*) filter (where event_type = 'battle_end' and metadata->>'result' = 'lose') as losses,
  round(
    100.0 * count(*) filter (where event_type = 'battle_end' and metadata->>'result' = 'win')
    / nullif(count(*) filter (where event_type = 'battle_end'), 0),
    1
  ) as win_rate_pct,
  round(avg((metadata->>'turns')::numeric) filter (
    where event_type = 'battle_end' and metadata->>'turns' ~ '^\d+(\.\d+)?$'
  ), 1) as avg_turns
from public.aw_events
where event_type in ('battle_start', 'battle_end')
  and metadata->>'enemyId' is not null
group by 1
order by starts desc;


-- Daily battle volume
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(*) filter (where event_type = 'battle_start') as battle_starts,
  count(*) filter (where event_type = 'battle_end' and metadata->>'result' = 'win') as wins,
  count(*) filter (where event_type = 'battle_end' and metadata->>'result' = 'lose') as losses
from public.aw_events
where event_type in ('battle_start', 'battle_end')
  and created_at >= now() - interval '14 days'
group by 1
order by 1 desc;


-- ── 7. PROGRESSION — NPCs, episodes, quests ───────────────────────────────────

-- NPC conversions
select
  metadata->>'npcId' as npc_id,
  count(*) as conversions,
  count(distinct user_id) filter (where user_id is not null) as unique_players
from public.aw_events
where event_type = 'npc_converted'
  and metadata->>'npcId' is not null
group by 1
order by conversions desc;


-- Episode completions
select
  metadata->>'episode' as episode,
  count(*) as completions,
  count(distinct user_id) filter (where user_id is not null) as unique_players
from public.aw_events
where event_type = 'episode_complete'
group by 1
order by episode;


-- Quest step advances (where players get stuck / drop off)
select
  metadata->>'questId' as quest_id,
  metadata->>'stepId' as step_id,
  count(*) as advances,
  count(distinct user_id) filter (where user_id is not null) as unique_players
from public.aw_events
where event_type = 'quest_step_advance'
group by 1, 2
order by quest_id, advances desc;


-- ── 8. BUILD / SKILLS / LOADOUT ─────────────────────────────────────────────

select
  event_type,
  coalesce(metadata->>'skill', metadata->>'moveId', metadata->>'slot', '—') as detail,
  count(*) as events
from public.aw_events
where event_type in ('skill_levelup', 'move_equipped', 'build_name_changed')
group by 1, 2
order by event_type, events desc;


-- Skill level-ups by skill
select
  metadata->>'skill' as skill,
  count(*) as levelups,
  max((metadata->>'level')::int) filter (where metadata->>'level' ~ '^\d+$') as max_level_seen
from public.aw_events
where event_type = 'skill_levelup'
  and metadata->>'skill' is not null
group by 1
order by levelups desc;


-- ── 9. MONETIZATION / EXTERNAL ──────────────────────────────────────────────

select
  metadata->>'destination' as destination,
  count(*) as clicks,
  count(distinct user_id) filter (where user_id is not null) as unique_users
from public.aw_events
where event_type = 'external_link_click'
group by 1
order by clicks desc;


-- Theater opens
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(*) as theater_opens
from public.aw_events
where event_type = 'theater_open'
  and created_at >= now() - interval '30 days'
group by 1
order by 1 desc;


-- ── 10. HEALTH CHECK — events in last hour ───────────────────────────────────

select
  event_type,
  count(*) as events,
  max(created_at) as last_event_at
from public.aw_events
where created_at >= now() - interval '1 hour'
group by 1
order by events desc;
