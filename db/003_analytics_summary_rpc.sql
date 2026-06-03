-- Analytics summary RPC — service_role / edge function only (never grant to anon/auth)
-- Deploy: run in Supabase SQL Editor, then call via analytics-summary edge function.

create or replace function public.analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_since timestamptz := now() - make_interval(days => p_days);
begin
  select jsonb_build_object(
    'dau', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day)
      from (
        select
          date_trunc('day', created_at at time zone 'utc')::date as day,
          count(distinct coalesce(user_id::text, metadata->>'session_id'))::bigint as cnt
        from public.aw_events
        where event_type = 'app_open'
          and created_at >= v_since
        group by 1
      ) t
    ), '[]'::jsonb),
    'signups', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day)
      from (
        select
          date_trunc('day', created_at at time zone 'utc')::date as day,
          count(*)::bigint as cnt
        from public.aw_events
        where event_type = 'signup_success'
          and created_at >= v_since
        group by 1
      ) t
    ), '[]'::jsonb),
    'avgSessionMinutes', coalesce((
      select round(avg(heartbeats)::numeric, 1)
      from (
        select count(*)::numeric as heartbeats
        from public.aw_events
        where event_type = 'session_heartbeat'
          and metadata->>'session_id' is not null
          and created_at >= v_since
        group by metadata->>'session_id'
      ) s
    ), 0),
    'questDropoff', coalesce((
      select jsonb_agg(jsonb_build_object('step', step, 'players', players) order by players desc)
      from (
        select
          coalesce(metadata->>'questId', '?') || ' · ' || coalesce(metadata->>'stepId', '?') as step,
          count(distinct coalesce(user_id::text, metadata->>'session_id'))::bigint as players
        from public.aw_events
        where event_type = 'quest_step_advance'
        group by 1
      ) t
    ), '[]'::jsonb),
    'episodeCompletion', coalesce((
      select jsonb_agg(jsonb_build_object('episode', episode, 'players', players) order by episode)
      from (
        select
          metadata->>'episode' as episode,
          count(distinct coalesce(user_id::text, metadata->>'session_id'))::bigint as players
        from public.aw_events
        where event_type = 'episode_complete'
          and metadata->>'episode' is not null
        group by 1
      ) t
    ), '[]'::jsonb),
    'buildPopularity', coalesce((
      select jsonb_agg(jsonb_build_object('build', build, 'players', players) order by players desc)
      from (
        select
          metadata->>'buildName' as build,
          count(distinct coalesce(user_id::text, metadata->>'session_id'))::bigint as players
        from public.aw_events
        where event_type = 'build_name_changed'
          and metadata->>'buildName' is not null
          and metadata->>'buildName' <> ''
        group by 1
      ) t
    ), '[]'::jsonb),
    'battleStats', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enemy', enemy_id,
          'wins', wins,
          'losses', losses,
          'avgTurns', avg_turns
        )
        order by starts desc
      )
      from (
        select
          metadata->>'enemyId' as enemy_id,
          count(*) filter (where event_type = 'battle_start')::bigint as starts,
          count(*) filter (
            where event_type = 'battle_end' and metadata->>'result' = 'win'
          )::bigint as wins,
          count(*) filter (
            where event_type = 'battle_end' and metadata->>'result' = 'lose'
          )::bigint as losses,
          round(avg((metadata->>'turns')::numeric) filter (
            where event_type = 'battle_end' and metadata->>'turns' ~ '^\d+(\.\d+)?$'
          ), 1) as avg_turns
        from public.aw_events
        where event_type in ('battle_start', 'battle_end')
          and metadata->>'enemyId' is not null
        group by 1
      ) t
    ), '[]'::jsonb),
    'funnelClicks', coalesce((
      select jsonb_agg(jsonb_build_object('destination', destination, 'clicks', clicks) order by clicks desc)
      from (
        select
          metadata->>'destination' as destination,
          count(*)::bigint as clicks
        from public.aw_events
        where event_type = 'external_link_click'
          and metadata->>'destination' is not null
        group by 1
      ) t
    ), '[]'::jsonb),
    'theaterOpens', (
      select count(*)::bigint
      from public.aw_events
      where event_type = 'theater_open'
        and created_at >= v_since
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.analytics_summary(integer) from public;
revoke all on function public.analytics_summary(integer) from anon, authenticated;
grant execute on function public.analytics_summary(integer) to service_role;
