begin;

create or replace function public.is_project_management_role(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.role in ('super_administrator','administrator','manager')
  );
$$;

revoke all on function public.is_project_management_role(uuid) from public;
grant execute on function public.is_project_management_role(uuid) to authenticated;

create or replace function public.project_tasks_restricted_fingerprint(p_tasks jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(
      (
        elem
        - 'status'
        - 'completedAt'
        - 'completedById'
        - 'justificationAttachmentIds'
        - 'isFrozen'
        - 'loggedHours'
      )
      order by coalesce(elem->>'id', md5(elem::text))
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) as elem;
$$;

create or replace function public.enforce_project_task_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_management boolean;
  v_old_core jsonb;
  v_new_core jsonb;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  v_is_management := public.is_project_management_role(auth.uid());
  if v_is_management then
    return new;
  end if;

  v_old_core := to_jsonb(old) - 'tasks' - 'updated_at';
  v_new_core := to_jsonb(new) - 'tasks' - 'updated_at';

  if v_old_core is distinct from v_new_core then
    raise exception 'Modification non autorisée: seuls manager/admin/super admin peuvent modifier la structure du projet.';
  end if;

  if public.project_tasks_restricted_fingerprint(old.tasks) is distinct from public.project_tasks_restricted_fingerprint(new.tasks) then
    raise exception 'Modification non autorisée: seuls manager/admin/super admin peuvent créer/supprimer/modifier la structure des tâches.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_projects_task_update_guard on public.projects;
create trigger trg_projects_task_update_guard
before update on public.projects
for each row
execute function public.enforce_project_task_update_guard();

drop policy if exists "Projects insert limited roles" on public.projects;
create policy "Projects insert limited roles"
  on public.projects
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles prof
      where prof.user_id = auth.uid()
        and prof.role in ('super_administrator','administrator','manager')
        and prof.organization_id = projects.organization_id
    )
  );

drop policy if exists "Projects update by creator or privileged roles" on public.projects;
create policy "Projects update in organization"
  on public.projects
  for update
  to authenticated
  using (
    organization_id = (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
    )
  )
  with check (
    organization_id = (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
    )
  );

drop policy if exists "Projects delete by creator or privileged roles" on public.projects;
create policy "Projects delete limited roles"
  on public.projects
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles prof
      where prof.user_id = auth.uid()
        and prof.role in ('super_administrator','administrator','manager')
        and prof.organization_id = projects.organization_id
    )
  );

commit;
