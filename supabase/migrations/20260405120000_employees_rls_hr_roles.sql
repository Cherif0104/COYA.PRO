-- RH / salariés : aligner RLS avec RESOURCE_MANAGEMENT_ROLES (supervisor, trainer)
-- + alias historiques + cohérence organisation (profil cible = même org que la fiche)

begin;

drop policy if exists "employees_insert_org_admin" on public.employees;
create policy "employees_insert_org_admin" on public.employees
  for insert
  with check (
    organization_id in (
      select organization_id from public.profiles where user_id = auth.uid()
    )
    and exists (
      select 1
      from public.profiles p_actor
      where p_actor.user_id = auth.uid()
        and coalesce(p_actor.role, '') in (
          'super_administrator',
          'administrator',
          'manager',
          'supervisor',
          'trainer',
          'super_admin',
          'admin'
        )
    )
    and exists (
      select 1
      from public.profiles p_target
      where p_target.id = profile_id
        and p_target.organization_id = organization_id
    )
  );

drop policy if exists "employees_update_own_or_admin" on public.employees;
create policy "employees_update_own_or_admin" on public.employees
  for update
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1
      from public.profiles p_actor
      where p_actor.user_id = auth.uid()
        and coalesce(p_actor.role, '') in (
          'super_administrator',
          'administrator',
          'manager',
          'supervisor',
          'trainer',
          'super_admin',
          'admin'
        )
    )
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1
      from public.profiles p_actor
      where p_actor.user_id = auth.uid()
        and coalesce(p_actor.role, '') in (
          'super_administrator',
          'administrator',
          'manager',
          'supervisor',
          'trainer',
          'super_admin',
          'admin'
        )
    )
  );

commit;
