-- Existing chapters stay public; newly created chapters start as drafts.
alter table public.project_chapters
  add column if not exists is_published boolean;

update public.project_chapters
set is_published = true
where is_published is null;

alter table public.project_chapters
  alter column is_published set default false,
  alter column is_published set not null;

create index if not exists idx_project_chapters_published_manga_number
  on public.project_chapters (manga_slug, is_published, chapter_number desc);
