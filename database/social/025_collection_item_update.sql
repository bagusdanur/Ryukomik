-- Urutan koleksi berdasarkan update seri (saran user #5b).
-- Diisi saat item ditambahkan lewat /api/series-thumb; item lama boleh null
-- dan akan diurutkan paling bawah, bukan dihapus.
alter table user_collection_items add column if not exists latest_chapter_at timestamptz;

create index if not exists user_collection_items_update_idx
  on user_collection_items (collection_id, latest_chapter_at desc nulls last);
