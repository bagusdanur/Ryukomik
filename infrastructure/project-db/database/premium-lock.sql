-- Run on the private Project PostgreSQL database, not Supabase.
begin;
alter table project_chapters add column if not exists premium_lock_started_at timestamptz;
alter table project_chapters add column if not exists premium_lock_until timestamptz;
create index if not exists idx_project_chapters_premium_lock
  on project_chapters(premium_lock_until) where premium_lock_until is not null;
-- The legacy login lock is retired; no automatic conversion to a paywall.
update project_chapters set login_lock_until=null where login_lock_until is not null;
commit;
