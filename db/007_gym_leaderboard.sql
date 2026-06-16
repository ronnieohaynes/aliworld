-- Internal ranked gym wins for public leaderboard edge function (not client-callable).
-- Run in Supabase SQL Editor after 006.

create or replace function public.internal_gym_leaderboard_ranked(p_since timestamptz, p_limit int default 10)
returns table(user_id uuid, win_count bigint, reached_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with wins as (
    select
      e.user_id,
      e.created_at,
      row_number() over (partition by e.user_id order by e.created_at asc) as win_num
    from public.aw_events e
    where e.event_type = 'battle_end'
      and e.metadata->>'result' = 'win'
      and e.metadata->>'enemyId' in ('5ive-gym1')
      and e.user_id is not null
      and e.created_at >= p_since
  ),
  totals as (
    select user_id, max(win_num)::bigint as win_count
    from wins
    group by user_id
    having max(win_num) > 0
  ),
  reached as (
    select w.user_id, t.win_count, w.created_at as reached_at
    from wins w
    inner join totals t on t.user_id = w.user_id and w.win_num = t.win_count
  )
  select user_id, win_count, reached_at
  from reached
  order by win_count desc, reached_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.internal_gym_leaderboard_ranked(timestamptz, int) from public;
revoke all on function public.internal_gym_leaderboard_ranked(timestamptz, int) from anon, authenticated;
grant execute on function public.internal_gym_leaderboard_ranked(timestamptz, int) to service_role;
