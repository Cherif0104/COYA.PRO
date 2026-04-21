-- Drive : collaboration au sein de l'organisation (tout membre peut gérer les items de son org).
-- Avant : seul le créateur ou un admin pouvait update/delete → blocage pour un drive d'équipe.

begin;

create or replace function public.drive_item_can_manage(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = auth.uid()
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
  );
$$;

-- Lecture : tout item de l'organisation (y compris corbeille pour l'onglet Corbeille).
create or replace function public.drive_item_visible_to_reader(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = auth.uid()
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
  );
$$;

-- RLS : les politiques appellent ces fonctions ; le rôle authenticated doit pouvoir les exécuter.
grant execute on function public.drive_item_can_manage(uuid) to authenticated;
grant execute on function public.drive_item_visible_to_reader(uuid) to authenticated;

do $$
begin
  if to_regclass('public.drive_items') is not null then
    execute 'grant select, insert, update, delete on table public.drive_items to authenticated';
    execute 'grant all on table public.drive_items to service_role';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
