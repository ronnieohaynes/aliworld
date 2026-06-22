-- Durable player notifications (mothership compose → surfaces on next login).
-- Run in Supabase SQL Editor after 005_aw_grants.sql.

create table if not exists public.aw_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  handle text not null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  grant_id uuid references public.aw_grants (id) on delete set null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  /** Future email/push layer — do not use until SMTP infra exists. */
  notified_email_at timestamptz,
  created_by text not null default 'mothership'
);

create index if not exists aw_messages_user_id_idx on public.aw_messages (user_id);
create index if not exists aw_messages_user_unseen_idx
  on public.aw_messages (user_id, created_at)
  where seen_at is null;

alter table public.aw_messages enable row level security;

-- No client writes; player reads via player-messages edge function (service role).
drop policy if exists "own messages readable" on public.aw_messages;
create policy "own messages readable" on public.aw_messages
  for select
  using (auth.uid() = user_id);
