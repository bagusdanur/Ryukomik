-- Batch chapter reads to reduce PostgREST/API Gateway log ingestion.
create or replace function public.record_user_reads_batch(p_user_id uuid,p_chapter_slugs text[],p_xp_amount integer default 5)
returns table (recorded_count integer,xp_added integer)
language plpgsql security invoker set search_path = public, pg_temp
as $function$
declare
  inserted_count integer := 0;
  safe_xp integer := greatest(0,least(coalesce(p_xp_amount,0),100));
  should_cleanup boolean := false;
begin
  if p_user_id is null or coalesce(array_length(p_chapter_slugs,1),0)=0 then return query select 0,0; return; end if;
  with normalized as (
    select distinct left(btrim(slug),500) chapter_slug from unnest(p_chapter_slugs[1:20]) slug where nullif(btrim(slug),'') is not null
  ), inserted as (
    insert into public.user_reads(user_id,chapter_slug,read_on)
    select p_user_id,chapter_slug,timezone('utc',now())::date from normalized
    on conflict(user_id,chapter_slug,read_on) do nothing returning 1
  ) select count(*)::integer into inserted_count from inserted;
  if inserted_count>0 then
    perform public.increment_xp(p_user_id,inserted_count*safe_xp);
    update public.profiles set total_reads=total_reads+inserted_count where id=p_user_id;
  end if;
  update public.user_reads_maintenance set last_cleanup=current_date
    where singleton=true and last_cleanup<current_date returning true into should_cleanup;
  if coalesce(should_cleanup,false) then delete from public.user_reads where read_on<timezone('utc',now())::date-1; end if;
  return query select inserted_count,inserted_count*safe_xp;
end;
$function$;
revoke all on function public.record_user_reads_batch(uuid,text[],integer) from public,anon,authenticated;
grant execute on function public.record_user_reads_batch(uuid,text[],integer) to service_role;
