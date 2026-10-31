-- Lampiran gambar pada komentar chapter (fitur dari saran user).
-- Nullable: komentar lama tidak berubah, dan UI hanya merender kalau ada isinya.
alter table comments add column if not exists image_url text;

-- Cari komentar bergambar untuk moderasi tanpa full scan.
create index if not exists comments_image_idx on comments (created_at desc) where image_url is not null;
