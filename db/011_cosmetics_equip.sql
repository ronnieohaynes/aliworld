-- Cosmetics equip persistence (server sync when prints economy ships).
-- Ownership stays on aw_grants (shop-skin:/shop-accessory:/shop-emblem: values).
-- Run in Supabase SQL Editor before shop-purchase edge deploy.

create table if not exists public.aw_cosmetics_equip (
  user_id uuid primary key references auth.users (id) on delete cascade,
  emblem_id text,
  accessory_catalog_id text,
  updated_at timestamptz not null default now()
);

alter table public.aw_cosmetics_equip enable row level security;

drop policy if exists "own cosmetics equip readable" on public.aw_cosmetics_equip;
create policy "own cosmetics equip readable" on public.aw_cosmetics_equip
  for select
  using (auth.uid() = user_id);

-- Writes via service role in future shop-purchase / equip-sync edge functions only.

comment on table public.aw_cosmetics_equip is
  'Equipped shop emblem + base-specific accessory. Catalog ids match src/data/cosmeticsCatalog.ts.';
