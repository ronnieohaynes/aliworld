-- Layer 0 integrity stopgaps: practice XP counters, profile validation, reject logging.
-- Run once in Supabase SQL editor before deploying practice-xp edge fn.

-- ── practice XP daily counter (server-owned, not client-writable) ─────────────

alter table public.aw_progress
  add column if not exists practice_combat_xp_today integer not null default 0,
  add column if not exists practice_combat_xp_day_key text,
  add column if not exists last_skills_level_sum integer,
  add column if not exists last_validated_save_at timestamptz;

-- ── integrity reject log (layer 3 detection feed) ───────────────────────────

create table if not exists public.aw_integrity_rejects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  reason text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists aw_integrity_rejects_user_idx
  on public.aw_integrity_rejects(user_id, created_at desc);

alter table public.aw_integrity_rejects enable row level security;

-- No client access — service role / admin only.

-- ── protect server-owned aw_progress fields from client writes ────────────────

create or replace function public.protect_aw_progress_integrity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('aw.internal_progress_write', true), '') = '1' then
    return new;
  end if;
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  new.practice_combat_xp_today := old.practice_combat_xp_today;
  new.practice_combat_xp_day_key := old.practice_combat_xp_day_key;
  new.last_skills_level_sum := old.last_skills_level_sum;
  new.last_validated_save_at := old.last_validated_save_at;
  return new;
end;
$$;

drop trigger if exists protect_aw_progress_integrity_fields on public.aw_progress;
create trigger protect_aw_progress_integrity_fields
  before update on public.aw_progress
  for each row
  execute function public.protect_aw_progress_integrity_fields();

-- ── skill snapshot helpers ──────────────────────────────────────────────────

create or replace function public.skill_level_sum(skills jsonb)
returns integer
language sql
immutable
as $$
  select coalesce(
    greatest(1, least(65, (skills->'attack'->>'level')::int)), 1
  )
  + coalesce(greatest(1, least(65, (skills->'speed'->>'level')::int)), 1)
  + coalesce(greatest(1, least(65, (skills->'defense'->>'level')::int)), 1)
  + coalesce(greatest(1, least(65, (skills->'luck'->>'level')::int)), 1)
  + coalesce(greatest(1, least(65, (skills->'hp'->>'level')::int)), 1);
$$;

create or replace function public.skill_xp_proxy_sum(skills jsonb)
returns bigint
language sql
immutable
as $$
  select coalesce(
    greatest(0, (skills->'attack'->>'xp')::bigint), 0
  )
  + coalesce(greatest(0, (skills->'speed'->>'xp')::bigint), 0)
  + coalesce(greatest(0, (skills->'defense'->>'xp')::bigint), 0)
  + coalesce(greatest(0, (skills->'luck'->>'xp')::bigint), 0)
  + coalesce(greatest(0, (skills->'hp'->>'xp')::bigint), 0);
$$;

-- ── reject impossible aw_profiles skill writes ────────────────────────────────

create or replace function public.validate_aw_profiles_skills()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_skills jsonb;
  new_skills jsonb;
  old_sum integer;
  new_sum integer;
  old_xp bigint;
  new_xp bigint;
  skill_id text;
  old_lvl integer;
  new_lvl integer;
  sum_delta integer;
  xp_delta bigint;
  max_sum_delta integer := 8;
  max_xp_delta_per_save bigint := 600;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  old_skills := coalesce(old.avatar_config->'skills', '{}'::jsonb);
  new_skills := coalesce(new.avatar_config->'skills', '{}'::jsonb);

  if old_skills = new_skills then
    return new;
  end if;

  foreach skill_id in array array['attack', 'speed', 'defense', 'luck', 'hp'] loop
    old_lvl := coalesce((old_skills->skill_id->>'level')::int, 1);
    new_lvl := coalesce((new_skills->skill_id->>'level')::int, 1);

    if new_lvl < 1 or new_lvl > 65 then
      insert into public.aw_integrity_rejects (user_id, reason, detail)
      values (new.user_id, 'skill_level_out_of_bounds', jsonb_build_object('skill', skill_id, 'level', new_lvl));
      raise exception 'integrity_reject: skill level out of bounds (%)', skill_id;
    end if;

    if new_lvl - old_lvl > 1 then
      insert into public.aw_integrity_rejects (user_id, reason, detail)
      values (new.user_id, 'skill_level_jump', jsonb_build_object('skill', skill_id, 'from', old_lvl, 'to', new_lvl));
      raise exception 'integrity_reject: impossible skill level jump on %', skill_id;
    end if;

    if (new_skills->skill_id->>'xp')::bigint < 0 then
      insert into public.aw_integrity_rejects (user_id, reason, detail)
      values (new.user_id, 'negative_skill_xp', jsonb_build_object('skill', skill_id));
      raise exception 'integrity_reject: negative skill xp on %', skill_id;
    end if;
  end loop;

  old_sum := public.skill_level_sum(old_skills);
  new_sum := public.skill_level_sum(new_skills);
  sum_delta := new_sum - old_sum;

  if sum_delta > max_sum_delta then
    insert into public.aw_integrity_rejects (user_id, reason, detail)
    values (new.user_id, 'skill_level_sum_jump', jsonb_build_object('from', old_sum, 'to', new_sum, 'delta', sum_delta));
    raise exception 'integrity_reject: too many skill levels gained at once';
  end if;

  old_xp := public.skill_xp_proxy_sum(old_skills);
  new_xp := public.skill_xp_proxy_sum(new_skills);
  xp_delta := new_xp - old_xp;

  if xp_delta > max_xp_delta_per_save then
    insert into public.aw_integrity_rejects (user_id, reason, detail)
    values (new.user_id, 'skill_xp_per_save', jsonb_build_object('delta', xp_delta, 'max', max_xp_delta_per_save));
    raise exception 'integrity_reject: skill xp gain exceeds per-save limit';
  end if;

  perform set_config('aw.internal_progress_write', '1', true);
  update public.aw_progress
  set
    last_skills_level_sum = new_sum,
    last_validated_save_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists validate_aw_profiles_skills on public.aw_profiles;
create trigger validate_aw_profiles_skills
  before update on public.aw_profiles
  for each row
  execute function public.validate_aw_profiles_skills();
