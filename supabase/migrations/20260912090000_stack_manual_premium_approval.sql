-- Manual proof approvals extend an active subscription instead of replacing it.
-- The request row and profile row are locked in one transaction so a repeated
-- admin click cannot grant the same request twice.
create or replace function public.approve_manual_premium_request(p_request_id uuid)
returns table (
  user_id uuid,
  duration_days integer,
  previous_until timestamptz,
  premium_until timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  request_row public.premium_requests%rowtype;
  profile_until timestamptz;
  approved_at timestamptz := clock_timestamp();
  next_until timestamptz;
begin
  select * into request_row
  from public.premium_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Permintaan premium tidak ditemukan';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Permintaan premium sudah diproses';
  end if;
  if request_row.user_id is null then
    raise exception 'Permintaan premium tidak memiliki pengguna';
  end if;
  if request_row.duration_days is null or request_row.duration_days < 1 or request_row.duration_days > 3650 then
    raise exception 'Durasi premium tidak valid';
  end if;

  select p.premium_until into profile_until
  from public.profiles p
  where p.id = request_row.user_id
  for update;

  if not found then
    raise exception 'Profil pengguna tidak ditemukan';
  end if;

  next_until := greatest(coalesce(profile_until, approved_at), approved_at)
    + make_interval(days => request_row.duration_days);

  update public.profiles p
  set is_premium = true,
      premium_until = next_until
  where p.id = request_row.user_id;

  update public.premium_requests r
  set status = 'approved',
      updated_at = approved_at
  where r.id = request_row.id;

  return query select request_row.user_id, request_row.duration_days, profile_until, next_until;
end;
$function$;

revoke all on function public.approve_manual_premium_request(uuid) from public, anon, authenticated;
grant execute on function public.approve_manual_premium_request(uuid) to service_role;
