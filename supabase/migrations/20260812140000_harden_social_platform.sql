-- Harden and extend the low-egress social platform.
alter table public.social_posts add column if not exists edited_at timestamptz;
alter table public.user_collections
  add column if not exists cover_url text check (cover_url is null or (char_length(cover_url) <= 2048 and cover_url like 'https://%')),
  add column if not exists items_count integer not null default 0 check (items_count >= 0);
alter table public.notifications add column if not exists read_at timestamptz;

create table if not exists public.social_post_bookmarks (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.social_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  follows boolean not null default true,
  likes boolean not null default true,
  replies boolean not null default true,
  mentions boolean not null default true,
  collections boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.social_reports
  add column if not exists moderator_id uuid references public.profiles(id) on delete set null,
  add column if not exists moderator_note text check (moderator_note is null or char_length(moderator_note) <= 500),
  add column if not exists resolved_at timestamptz;

create index if not exists idx_social_posts_public_cursor on public.social_posts(visibility, parent_id, created_at desc, id desc);
create index if not exists idx_social_bookmarks_user_cursor on public.social_post_bookmarks(user_id, created_at desc, post_id desc);
create index if not exists idx_notifications_user_read_cursor on public.notifications(user_id, is_read, created_at desc, id desc);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id, created_at desc);
create index if not exists idx_user_mutes_muted on public.user_mutes(muted_id, created_at desc);

alter table public.social_post_bookmarks enable row level security;
alter table public.social_notification_preferences enable row level security;
drop policy if exists "manage own social bookmarks" on public.social_post_bookmarks;
create policy "manage own social bookmarks" on public.social_post_bookmarks for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "manage own notification preferences" on public.social_notification_preferences;
create policy "manage own notification preferences" on public.social_notification_preferences for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.social_post_bookmarks, public.social_notification_preferences from anon, authenticated;

create or replace function public.sync_collection_item_counter()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.user_collections set items_count = items_count + 1, updated_at = now() where id = new.collection_id;
    return new;
  end if;
  update public.user_collections set items_count = greatest(0, items_count - 1), updated_at = now() where id = old.collection_id;
  return old;
end;
$$;
revoke all on function public.sync_collection_item_counter() from public, anon, authenticated;
drop trigger if exists user_collection_item_counter on public.user_collection_items;
create trigger user_collection_item_counter after insert or delete on public.user_collection_items
for each row execute function public.sync_collection_item_counter();
update public.user_collections c set items_count = (
  select count(*)::integer from public.user_collection_items i where i.collection_id = c.id
);
