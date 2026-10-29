-- Jalur uang manual (kode premium, request premium, transaksi) pindah ke lokal.
-- Tetap satu penulis + audit lewat updateLocalProfile seperti sebelumnya.

create table if not exists premium_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  duration_days integer not null,
  used boolean not null default false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text,
  proof_url text,
  status text not null default 'pending',
  package_name text,
  duration_days integer,
  amount integer,
  sk_agreed boolean not null default false,
  sk_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_premium_requests_status on premium_requests (status, created_at desc);

create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  order_id text unique,
  package_name text,
  duration_days integer,
  amount integer,
  fee integer,
  total_payment integer,
  payment_method text,
  payment_number text,
  status text,
  expired_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on premium_codes to ryukomik_social_app;
grant select, insert, update, delete on premium_requests to ryukomik_social_app;
grant select, insert, update, delete on payment_transactions to ryukomik_social_app;
