-- Durable lifetime progression rollups for retroactive seals/badges.
-- This table is intentionally NOT cleared by analytics event reset tools.

create table if not exists public.aw_lifetime_progress (
  user_id uuid primary key references public.aw_users(user_id) on delete cascade,
  counters jsonb not null default '{}'::jsonb,
  firsts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.aw_lifetime_daily_activity (
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  day_key date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  heartbeats integer not null default 0,
  primary key (user_id, day_key)
);

alter table public.aw_lifetime_progress enable row level security;
alter table public.aw_lifetime_daily_activity enable row level security;

create or replace function public.aw_jsonb_counter_inc(
  source jsonb,
  key text,
  delta integer default 1
)
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    coalesce(source, '{}'::jsonb),
    array[key],
    to_jsonb(greatest(0, coalesce((source ->> key)::integer, 0) + delta)),
    true
  );
$$;

create or replace function public.aw_jsonb_first_seen(
  source jsonb,
  key text,
  ts timestamptz
)
returns jsonb
language sql
immutable
as $$
  select case
    when coalesce(source, '{}'::jsonb) ? key then source
    else jsonb_set(coalesce(source, '{}'::jsonb), array[key], to_jsonb(ts), true)
  end;
$$;

create or replace function public.aw_text_to_int_safe(value text)
returns integer
language sql
immutable
as $$
  select case
    when value ~ '^-?[0-9]+$' then value::integer
    else 0
  end;
$$;

create or replace function public.aw_text_to_bool_safe(value text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(value, '')) in ('1', 'true', 't', 'yes', 'y');
$$;

create or replace function public.aw_apply_lifetime_progress_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb;
  f jsonb;
  event_ts timestamptz := coalesce(new.created_at, now());
  result_text text := lower(coalesce(new.metadata->>'result', ''));
  opponent_type text := lower(coalesce(new.metadata->>'opponentType', ''));
  quest_id text := coalesce(new.metadata->>'questId', '');
  episode_id text := coalesce(new.metadata->>'episode', '');
  week_id text := coalesce(new.metadata->>'weekId', '');
  world_category text := coalesce(new.metadata->>'category', '');
  world_value text := coalesce(new.metadata->>'value', '');
  damage_taken int := greatest(0, public.aw_text_to_int_safe(new.metadata->>'damageTaken'));
  counters_landed int := greatest(0, public.aw_text_to_int_safe(new.metadata->>'countersLanded'));
  turns_count int := greatest(0, public.aw_text_to_int_safe(new.metadata->>'turns'));
  moves_used_count int := case
    when jsonb_typeof(new.metadata->'movesUsed') = 'array' then jsonb_array_length(new.metadata->'movesUsed')
    else 0
  end;
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.aw_lifetime_progress (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  select counters, firsts
  into c, f
  from public.aw_lifetime_progress
  where user_id = new.user_id
  for update;

  c := public.aw_jsonb_counter_inc(c, 'events_total', 1);
  if public.aw_text_to_bool_safe(new.metadata->>'progress_tracking') then
    c := public.aw_jsonb_counter_inc(c, 'progress_events_total', 1);
  end if;

  if new.event_type in ('app_open', 'session_heartbeat', 'login_success') then
    insert into public.aw_lifetime_daily_activity (user_id, day_key, first_seen_at, last_seen_at, heartbeats)
    values (
      new.user_id,
      (event_ts at time zone 'utc')::date,
      event_ts,
      event_ts,
      case when new.event_type = 'session_heartbeat' then 1 else 0 end
    )
    on conflict (user_id, day_key) do update
    set
      last_seen_at = excluded.last_seen_at,
      heartbeats = public.aw_lifetime_daily_activity.heartbeats
        + case when new.event_type = 'session_heartbeat' then 1 else 0 end;
  end if;

  if new.event_type = 'battle_end' then
    c := public.aw_jsonb_counter_inc(c, 'battles_total', 1);
    if result_text = 'win' then
      c := public.aw_jsonb_counter_inc(c, 'battle_wins_total', 1);
    elsif result_text = 'lose' then
      c := public.aw_jsonb_counter_inc(c, 'battle_losses_total', 1);
    elsif result_text = 'draw' then
      c := public.aw_jsonb_counter_inc(c, 'battle_draws_total', 1);
    end if;
    if public.aw_text_to_bool_safe(new.metadata->>'flawless') and result_text = 'win' then
      c := public.aw_jsonb_counter_inc(c, 'flawless_wins_total', 1);
    end if;
    if damage_taken = 0 and result_text = 'win' then
      c := public.aw_jsonb_counter_inc(c, 'no_hit_wins_total', 1);
    end if;
    c := public.aw_jsonb_counter_inc(c, 'damage_taken_total', damage_taken);
    c := public.aw_jsonb_counter_inc(c, 'counters_landed_total', counters_landed);
    c := public.aw_jsonb_counter_inc(c, 'battle_turns_total', turns_count);
    c := public.aw_jsonb_counter_inc(c, 'moves_used_total', moves_used_count);

    if opponent_type <> '' then
      c := public.aw_jsonb_counter_inc(c, 'battles_' || opponent_type || '_total', 1);
      if result_text = 'win' then
        c := public.aw_jsonb_counter_inc(c, 'battle_wins_' || opponent_type || '_total', 1);
      end if;
    end if;
  elsif new.event_type = 'quest_step_advance' then
    c := public.aw_jsonb_counter_inc(c, 'quest_steps_total', 1);
    if quest_id <> '' then
      c := public.aw_jsonb_counter_inc(c, 'quest_steps_' || quest_id, 1);
    end if;
  elsif new.event_type = 'quest_complete' then
    c := public.aw_jsonb_counter_inc(c, 'quests_completed_total', 1);
    if quest_id <> '' then
      c := public.aw_jsonb_counter_inc(c, 'quests_completed_' || quest_id, 1);
      f := public.aw_jsonb_first_seen(f, 'first_quest_complete_' || quest_id, event_ts);
    end if;
  elsif new.event_type = 'episode_complete' then
    c := public.aw_jsonb_counter_inc(c, 'episodes_completed_total', 1);
    if episode_id <> '' then
      c := public.aw_jsonb_counter_inc(c, 'episodes_completed_' || episode_id, 1);
      f := public.aw_jsonb_first_seen(f, 'first_episode_complete_' || episode_id, event_ts);
    end if;
  elsif new.event_type = 'gym_run_start' then
    c := public.aw_jsonb_counter_inc(c, 'gym_runs_started_total', 1);
    if public.aw_text_to_bool_safe(new.metadata->>'practice') then
      c := public.aw_jsonb_counter_inc(c, 'gym_practice_runs_started_total', 1);
    end if;
    if week_id <> '' then
      c := public.aw_jsonb_counter_inc(c, 'gym_runs_started_week_' || week_id, 1);
    end if;
  elsif new.event_type = 'gym_run_end' then
    c := public.aw_jsonb_counter_inc(c, 'gym_runs_ended_total', 1);
    if result_text = '' then
      result_text := lower(coalesce(new.metadata->>'outcome', ''));
    end if;
    if result_text = 'clear' then
      c := public.aw_jsonb_counter_inc(c, 'gym_runs_cleared_total', 1);
    elsif result_text = 'loss' then
      c := public.aw_jsonb_counter_inc(c, 'gym_runs_failed_total', 1);
    end if;
    if public.aw_text_to_bool_safe(new.metadata->>'cleanRun') then
      c := public.aw_jsonb_counter_inc(c, 'gym_clean_runs_total', 1);
    end if;
    if public.aw_text_to_bool_safe(new.metadata->>'noLoss') then
      c := public.aw_jsonb_counter_inc(c, 'gym_no_loss_runs_total', 1);
    end if;
  elsif new.event_type = 'gym_week_clear' then
    c := public.aw_jsonb_counter_inc(c, 'gym_weeks_cleared_total', 1);
    if week_id <> '' then
      c := public.aw_jsonb_counter_inc(c, 'gym_week_clear_' || week_id, 1);
      f := public.aw_jsonb_first_seen(f, 'first_gym_week_clear_' || week_id, event_ts);
    end if;
  elsif new.event_type in ('ghost_match', 'ghost_champion_attempt', 'ghost_champion_win', 'ghost_daily_set_complete') then
    c := public.aw_jsonb_counter_inc(c, 'ghost_events_total', 1);
    if new.event_type = 'ghost_match' then
      if result_text = 'win' or public.aw_text_to_bool_safe(new.metadata->>'won') then
        c := public.aw_jsonb_counter_inc(c, 'ghost_wins_total', 1);
      else
        c := public.aw_jsonb_counter_inc(c, 'ghost_losses_total', 1);
      end if;
      if public.aw_text_to_bool_safe(new.metadata->>'flawless') then
        c := public.aw_jsonb_counter_inc(c, 'ghost_flawless_wins_total', 1);
      end if;
    elsif new.event_type = 'ghost_champion_attempt' then
      c := public.aw_jsonb_counter_inc(c, 'ghost_champion_attempts_total', 1);
    elsif new.event_type = 'ghost_champion_win' then
      c := public.aw_jsonb_counter_inc(c, 'ghost_champion_wins_total', 1);
      f := public.aw_jsonb_first_seen(f, 'first_ghost_champion_win', event_ts);
    elsif new.event_type = 'ghost_daily_set_complete' then
      c := public.aw_jsonb_counter_inc(c, 'ghost_daily_sets_completed_total', 1);
    end if;
  elsif new.event_type = 'skill_levelup' then
    c := public.aw_jsonb_counter_inc(c, 'skill_levelups_total', 1);
  elsif new.event_type = 'player_level_milestone' then
    c := public.aw_jsonb_counter_inc(c, 'player_level_milestones_total', 1);
    if coalesce(new.metadata->>'level', '') <> '' then
      f := public.aw_jsonb_first_seen(f, 'first_player_level_' || (new.metadata->>'level'), event_ts);
    end if;
  elsif new.event_type = 'world_memory_flag' then
    c := public.aw_jsonb_counter_inc(c, 'world_memory_flags_total', 1);
    if world_category <> '' and world_value <> '' then
      c := public.aw_jsonb_counter_inc(c, 'world_memory_' || world_category, 1);
      f := public.aw_jsonb_first_seen(
        f,
        'first_world_memory_' || world_category || '_' || world_value,
        event_ts
      );
    end if;
  end if;

  update public.aw_lifetime_progress
  set counters = c, firsts = f, updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists aw_apply_lifetime_progress_from_event on public.aw_events;
create trigger aw_apply_lifetime_progress_from_event
after insert on public.aw_events
for each row execute function public.aw_apply_lifetime_progress_from_event();
