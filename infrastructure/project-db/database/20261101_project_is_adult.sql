-- Toggle 18+ per seri Project.
-- Sebelumnya penandaan hanya lewat genre, jadi admin tidak bisa memilih sendiri.
alter table project_manga
  add column if not exists is_adult boolean not null default false;

-- Backfill: seri yang genrenya sudah menandakan dewasa dianggap 18+.
update project_manga m
set is_adult = true
where exists (
  select 1
  from jsonb_array_elements_text(coalesce(m.genres, '[]'::jsonb)) g(value)
  where lower(trim(g.value)) in ('18+', 'adult', 'mature', 'ecchi', 'smut', 'hentai', 'explicit', 'nsfw')
);

create index if not exists idx_project_manga_adult
  on project_manga (is_adult)
  where is_adult = true;
