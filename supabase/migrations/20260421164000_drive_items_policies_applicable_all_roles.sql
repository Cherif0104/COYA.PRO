-- Les politiques « TO authenticated » n’appliquent pas aux requêtes dont le rôle effectif n’est pas exactement le rôle PG « authenticated »
-- (effets de bord PostgREST / claims). Sans clause TO, la politique s’applique à tous les rôles ; le WITH CHECK / USING
-- reste restrictif grâce aux fonctions SECURITY DEFINER (sans JWT valide → faux).

begin;

drop policy if exists drive_items_insert on public.drive_items;
create policy drive_items_insert on public.drive_items
  for insert
  with check (public.drive_item_user_belongs_to_org(organization_id));

drop policy if exists drive_items_update on public.drive_items;
create policy drive_items_update on public.drive_items
  for update
  using (public.drive_item_can_manage(id))
  with check (public.drive_item_user_belongs_to_org(organization_id));

drop policy if exists drive_items_select on public.drive_items;
create policy drive_items_select on public.drive_items
  for select
  using (public.drive_item_visible_to_reader(id));

drop policy if exists drive_items_delete on public.drive_items;
create policy drive_items_delete on public.drive_items
  for delete
  using (public.drive_item_can_manage(id));

notify pgrst, 'reload schema';

commit;
