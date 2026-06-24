-- Stage 3: server-issued fight sessions + replay validation audit trail.
-- Run once in Supabase SQL editor before deploying combat-session edge fn.

create table if not exists public.aw_combat_fights (
  fight_id uuid primary key,
  user_id uuid not null references public.aw_users(user_id) on delete cascade,
  npc_id text not null,
  seed bigint not null,
  skills_snapshot jsonb not null,
  equipped_moves jsonb not null,
  archetype text not null default 'atk',
  isolate_npc_memory boolean not null default false,
  run_it_back boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'validated', 'rejected')),
  claimed_result jsonb,
  replay_result jsonb,
  reject_reason text,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists aw_combat_fights_user_created_idx
  on public.aw_combat_fights(user_id, created_at desc);

create index if not exists aw_combat_fights_status_idx
  on public.aw_combat_fights(status, created_at desc);

alter table public.aw_combat_fights enable row level security;

-- No client policies — service role only.
