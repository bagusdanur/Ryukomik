update public.user_collections
set visibility = case when is_public then 'public' else 'private' end;
