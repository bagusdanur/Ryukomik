begin;

create extension if not exists pgcrypto;

create table if not exists social_profiles (
  user_id uuid primary key,
  username text not null,
  avatar_url text,
  banner_url text,
  bio text,
  level integer not null default 1,
  role text,
  is_premium boolean not null default false,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists social_profiles_username_ci on social_profiles (lower(username));

create table if not exists social_follows (
  follower_id uuid not null references social_profiles(user_id) on delete cascade,
  following_id uuid not null references social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists social_follows_following_cursor on social_follows(following_id, created_at desc);
create index if not exists social_follows_follower_cursor on social_follows(follower_id, created_at desc);

create table if not exists social_blocks (
  blocker_id uuid not null references social_profiles(user_id) on delete cascade,
  blocked_id uuid not null references social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists social_mutes (
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  muted_id uuid not null references social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  check (user_id <> muted_id)
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references social_profiles(user_id) on delete cascade,
  parent_id uuid references social_posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url like 'https://%')),
  visibility text not null default 'public' check (visibility in ('public', 'followers')),
  likes_count integer not null default 0 check (likes_count >= 0),
  replies_count integer not null default 0 check (replies_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists social_posts_timeline on social_posts(parent_id, created_at desc, id desc);
create index if not exists social_posts_author_timeline on social_posts(author_id, parent_id, created_at desc, id desc);

create table if not exists social_post_likes (
  post_id uuid not null references social_posts(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists social_post_bookmarks (
  post_id uuid not null references social_posts(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists social_bookmarks_user_cursor on social_post_bookmarks(user_id, created_at desc, post_id desc);

create table if not exists social_activity_events (
  id bigint generated always as identity primary key,
  actor_id uuid references social_profiles(user_id) on delete cascade,
  actor_name text not null,
  event_type text not null,
  entity_id text,
  entity_label text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now()
);
create index if not exists social_activity_actor_cursor on social_activity_events(actor_id, created_at desc, id desc);

create table if not exists social_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  actor_id uuid references social_profiles(user_id) on delete set null,
  actor_name text not null default 'User',
  type text not null check (type in ('new_follower', 'social_like', 'social_reply', 'social_mention', 'social_collection', 'reply', 'premium_activated', 'premium_reward')),
  slug text,
  chapter text,
  target_id text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists social_notifications_user_cursor on social_notifications(user_id, is_read, created_at desc, id desc);

create table if not exists social_notification_preferences (
  user_id uuid primary key references social_profiles(user_id) on delete cascade,
  follows boolean not null default true,
  likes boolean not null default true,
  replies boolean not null default true,
  mentions boolean not null default true,
  collections boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists social_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references social_profiles(user_id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 200),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  moderator_id uuid,
  moderator_note text check (moderator_note is null or char_length(moderator_note) <= 500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index if not exists social_reports_status_cursor on social_reports(status, created_at desc);

create table if not exists social_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  cover_url text,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  items_count integer not null default 0 check (items_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_collections_owner_cursor on social_collections(user_id, updated_at desc);

create table if not exists social_collection_items (
  collection_id uuid not null references social_collections(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  source text not null,
  slug text not null,
  title text not null,
  image text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, source, slug)
);
create index if not exists social_collection_items_cursor on social_collection_items(collection_id, created_at desc, slug desc);

create or replace function sync_social_post_counters() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'social_post_likes' then
    if tg_op = 'INSERT' then update social_posts set likes_count = likes_count + 1 where id = new.post_id; return new; end if;
    update social_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id; return old;
  end if;
  if tg_op = 'INSERT' and new.parent_id is not null then update social_posts set replies_count = replies_count + 1 where id = new.parent_id; return new; end if;
  if tg_op = 'DELETE' and old.parent_id is not null then update social_posts set replies_count = greatest(0, replies_count - 1) where id = old.parent_id; end if;
  return old;
end $$;
drop trigger if exists social_like_counter on social_post_likes;
create trigger social_like_counter after insert or delete on social_post_likes for each row execute function sync_social_post_counters();
drop trigger if exists social_reply_counter on social_posts;
create trigger social_reply_counter after insert or delete on social_posts for each row execute function sync_social_post_counters();

create or replace function sync_social_collection_counter() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update social_collections set items_count = items_count + 1, updated_at = now() where id = new.collection_id; return new; end if;
  update social_collections set items_count = greatest(0, items_count - 1), updated_at = now() where id = old.collection_id; return old;
end $$;
drop trigger if exists social_collection_item_counter on social_collection_items;
create trigger social_collection_item_counter after insert or delete on social_collection_items for each row execute function sync_social_collection_counter();

commit;
