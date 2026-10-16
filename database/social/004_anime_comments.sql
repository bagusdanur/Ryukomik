-- Komentar anime (per episode) menumpang tabel social_posts supaya mewarisi
-- infrastruktur yang sudah ada — like, balasan, notifikasi, blokir, mute —
-- tanpa tabel baru dan tanpa menyentuh Supabase (egress tidak naik).
--
-- Cara kerja:
--   context_type is null          -> postingan timeline biasa (semua data lama)
--   context_type = 'anime'        -> komentar pada episode anime
--   context_id   = <episode slug> -> episode yang dibahas
--
-- Timeline utama menyaring `context_type is null`, jadi komentar anime tidak
-- pernah bocor ke /files maupun profil.
begin;

alter table social_posts add column if not exists context_type text;
alter table social_posts add column if not exists context_id text;

-- Cek cepat "komentar untuk satu episode" + cursor (created_at, id).
create index if not exists social_posts_context_timeline
  on social_posts(context_type, context_id, parent_id, created_at desc, id desc);

-- Timeline umum: memastikan penyaringan context_type is null tetap cepat.
create index if not exists social_posts_general_timeline
  on social_posts(created_at desc, id desc)
  where context_type is null;

commit;
