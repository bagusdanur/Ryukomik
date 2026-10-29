-- Koleksi baca user (grup bookmark) pindah ke Postgres lokal.
-- Berbeda dari social_collections (koleksi postingan profil).

create table if not exists user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  is_public boolean not null default true,
  description text,
  visibility text,
  cover_url text,
  items_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_collections_user on user_collections (user_id, updated_at desc);

create table if not exists user_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references user_collections(id) on delete cascade,
  user_id uuid not null,
  source text,
  slug text not null,
  title text,
  image text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_collection_items_collection on user_collection_items (collection_id, position);
create index if not exists idx_user_collection_items_user on user_collection_items (user_id);

grant select, insert, update, delete on user_collections to ryukomik_social_app;
grant select, insert, update, delete on user_collection_items to ryukomik_social_app;
