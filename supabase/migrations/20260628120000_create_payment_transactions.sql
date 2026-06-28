create table public.payment_transactions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    order_id text unique not null,
    package_name text not null,
    duration_days integer not null,
    amount integer not null,
    fee integer,
    total_payment integer,
    payment_method text,
    payment_number text,
    status text not null default 'pending',
    expired_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz default now() not null
);

-- RLS policies
alter table public.payment_transactions enable row level security;

create policy "Users can view their own payment transactions"
    on public.payment_transactions
    for select
    using (auth.uid() = user_id);

-- Insert and Update are done via Service Role (no policy needed for server-side actions)
