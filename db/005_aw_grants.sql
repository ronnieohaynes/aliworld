-- Prize grants (badges, skins, prints) — admin-created via edge function only.
-- Run in Supabase SQL Editor.

create table if not exists public.aw_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('badge', 'skin', 'prints')),
  value text not null,
  label text,
  note text,
  created_at timestamptz default now()
);

create index if not exists aw_grants_user_id_idx on public.aw_grants (user_id);

alter table public.aw_grants enable row level security;

drop policy if exists "own grants readable" on public.aw_grants;
create policy "own grants readable" on public.aw_grants
  for select
  using (auth.uid() = user_id);

-- No client inserts/updates/deletes — grants via service role in analytics-summary edge function.
