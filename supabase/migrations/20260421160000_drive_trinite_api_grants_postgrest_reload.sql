-- Corrige les symptômes fréquents côté client :
-- - 404 sur trinite_* : tables créées mais cache PostgREST pas rechargé (PGRST205 / "schema cache").
-- - 403 sur drive_items : GRANT ou EXECUTE sur les fonctions RLS manquants après import / restore.

begin;

notify pgrst, 'reload schema';

do $$
begin
  if to_regclass('public.drive_items') is not null then
    execute 'grant select, insert, update, delete on table public.drive_items to authenticated';
    execute 'grant all on table public.drive_items to service_role';
  end if;
  if to_regprocedure('public.drive_item_can_manage(uuid)') is not null then
    execute 'grant execute on function public.drive_item_can_manage(uuid) to authenticated';
  end if;
  if to_regprocedure('public.drive_item_visible_to_reader(uuid)') is not null then
    execute 'grant execute on function public.drive_item_visible_to_reader(uuid) to authenticated';
  end if;
  if to_regclass('public.trinite_self_notes') is not null then
    execute 'grant select, insert, update, delete on table public.trinite_self_notes to authenticated';
    execute 'grant all on table public.trinite_self_notes to service_role';
  end if;
  if to_regclass('public.trinite_manager_reviews') is not null then
    execute 'grant select, insert, update, delete on table public.trinite_manager_reviews to authenticated';
    execute 'grant all on table public.trinite_manager_reviews to service_role';
  end if;
end;
$$;

commit;
