-- Per-ghost daily rebattle cap tracking for ghost training.
alter table public.aw_ghost_training_state
  add column if not exists daily_ghost_attempts jsonb not null default '{}'::jsonb;
