-- Scanlator moderation + kontak (WA/Telegram/Discord) + status akun.
-- status: active | suspended | revoked. SP = surat peringatan (warnings bertambah).

alter table scanlator_applications
  add column if not exists contact_wa text,
  add column if not exists contact_telegram text,
  add column if not exists contact_discord text;

alter table scanlator_profiles
  add column if not exists contact_wa text,
  add column if not exists contact_telegram text,
  add column if not exists contact_discord text,
  add column if not exists status text not null default 'active',
  add column if not exists warnings int not null default 0,
  add column if not exists suspended_until timestamptz,
  add column if not exists moderation_note text;

create table if not exists scanlator_moderation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  action text not null, -- warn | suspend | revoke | restore
  reason text,
  note text,
  admin_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_scanlator_mod_user on scanlator_moderation(user_id, created_at desc);

-- Akun beta lama dianggap aktif.
update scanlator_profiles set status = coalesce(status, 'active') where status is null;
