-- =============================================================================
-- ALIWORLD analytics aggregate views (optional — run after 001 migration)
-- =============================================================================
-- These views expose ONLY aggregated counts — no raw user rows.
-- Player app (anon/authenticated) cannot read aw_events (no SELECT policy),
-- so invoker-rights views return empty for players. Service role / SQL editor
-- bypass RLS and see full aggregates.
--
-- After running: chart these views in Supabase Dashboard → Reports, or query
-- from the local admin viewer (npm run admin:dev).
-- =============================================================================

-- Daily rollups per event type
create or replace view public.aw_analytics_events_daily as
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  event_type,
  count(*)::bigint as event_count,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_users,
  count(distinct metadata->>'session_id') filter (
    where metadata->>'session_id' is not null
  )::bigint as unique_sessions
from public.aw_events
group by 1, 2;

-- Daily active users + session counts
create or replace view public.aw_analytics_dau_daily as
select
  date_trunc('day', created_at at time zone 'utc')::date as day,
  count(distinct user_id) filter (where user_id is not null)::bigint as logged_in_users,
  count(distinct metadata->>'session_id') filter (
    where metadata->>'session_id' is not null
  )::bigint as unique_sessions,
  count(*) filter (where event_type = 'app_open')::bigint as app_opens,
  count(*) filter (where event_type = 'signup_success')::bigint as signups,
  count(*) filter (where event_type = 'login_success')::bigint as logins
from public.aw_events
group by 1;

-- Battle summary by enemy
create or replace view public.aw_analytics_battles as
select
  metadata->>'enemyId' as enemy_id,
  count(*) filter (where event_type = 'battle_start')::bigint as starts,
  count(*) filter (
    where event_type = 'battle_end' and metadata->>'result' = 'win'
  )::bigint as wins,
  count(*) filter (
    where event_type = 'battle_end' and metadata->>'result' = 'lose'
  )::bigint as losses,
  round(
    100.0 * count(*) filter (
      where event_type = 'battle_end' and metadata->>'result' = 'win'
    ) / nullif(count(*) filter (where event_type = 'battle_end'), 0),
    1
  ) as win_rate_pct,
  round(avg((metadata->>'turns')::numeric) filter (
    where event_type = 'battle_end' and metadata->>'turns' ~ '^\d+(\.\d+)?$'
  ), 1) as avg_turns
from public.aw_events
where event_type in ('battle_start', 'battle_end')
  and metadata->>'enemyId' is not null
group by 1;

-- NPC conversion counts
create or replace view public.aw_analytics_npc_conversions as
select
  metadata->>'npcId' as npc_id,
  count(*)::bigint as conversions,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_players
from public.aw_events
where event_type = 'npc_converted'
  and metadata->>'npcId' is not null
group by 1;

-- Episode completions
create or replace view public.aw_analytics_episodes as
select
  metadata->>'episode' as episode,
  count(*)::bigint as completions,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_players
from public.aw_events
where event_type = 'episode_complete'
group by 1;

-- City enter counts
create or replace view public.aw_analytics_cities as
select
  metadata->>'city' as city,
  count(*)::bigint as enters,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_players
from public.aw_events
where event_type = 'city_enter'
  and metadata->>'city' is not null
group by 1;

-- Quest step funnel
create or replace view public.aw_analytics_quest_steps as
select
  metadata->>'questId' as quest_id,
  metadata->>'stepId' as step_id,
  count(*)::bigint as advances,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_players
from public.aw_events
where event_type = 'quest_step_advance'
group by 1, 2;

-- External link clicks
create or replace view public.aw_analytics_external_links as
select
  metadata->>'destination' as destination,
  count(*)::bigint as clicks,
  count(distinct user_id) filter (where user_id is not null)::bigint as unique_users
from public.aw_events
where event_type = 'external_link_click'
group by 1;

-- Restrict direct API access — service role + postgres only
revoke all on public.aw_analytics_events_daily from public, anon, authenticated;
revoke all on public.aw_analytics_dau_daily from public, anon, authenticated;
revoke all on public.aw_analytics_battles from public, anon, authenticated;
revoke all on public.aw_analytics_npc_conversions from public, anon, authenticated;
revoke all on public.aw_analytics_episodes from public, anon, authenticated;
revoke all on public.aw_analytics_cities from public, anon, authenticated;
revoke all on public.aw_analytics_quest_steps from public, anon, authenticated;
revoke all on public.aw_analytics_external_links from public, anon, authenticated;

grant select on public.aw_analytics_events_daily to service_role;
grant select on public.aw_analytics_dau_daily to service_role;
grant select on public.aw_analytics_battles to service_role;
grant select on public.aw_analytics_npc_conversions to service_role;
grant select on public.aw_analytics_episodes to service_role;
grant select on public.aw_analytics_cities to service_role;
grant select on public.aw_analytics_quest_steps to service_role;
grant select on public.aw_analytics_external_links to service_role;
