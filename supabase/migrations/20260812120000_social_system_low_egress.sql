-- Social graph optimized for small payloads and cursor pagination.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists banner_url text;

alter table public.user_collections add column if not exists description text;
alter table public.user_collections add column if not exists visibility text not null default 'public';
alter table public.user_collections drop constraint if exists user_collections_visibility_check;
alter table public.user_collections add constraint user_collections_visibility_check
  check (visibility in ('public', 'private', 'unlisted'));

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_not_self check (follower_id <> following_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.user_mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  constraint user_mutes_not_self check (user_id <> muted_id)
);

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete cascade,
  actor_name text not null,
  event_type text not null,
  entity_id text,
  entity_label text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_follows_following_created on public.user_follows(following_id, created_at desc);
create index if not exists idx_user_follows_follower_created on public.user_follows(follower_id, created_at desc);
create index if not exists idx_activity_events_actor_cursor on public.activity_events(actor_id, created_at desc, id desc);
create index if not exists idx_activity_events_public_cursor on public.activity_events(visibility, created_at desc, id desc);
create index if not exists idx_user_collections_visibility_updated on public.user_collections(user_id, visibility, updated_at desc);

alter table public.user_follows enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "follows visible" on public.user_follows;
create policy "follows visible" on public.user_follows for select to anon, authenticated using (true);
drop policy if exists "manage own follows" on public.user_follows;
create policy "manage own follows" on public.user_follows for all to authenticated
  using ((select auth.uid()) = follower_id) with check ((select auth.uid()) = follower_id);

drop policy if exists "manage own blocks" on public.user_blocks;
create policy "manage own blocks" on public.user_blocks for all to authenticated
  using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);
drop policy if exists "manage own mutes" on public.user_mutes;
create policy "manage own mutes" on public.user_mutes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "visible activities" on public.activity_events;
create policy "visible activities" on public.activity_events for select to anon, authenticated
  using (visibility = 'public' or actor_id = (select auth.uid()) or
    (visibility = 'followers' and exists (
      select 1 from public.user_follows f
      where f.follower_id = (select auth.uid()) and f.following_id = actor_id
    )));
drop policy if exists "insert own activities" on public.activity_events;
create policy "insert own activities" on public.activity_events for insert to authenticated
  with check ((select auth.uid()) = actor_id);

grant select on public.user_follows, public.activity_events to anon, authenticated;
grant insert, delete on public.user_follows to authenticated;
grant select, insert, delete on public.user_blocks, public.user_mutes to authenticated;
grant insert on public.activity_events to authenticated;
grant usage, select on sequence public.activity_events_id_seq to authenticated;
