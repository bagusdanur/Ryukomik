-- Persiapan migrasi profiles + XP ke Postgres lokal (Irisan 0).
-- Belum ada perubahan perilaku: kolom baru hanya diisi oleh import sekali jalan
-- (scripts/sync-social-identities.mjs) sampai irisan berikutnya memakainya.

alter table social_profiles
  add column if not exists xp integer not null default 0,
  add column if not exists premium_until timestamptz,
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid,
  add column if not exists show_public_reads boolean not null default true,
  add column if not exists show_public_comments boolean not null default true,
  add column if not exists show_public_join_date boolean not null default true;

-- Riwayat baca (pengganti user_reads Supabase saat XP pindah lokal).
-- Primary key (user_id, chapter_slug) = kunci idempotensi: chapter yang sama
-- tidak menambah XP dua kali.
create table if not exists user_reads (
  user_id uuid not null,
  chapter_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_slug)
);
create index if not exists user_reads_user_created on user_reads (user_id, created_at desc);

-- Jurnal penulisan profil: dipakai untuk rollback (memutar balik ke Supabase
-- sekali jalan) sekaligus audit perubahan premium/role.
create table if not exists profile_write_log (
  id bigserial primary key,
  user_id uuid not null,
  fields jsonb not null,
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists profile_write_log_user on profile_write_log (user_id, created_at desc);

grant select, insert, update, delete on user_reads, profile_write_log to ryukomik_social_app;
grant usage, select on sequence profile_write_log_id_seq to ryukomik_social_app;
