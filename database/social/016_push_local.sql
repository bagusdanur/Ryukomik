-- Push subscription & penanda notifikasi chapter pindah ke Postgres lokal.
-- Sebelumnya dua tabel ini ditulis/dibaca dari Supabase (PostgREST) sehingga
-- setiap subscribe & setiap siklus cron menambah egress.

create table if not exists push_subscriptions (
  id bigserial primary key,
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null default '',
  auth text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

create table if not exists notified_chapters (
  id bigserial primary key,
  comic_slug text not null,
  chapter text not null,
  source text,
  notified_at timestamptz not null default now(),
  constraint idx_notified_chapters_unique unique (comic_slug, chapter)
);

create index if not exists idx_notified_chapters_slug on notified_chapters (comic_slug);

grant select, insert, update, delete on push_subscriptions to ryukomik_social_app;
grant select, insert, update, delete on notified_chapters to ryukomik_social_app;
grant usage, select on sequence push_subscriptions_id_seq to ryukomik_social_app;
grant usage, select on sequence notified_chapters_id_seq to ryukomik_social_app;
