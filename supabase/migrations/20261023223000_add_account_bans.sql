-- Admin account blocking (fitur blokir akun).
--
-- Run in Supabase → SQL Editor. The enforcement code tolerates these columns
-- being absent (falls back to role-only), but ban/unban needs them.
--
-- Semantics:
--   is_banned = true, banned_until = null        -> permanent
--   is_banned = true, banned_until = timestamptz -> temporary (auto-expires)
--   is_banned = false                            -> not banned
--
-- Writes come only from the service role (`PATCH /api/admin/users`
-- action=ban|unban); after the profiles hardening migration, clients have no
-- UPDATE grant on these columns at all.

begin;

alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists banned_by uuid;

-- Fast lookup for the "Diblokir" filter and the ban check.
create index if not exists profiles_is_banned_idx
  on public.profiles (is_banned) where is_banned;

commit;

-- Verify:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='profiles'
--      and column_name like 'ban%';
-- expect: is_banned, banned_until, ban_reason, banned_at, banned_by
