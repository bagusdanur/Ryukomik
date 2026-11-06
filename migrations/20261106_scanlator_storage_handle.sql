-- Prefiks penyimpanan stabil: kalau handle tim diganti, file lama tetap terhitung kuota.
alter table scanlator_profiles add column if not exists storage_handle text;
update scanlator_profiles set storage_handle = handle where storage_handle is null;
alter table scanlator_profiles alter column storage_handle set default null;
