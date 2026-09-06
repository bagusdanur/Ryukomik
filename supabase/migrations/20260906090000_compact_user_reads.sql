-- Keep the lifetime read count on profiles while retaining only a short
-- deduplication ledger. This migration is intentionally idempotent.
alter table public.profiles
  add column if not exists total_reads bigint not null default 0;

update public.profiles as profile
set total_reads = greatest(profile.total_reads, reads.total)
from (
  select user_id, count(*)::bigint as total
  from public.user_reads
  group by user_id
) as reads
where profile.id = reads.user_id;

alter table public.user_reads
  add column if not exists read_on date not null default (timezone('utc', now())::date);

alter table public.user_reads
  drop constraint if exists user_reads_user_id_chapter_slug_key;

drop index if exists public.idx_user_reads_user_chapter_created_at;

create unique index if not exists user_reads_user_chapter_day_key
  on public.user_reads (user_id, chapter_slug, read_on);

create table if not exists public.user_reads_maintenance (
  singleton boolean primary key default true check (singleton),
  last_cleanup date not null default current_date
);

alter table public.user_reads_maintenance enable row level security;

insert into public.user_reads_maintenance (singleton, last_cleanup)
values (true, current_date)
on conflict (singleton) do nothing;

create or replace function public.record_user_read(
  p_user_id uuid,
  p_chapter_slug text,
  p_xp_amount integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  inserted_count integer := 0;
  should_cleanup boolean := false;
begin
  if p_user_id is null or nullif(btrim(p_chapter_slug), '') is null then
    return false;
  end if;

  insert into public.user_reads (user_id, chapter_slug, read_on)
  values (p_user_id, btrim(p_chapter_slug), timezone('utc', now())::date)
  on conflict (user_id, chapter_slug, read_on) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    perform public.increment_xp(p_user_id, p_xp_amount);
    update public.profiles
    set total_reads = total_reads + 1
    where id = p_user_id;
  end if;

  update public.user_reads_maintenance
  set last_cleanup = current_date
  where singleton = true and last_cleanup < current_date
  returning true into should_cleanup;

  if coalesce(should_cleanup, false) then
    delete from public.user_reads
    where read_on < timezone('utc', now())::date - 1;
  end if;

  return inserted_count = 1;
end;
$function$;

revoke all on function public.record_user_read(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.record_user_read(uuid, text, integer) to service_role;

create or replace function public.get_total_read_count()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(sum(total_reads), 0)::bigint from public.profiles;
$function$;

revoke all on function public.get_total_read_count() from public, anon, authenticated;
grant execute on function public.get_total_read_count() to service_role;

revoke all on table public.user_reads_maintenance from public, anon, authenticated;
grant all on table public.user_reads_maintenance to service_role;

-- The lifetime totals are now preserved on profiles. Truncation immediately
-- releases the old ledger and index storage without deleting XP or levels.
do $validation$
declare
  ledger_total bigint;
  preserved_total bigint;
  orphaned_total bigint;
begin
  select count(*)
  into ledger_total
  from public.user_reads as reads
  inner join public.profiles as profile on profile.id = reads.user_id;

  select count(*)
  into orphaned_total
  from public.user_reads as reads
  left join public.profiles as profile on profile.id = reads.user_id
  where profile.id is null;

  select coalesce(sum(total_reads), 0) into preserved_total from public.profiles;
  if preserved_total < ledger_total then
    raise exception 'Total baca belum tersalin (% dari %), pembatalan truncate', preserved_total, ledger_total;
  end if;

  if orphaned_total > 0 then
    raise notice '% catatan baca yatim tidak memiliki profil aktif dan akan dibersihkan', orphaned_total;
  end if;
end;
$validation$;

truncate table public.user_reads;
