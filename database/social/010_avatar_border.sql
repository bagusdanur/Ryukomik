-- Border avatar disimpan di profil sosial (database lokal).
-- Nilainya id dari registry src/lib/avatarBorders.ts; null = default.

alter table social_profiles
  add column if not exists avatar_border text;
