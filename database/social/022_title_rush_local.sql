-- Skor & juara event Title Rush pindah ke Postgres lokal.
create table if not exists title_rush_scores (
  id bigserial primary key,
  user_id uuid not null,
  week_start date not null,
  score integer not null default 0,
  total_rounds integer not null default 0,
  best_streak integer not null default 0,
  source_page text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idx_title_rush_scores_user_week unique (user_id, week_start)
);

create index if not exists idx_title_rush_scores_week on title_rush_scores (week_start, score desc);

create table if not exists title_rush_winners (
  id bigserial primary key,
  week_start date not null,
  user_id uuid not null,
  rank integer not null,
  score integer not null default 0,
  total_rounds integer not null default 0,
  best_streak integer not null default 0,
  prize_days integer,
  premium_until timestamptz,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint idx_title_rush_winners_user_week unique (week_start, user_id)
);

create index if not exists idx_title_rush_winners_awarded on title_rush_winners (awarded_at desc);

grant select, insert, update, delete on title_rush_scores to ryukomik_social_app;
grant select, insert, update, delete on title_rush_winners to ryukomik_social_app;
grant usage, select on sequence title_rush_scores_id_seq to ryukomik_social_app;
grant usage, select on sequence title_rush_winners_id_seq to ryukomik_social_app;
