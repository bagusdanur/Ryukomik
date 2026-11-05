-- Fase A Scanlator (BETA): pengajuan Akun Translation + profil Scanlator.
-- Beta: pengajuan dibuka publik, tapi SETIAP pengajuan wajib ACC admin manual.
-- Belum ada upload (Fase B) — tabel ini fondasi identitasnya.

create table if not exists scanlator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  handle text not null unique,
  team_name text not null,
  description text,
  samples text[] not null default '{}',
  agree_terms boolean not null default false,
  status text not null default 'pending', -- pending | approved | rejected
  review_note text,
  reviewed_by uuid references auth_users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_scanlator_app_user on scanlator_applications(user_id);
create index if not exists idx_scanlator_app_status on scanlator_applications(status, created_at desc);
-- Satu user = satu pengajuan aktif (pending/approved). Ditolak boleh ajukan lagi.
create unique index if not exists uq_scanlator_app_active_user
  on scanlator_applications(user_id) where status in ('pending', 'approved');

create table if not exists scanlator_profiles (
  user_id uuid primary key references auth_users(id) on delete cascade,
  handle text not null unique,
  team_name text not null,
  bio text,
  support_dana text,
  support_trakteer text,
  support_tako text,
  support_url_lain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
