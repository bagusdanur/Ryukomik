-- Security incident 2026-10-23
--
-- A newly registered account with a disposable email (nwtake3789@tohkayatogami.com)
-- ended up with profiles.role = 'admin' WITHOUT any call to PATCH /api/admin/users.
-- Reproduced: an anonymous client (public anon key only) could UPDATE public.profiles,
-- so anyone could self-promote to admin. Separately, public.premium_codes was
-- readable by anon, exposing unused premium codes.
--
-- Run this in Supabase → SQL Editor (DDL cannot be applied through PostgREST).
-- The app no longer needs client-side writes to these tables: premium grants,
-- code generation/deletion and code redemption were moved to server routes that
-- use the service role (which bypasses RLS).

begin;

-- ── public.profiles ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Drop every existing policy (the permissive one is what allowed the takeover).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;

-- Read is public (usernames/avatars are shown in comments).
grant select on public.profiles to anon, authenticated;

-- A user may edit ONLY cosmetic columns. role / is_premium / premium_until /
-- xp / level / totals are written exclusively by the service role.
grant update (
  username,
  avatar_url,
  bio,
  banner_url,
  show_public_reads,
  show_public_comments,
  show_public_join_date
) on public.profiles to authenticated;

create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (true);

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── public.premium_codes ────────────────────────────────────────────────
alter table public.premium_codes enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'premium_codes'
  loop
    execute format('drop policy if exists %I on public.premium_codes', pol.policyname);
  end loop;
end $$;

revoke all on public.premium_codes from anon;
revoke all on public.premium_codes from authenticated;

commit;

-- Verification (paste separately AFTER the commit above):
--   select count(*) from pg_policies
--    where schemaname='public' and tablename in ('profiles','premium_codes');
--   -- expect exactly 2 (profiles_public_read, profiles_self_update)
