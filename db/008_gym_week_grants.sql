-- Unique gym week badges per user (idempotent reward claims).
-- Run in Supabase SQL Editor.

create unique index if not exists aw_grants_user_kind_value_uidx
  on public.aw_grants (user_id, kind, value);
