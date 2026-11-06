-- Reservasi kuota upload Scanlator: mencegah upload paralel menembus batas 2 GB.
create table if not exists scanlator_uploads (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  object_key text not null,
  bytes bigint not null,
  status text not null default 'reserved', -- reserved | committed | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create unique index if not exists scanlator_uploads_key_uidx on scanlator_uploads (object_key);
create index if not exists scanlator_uploads_handle_idx on scanlator_uploads (handle, status);
