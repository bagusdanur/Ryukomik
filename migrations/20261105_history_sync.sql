-- Sinkron riwayat baca antar-perangkat (meniru bookmark_sync).
-- Full-replace per user dari localStorage, merge di sisi klien by updated_at.
create table if not exists history_sync (
  user_id uuid not null references auth_users(id) on delete cascade,
  comic_slug text not null,
  last_chapter_slug text,
  last_chapter text,
  title text,
  source text,
  thumbnail text,
  read_at timestamptz not null default now(),
  primary key (user_id, comic_slug)
);
create index if not exists idx_history_sync_user_read on history_sync(user_id, read_at desc);
