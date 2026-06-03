-- Email waitlist for play.dannyali.com coming-soon page.
-- Run in Supabase SQL Editor before enabling public signup.

create table if not exists public.aw_email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.aw_email_signups enable row level security;

-- Anonymous inserts only — no client reads (dashboard / service role only).
drop policy if exists "anon email signup" on public.aw_email_signups;
create policy "anon email signup" on public.aw_email_signups
  for insert
  to anon
  with check (true);

grant insert on table public.aw_email_signups to anon;
