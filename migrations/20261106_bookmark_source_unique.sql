-- Bookmark dianggap unik per source + slug, bukan slug saja.
-- Dengan begitu manhwa dan manga yang slugnya sama tidak saling menimpa.

update bookmark_sync
   set source = 'komiku'
 where source is null or btrim(source) = '';

alter table bookmark_sync
  alter column source set default 'komiku',
  alter column source set not null;

alter table bookmark_sync
  drop constraint if exists idx_bookmark_sync_user_comic;

create unique index if not exists idx_bookmark_sync_user_source_comic
  on bookmark_sync (user_id, source, comic_slug);
