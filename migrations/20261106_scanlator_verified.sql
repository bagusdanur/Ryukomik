-- Fase 4: verifikasi tim & bukti pernyataan hak unggah.
alter table scanlator_profiles add column if not exists verified boolean not null default false;

create table if not exists scanlator_rights_confirmations (
  user_id uuid not null references auth_users(id) on delete cascade,
  manga_slug text not null,
  confirmed_at timestamptz not null default now(),
  primary key (user_id, manga_slug)
);
