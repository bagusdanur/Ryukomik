-- Komentar pindah dari Supabase ke Postgres lokal.
-- ID dipertahankan supaya tautan/balasan lama tetap valid; sequence baru
-- (comments_id_seq) dipakai untuk komentar berikutnya.

create table if not exists comments (
  id bigint primary key,
  type text not null,
  slug text not null,
  chapter text,
  content text not null,
  author_name text,
  user_id uuid,
  parent_id bigint,
  created_at timestamptz not null default now(),
  avatar_url text,
  is_spoiler boolean not null default false,
  edited_at timestamptz,
  edit_count integer not null default 0,
  deleted_at timestamptz,
  deleted_by uuid
);

create index if not exists comments_slug_created_idx on comments (slug, created_at desc);
create index if not exists comments_parent_idx on comments (parent_id);
create index if not exists comments_user_idx on comments (user_id);
create index if not exists comments_type_slug_idx on comments (type, slug);

create sequence if not exists comments_id_seq owned by comments.id;
alter table comments alter column id set default nextval('comments_id_seq');

create table if not exists comment_edits (
  id bigserial primary key,
  comment_id bigint not null references comments(id) on delete cascade,
  previous_content text,
  previous_is_spoiler boolean,
  edited_by uuid,
  edited_at timestamptz not null default now()
);
create index if not exists comment_edits_comment_idx on comment_edits (comment_id);

grant select, insert, update, delete on comments to ryukomik_social_app;
grant select, insert, update, delete on comment_edits to ryukomik_social_app;
grant usage, select on sequence comments_id_seq to ryukomik_social_app;
grant usage, select on sequence comment_edits_id_seq to ryukomik_social_app;
