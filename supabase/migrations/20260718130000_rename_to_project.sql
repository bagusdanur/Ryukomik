-- Drop lama
drop table if exists public.translate_chapters cascade;
drop table if exists public.translate_manga cascade;
drop function if exists update_translate_manga_timestamp cascade;

-- Create project_manga table
create table if not exists public.project_manga (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  cover_url text,
  description text,
  author text,
  status text default 'ongoing',
  type text default 'manga',
  genres text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create project_chapters table
create table if not exists public.project_chapters (
  id uuid default gen_random_uuid() primary key,
  manga_slug text not null references public.project_manga(slug) on delete cascade,
  chapter_number numeric not null,
  title text,
  image_urls text[] not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (manga_slug, chapter_number)
);

-- RLS untuk tabel project_manga
alter table public.project_manga enable row level security;
create policy "Manga bisa dibaca semua orang" on public.project_manga for select using (true);
create policy "Hanya admin yang bisa insert manga" on public.project_manga for insert with check (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');
create policy "Hanya admin yang bisa update manga" on public.project_manga for update using (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');
create policy "Hanya admin yang bisa delete manga" on public.project_manga for delete using (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');

-- RLS untuk tabel project_chapters
alter table public.project_chapters enable row level security;
create policy "Chapter bisa dibaca semua orang" on public.project_chapters for select using (true);
create policy "Hanya admin yang bisa insert chapter" on public.project_chapters for insert with check (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');
create policy "Hanya admin yang bisa update chapter" on public.project_chapters for update using (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');
create policy "Hanya admin yang bisa delete chapter" on public.project_chapters for delete using (auth.role() = 'authenticated' and (auth.jwt()->>'role')::text = 'admin');

-- Tambahkan trigger updated_at untuk manga saat chapter ditambah/diupdate
create or replace function update_project_manga_timestamp()
returns trigger as $$
begin
  update public.project_manga
  set updated_at = now()
  where slug = NEW.manga_slug;
  return NEW;
end;
$$ language plpgsql;

create trigger tr_project_chapters_updated
  after insert or update on public.project_chapters
  for each row
  execute function update_project_manga_timestamp();
