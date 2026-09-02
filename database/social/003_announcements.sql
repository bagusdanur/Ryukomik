begin;

create table if not exists social_announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null check (char_length(trim(title)) between 1 and 120),
  message varchar(500) not null check (char_length(trim(message)) between 1 and 500),
  link text check (link is null or (char_length(link) <= 500 and link like '/%')),
  audience varchar(20) not null default 'all' check (audience in ('all', 'free', 'premium')),
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > published_at)
);

create index if not exists social_announcements_active_cursor
  on social_announcements (is_active, published_at desc, id desc);

create table if not exists social_announcement_reads (
  announcement_id uuid not null references social_announcements(id) on delete cascade,
  user_id uuid not null references social_profiles(user_id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists social_announcement_reads_user
  on social_announcement_reads (user_id, read_at desc);

commit;
