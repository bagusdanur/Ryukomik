-- Penanda perubahan profil untuk sinyal realtime ke browser.
-- Ditulis oleh aksi admin/webhook (premium, role, ban) supaya user yang sedang
-- online langsung me-refresh profilnya tanpa polling ke Supabase.
-- Nol query Supabase: murni database lokal.

create table if not exists profile_change_signals (
  user_id uuid primary key,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
