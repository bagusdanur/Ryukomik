-- Fase 7: riwayat revisi chapter Scanlator (bukti saat sengketa/audit).
create table if not exists scanlator_chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null,
  manga_slug text not null,
  actor_id uuid not null,
  action text not null, -- create | edit_pages | edit_title | approve | reject | delete
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scr_chapter_idx on scanlator_chapter_revisions (chapter_id, created_at desc);
create index if not exists scr_slug_idx on scanlator_chapter_revisions (manga_slug, created_at desc);
