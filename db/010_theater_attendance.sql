-- Theater premiere attendance (once per premiere per player).
-- Run in Supabase SQL Editor before deploying theater-attendance edge function.

create table if not exists public.aw_theater_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  premiere_id text not null,
  slot_started_at timestamptz not null,
  watched_seconds int not null check (watched_seconds >= 0),
  loyalty_seal_hook text,
  created_at timestamptz default now(),
  unique (user_id, premiere_id)
);

create index if not exists aw_theater_attendance_user_id_idx
  on public.aw_theater_attendance (user_id);

alter table public.aw_theater_attendance enable row level security;

drop policy if exists "own theater attendance readable" on public.aw_theater_attendance;
create policy "own theater attendance readable" on public.aw_theater_attendance
  for select
  using (auth.uid() = user_id);

-- Inserts via service role in theater-attendance edge function only.
