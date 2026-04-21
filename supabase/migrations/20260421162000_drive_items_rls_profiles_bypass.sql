-- INSERT / UPDATE sur drive_items : le WITH CHECK utilisait « organization_id IN (SELECT … FROM profiles …) ».
-- Si la table profiles a la RLS activée, cette sous-requête est évaluée avec les mêmes droits : elle peut
-- ne retourner aucune ligne → violation RLS à l'insertion (message PostgreSQL traduit côté client).
-- Solution : fonction SECURITY DEFINER (search_path fixe) pour lire profiles sans être bloqué par sa RLS.

begin;

create or replace function public.drive_item_user_belongs_to_org(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.organization_id is not null
      and pr.organization_id = p_organization_id
  );
$$;

grant execute on function public.drive_item_user_belongs_to_org(uuid) to authenticated;

do $$
begin
  if to_regclass('public.drive_items') is null then
    raise notice 'drive_items absent : politiques non modifiées.';
    return;
  end if;

  execute $pol$
    drop policy if exists drive_items_insert on public.drive_items;
    create policy drive_items_insert on public.drive_items
      for insert to authenticated
      with check (public.drive_item_user_belongs_to_org(organization_id));

    drop policy if exists drive_items_update on public.drive_items;
    create policy drive_items_update on public.drive_items
      for update to authenticated
      using (public.drive_item_can_manage(id))
      with check (public.drive_item_user_belongs_to_org(organization_id));
  $pol$;
end;
$$;

notify pgrst, 'reload schema';

commit;
