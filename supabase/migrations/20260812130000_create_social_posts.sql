create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.social_posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url like 'https://%')),
  visibility text not null default 'public' check (visibility in ('public', 'followers')),
  likes_count integer not null default 0 check (likes_count >= 0),
  replies_count integer not null default 0 check (replies_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 200),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists idx_social_posts_timeline on public.social_posts(parent_id, created_at desc, id desc);
create index if not exists idx_social_posts_author_timeline on public.social_posts(author_id, parent_id, created_at desc, id desc);
create index if not exists idx_social_posts_parent_replies on public.social_posts(parent_id, created_at asc);
create index if not exists idx_social_post_likes_user on public.social_post_likes(user_id, created_at desc);
create index if not exists idx_social_reports_status on public.social_reports(status, created_at desc);

alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_reports enable row level security;

drop policy if exists "social posts visible" on public.social_posts;
create policy "social posts visible" on public.social_posts for select to anon, authenticated
using (
  visibility = 'public'
  or author_id = (select auth.uid())
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.user_follows f
      where f.follower_id = (select auth.uid()) and f.following_id = author_id
    )
  )
);

drop policy if exists "social likes visible" on public.social_post_likes;
create policy "social likes visible" on public.social_post_likes for select to anon, authenticated using (true);

drop policy if exists "own reports visible" on public.social_reports;
create policy "own reports visible" on public.social_reports for select to authenticated
using (reporter_id = (select auth.uid()));

revoke all on public.social_posts, public.social_post_likes, public.social_reports from anon, authenticated;

create or replace function public.sync_social_post_counters()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'social_post_likes' then
    if tg_op = 'INSERT' then
      update public.social_posts set likes_count = likes_count + 1 where id = new.post_id;
      return new;
    end if;
    update public.social_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.social_posts set replies_count = replies_count + 1 where id = new.parent_id;
    return new;
  end if;
  if tg_op = 'DELETE' and old.parent_id is not null then
    update public.social_posts set replies_count = greatest(0, replies_count - 1) where id = old.parent_id;
    return old;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_social_post_counters() from public, anon, authenticated;

drop trigger if exists social_like_counter on public.social_post_likes;
create trigger social_like_counter after insert or delete on public.social_post_likes
for each row execute function public.sync_social_post_counters();
drop trigger if exists social_reply_counter on public.social_posts;
create trigger social_reply_counter after insert or delete on public.social_posts
for each row execute function public.sync_social_post_counters();


