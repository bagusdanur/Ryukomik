-- Fase A migrasi auth lokal: tabel identitas & sesi.
-- id sengaja TIDAK memakai default: harus memakai UUID lama dari social_profiles
-- supaya XP, komentar, maraton, bookmark, dan koleksi tetap terhubung.

create table if not exists auth_users (
  id uuid primary key,
  -- email baru terisi saat login Google pertama; data lama belum punya email.
  email text,
  google_sub text unique,
  full_name text,
  avatar_url text,
  banned_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_auth_users_email_lower
  on auth_users (lower(email));

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  refresh_hash text not null,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_auth_sessions_user
  on auth_sessions (user_id)
  where revoked_at is null;

create index if not exists idx_auth_sessions_refresh
  on auth_sessions (refresh_hash);

create table if not exists auth_oauth_states (
  state text primary key,
  code_verifier text not null,
  next_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_oauth_states_created
  on auth_oauth_states (created_at);
