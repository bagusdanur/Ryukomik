-- Penjaga XP/maraton: catat chapter yang benar-benar pernah dibuka dari aplikasi.
-- /api/xp/read hanya menerima slug yang ada di tabel ini, sehingga slug karangan
-- (yang tidak pernah melewati halaman reader) tidak bisa menambah XP/maraton.

create table if not exists chapter_seen (
  slug text primary key,
  source text,
  first_seen_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

create index if not exists idx_chapter_seen_seen_at on chapter_seen (seen_at desc);

grant select, insert, update on chapter_seen to ryukomik_social_app;
