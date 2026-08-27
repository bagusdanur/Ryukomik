create table if not exists download_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  usage_date date not null,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists download_quota_user_day
  on download_quota_reservations(user_id, usage_date, status, expires_at);

create index if not exists download_quota_expiry
  on download_quota_reservations(expires_at)
  where status = 'reserved';
