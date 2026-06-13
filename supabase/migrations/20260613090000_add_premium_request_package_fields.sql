alter table public.premium_requests
  add column if not exists package_name text,
  add column if not exists duration_days integer not null default 30,
  add column if not exists amount integer not null default 10000;

