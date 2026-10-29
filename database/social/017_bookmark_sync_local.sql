-- bookmark_sync pindah ke Postgres lokal. Sebelumnya setiap perubahan bookmark
-- di browser menulis ke Supabase (delete + upsert seluruh daftar per user).

create table if not exists bookmark_sync (
  id bigserial primary key,
  user_id uuid not null,
  comic_slug text not null,
  source text,
  title text,
  image text,
  synced_at timestamptz not null default now(),
  constraint idx_bookmark_sync_user_comic unique (user_id, comic_slug)
);

create index if not exists idx_bookmark_sync_slug on bookmark_sync (comic_slug);
create index if not exists idx_bookmark_sync_user on bookmark_sync (user_id);

grant select, insert, update, delete on bookmark_sync to ryukomik_social_app;
grant usage, select on sequence bookmark_sync_id_seq to ryukomik_social_app;
