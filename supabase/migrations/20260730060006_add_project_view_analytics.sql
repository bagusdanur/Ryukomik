-- Lightweight, server-only view analytics for Source Project.
-- Counters are incremented at most once per manga/browser/day by the RPC below.
alter table public.project_manga
  add column if not exists view_count bigint not null default 0
  check (view_count >= 0);

create table if not exists public.project_manga_view_daily (
  manga_slug text not null references public.project_manga(slug) on delete cascade,
  viewed_on date not null default current_date,
  unique_views bigint not null default 0 check (unique_views >= 0),
  primary key (manga_slug, viewed_on)
);

-- Hashed, anonymous browser identifiers are retained only for daily de-duplication.
create table if not exists public.project_manga_view_visitors (
  manga_slug text not null references public.project_manga(slug) on delete cascade,
  visitor_hash text not null,
  viewed_on date not null default current_date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (manga_slug, visitor_hash, viewed_on)
);

create index if not exists idx_project_manga_view_daily_date
  on public.project_manga_view_daily (viewed_on desc);
create index if not exists idx_project_manga_view_visitors_date
  on public.project_manga_view_visitors (viewed_on);

alter table public.project_manga_view_daily enable row level security;
alter table public.project_manga_view_visitors enable row level security;
revoke all on public.project_manga_view_daily from anon, authenticated;
revoke all on public.project_manga_view_visitors from anon, authenticated;

create or replace function public.record_project_view(
  p_manga_slug text,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count bigint := 0;
begin
  if p_manga_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or length(p_visitor_hash) <> 64 then
    return false;
  end if;

  insert into public.project_manga_view_visitors (manga_slug, visitor_hash, viewed_on)
  select p_manga_slug, p_visitor_hash, current_date
  where exists (
    select 1
    from public.project_manga
    where slug = p_manga_slug and is_published = true
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  update public.project_manga
  set view_count = view_count + 1
  where slug = p_manga_slug and is_published = true;

  insert into public.project_manga_view_daily (manga_slug, viewed_on, unique_views)
  values (p_manga_slug, current_date, 1)
  on conflict (manga_slug, viewed_on)
  do update set unique_views = public.project_manga_view_daily.unique_views + 1;

  return true;
end;
$$;

revoke execute on function public.record_project_view(text, text) from public, anon, authenticated;
grant execute on function public.record_project_view(text, text) to service_role;
