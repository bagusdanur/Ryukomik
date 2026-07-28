-- Existing Project manga stays public; newly created manga starts as a draft.
alter table public.project_manga
  add column if not exists is_published boolean;

update public.project_manga
set is_published = true
where is_published is null;

alter table public.project_manga
  alter column is_published set default false,
  alter column is_published set not null;

create index if not exists idx_project_manga_published_updated_at
  on public.project_manga (is_published, updated_at desc);
