-- Fix: "chapter terbaru per manga" untuk banyak manga sekaligus (dipakai di
-- carousel Project Update homepage, banner spotlight, dan listing source
-- project) sebelumnya diambil dengan:
--
--   select manga_slug, chapter_number from project_chapters
--   where manga_slug in (...)
--   order by chapter_number desc
--   limit <jumlah_manga> * N
--
-- Ini salah: ORDER BY chapter_number DESC di-sort GLOBAL lintas semua manga,
-- bukan per manga_slug. Manga dengan nomor chapter tinggi (mis. chapter 47)
-- bisa menghabiskan seluruh LIMIT duluan, jadi manga lain yang chapter-nya
-- masih rendah (mis. baru chapter 1-3, termasuk hasil auto-import chapter
-- yang baru ditambahkan) gak pernah kebagian baris sama sekali -> makanya
-- chapter_terbaru-nya kosong di tampilan.
--
-- DISTINCT ON (manga_slug) ... ORDER BY manga_slug, chapter_number DESC
-- menjamin tepat 1 baris (yang bener-bener terbaru) per manga_slug, dalam
-- satu query, tanpa perlu nebak angka LIMIT yang aman.

create index if not exists idx_project_chapters_manga_slug_chapter_desc
  on public.project_chapters (manga_slug, chapter_number desc)
  where is_published = true;

create or replace function public.get_latest_project_chapters(p_manga_slugs text[])
returns table (manga_slug text, chapter_number numeric, uploaded_at timestamptz)
language sql
stable
as $$
  select distinct on (pc.manga_slug)
    pc.manga_slug,
    pc.chapter_number,
    pc.uploaded_at
  from public.project_chapters pc
  where pc.manga_slug = any(p_manga_slugs)
    and pc.is_published = true
  order by pc.manga_slug, pc.chapter_number desc;
$$;

revoke execute on function public.get_latest_project_chapters(text[]) from public, anon, authenticated;
grant execute on function public.get_latest_project_chapters(text[]) to service_role;
