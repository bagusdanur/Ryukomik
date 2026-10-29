-- Backup riwayat + bookmark per user pindah ke Postgres lokal.

create table if not exists user_backup (
  id bigserial primary key,
  user_id uuid not null unique,
  history jsonb not null default '[]'::jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on user_backup to ryukomik_social_app;
grant usage, select on sequence user_backup_id_seq to ryukomik_social_app;
