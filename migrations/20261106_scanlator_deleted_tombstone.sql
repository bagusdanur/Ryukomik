-- Jejak tim yang dihapus admin: mencegah profil dibuat ulang otomatis.
create table if not exists scanlator_deleted (
  user_id uuid primary key,
  handle text,
  deleted_at timestamptz not null default now()
);
