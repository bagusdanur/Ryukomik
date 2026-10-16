-- Nobar (nonton bareng) anime.
--
-- Semua data nobar tinggal di PostgreSQL VPS ini (SOCIAL_DATABASE_URL).
-- Supabase tidak disentuh sama sekali: auth tetap Supabase, tapi verifikasi
-- JWT-nya lokal (JWKS) seperti komentar anime, jadi egress tidak naik.
--
-- Realtime tanpa WebSocket/Redis: klien polling delta (lihat API
-- /api/social/nobar/*), ruang nganggur ditutup otomatis saat di-poll.
begin;

create table if not exists nobar_rooms (
  id uuid primary key default gen_random_uuid(),
  episode_slug text not null,
  episode_title text,
  host_id uuid not null references social_profiles(user_id) on delete cascade,
  host_name text not null,
  player_label text,
  player_url text,
  is_playing boolean not null default false,
  position_seconds numeric not null default 0,
  playback_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Satu ruang aktif per episode. Kalau host membuka ruang baru, ruang lama
-- episode itu ditutup dulu (lihat POST /api/social/nobar).
create unique index if not exists nobar_one_active_room
  on nobar_rooms(episode_slug) where ended_at is null;

-- Pencarian ruang aktif sebuah episode (badge di halaman episode).
create index if not exists nobar_rooms_active_episode
  on nobar_rooms(episode_slug, created_at desc) where ended_at is null;

-- Auto-tutup ruang nganggur: cari ruang yang playback_updated_at-nya basi.
create index if not exists nobar_rooms_stale
  on nobar_rooms(playback_updated_at) where ended_at is null;

create table if not exists nobar_members (
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  name text not null,
  avatar_url text,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Peserta aktif (last_seen masih segar) per ruang.
create index if not exists nobar_members_seen on nobar_members(room_id, last_seen desc);

create table if not exists nobar_messages (
  id uuid primary key default gen_random_uuid(),
  seq bigserial,
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Cursor delta chat memakai `seq` (monotonik, presisi penuh) karena
-- created_at kehilangan presisi mikrodetik saat lewat JSON.
create index if not exists nobar_messages_room on nobar_messages(room_id, seq);

create table if not exists nobar_reactions (
  room_id uuid not null references nobar_rooms(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id, emoji)
);

create index if not exists nobar_reactions_recent on nobar_reactions(room_id, created_at desc);

commit;
