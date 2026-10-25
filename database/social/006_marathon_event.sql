-- Marathon Reading Event (leaderboard mingguan & bulanan) — data 100% lokal.
-- Dijalankan di database `ryukomik_social` (SOCIAL_DATABASE_URL), BUKAN Supabase.

create table if not exists marathon_events (
  id                bigserial primary key,
  slug              text not null unique,
  title             text not null,
  description       text,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  is_active         boolean not null default true,
  prize_1           text,
  prize_2           text,
  prize_3           text,
  premium_days_1    int not null default 0,
  premium_days_2    int not null default 0,
  premium_days_3    int not null default 0,
  daily_chapter_cap int not null default 300,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists marathon_reads (
  id           bigserial primary key,
  event_id     bigint not null references marathon_events(id) on delete cascade,
  user_id      uuid not null,
  chapter_slug text not null,
  period_type  text not null check (period_type in ('weekly','monthly')),
  period_key   text not null,
  read_at      timestamptz not null default now(),
  unique (event_id, user_id, chapter_slug, period_type, period_key)
);
create index if not exists marathon_reads_user_day_idx
  on marathon_reads (user_id, read_at desc);
create index if not exists marathon_reads_period_idx
  on marathon_reads (event_id, period_type, period_key, user_id);

create table if not exists marathon_scores (
  event_id    bigint not null references marathon_events(id) on delete cascade,
  user_id     uuid not null,
  period_type text not null check (period_type in ('weekly','monthly')),
  period_key  text not null,
  chapters    int not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (event_id, user_id, period_type, period_key)
);
create index if not exists marathon_scores_rank_idx
  on marathon_scores (event_id, period_type, period_key, chapters desc, updated_at asc);

create table if not exists marathon_winners (
  id           bigserial primary key,
  event_id     bigint not null references marathon_events(id) on delete cascade,
  period_type  text not null check (period_type in ('weekly','monthly')),
  period_key   text not null,
  rank         int not null check (rank between 1 and 10),
  user_id      uuid not null,
  username     text,
  chapters     int not null,
  prize_label  text,
  premium_days int not null default 0,
  status       text not null default 'pending' check (status in ('pending','granted','void')),
  granted_at   timestamptz,
  granted_by   uuid,
  created_at   timestamptz not null default now(),
  unique (event_id, period_type, period_key, rank)
);
create index if not exists marathon_winners_lookup_idx
  on marathon_winners (event_id, period_type, period_key, rank);
