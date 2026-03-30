begin;

create or replace function public.project_task_assigned_to_actor(p_task jsonb, p_actor_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile_id text;
  v_assignee_id text;
  v_assignee_profile_id text;
  v_assignee_user_id text;
  v_array_match boolean := false;
begin
  select p.id::text
    into v_profile_id
  from public.profiles p
  where p.user_id = p_actor_user_id
  limit 1;

  if jsonb_typeof(p_task->'assigneeIds') = 'array' then
    select exists (
      select 1
      from jsonb_array_elements_text(p_task->'assigneeIds') as aid(val)
      where aid.val in (coalesce(v_profile_id, ''), p_actor_user_id::text)
    )
    into v_array_match;
  end if;

  v_assignee_id := coalesce(p_task->'assignee'->>'id', '');
  v_assignee_profile_id := coalesce(p_task->'assignee'->>'profileId', '');
  v_assignee_user_id := coalesce(p_task->'assignee'->>'userId', '');

  return v_array_match
    or v_assignee_id in (coalesce(v_profile_id, ''), p_actor_user_id::text)
    or v_assignee_profile_id in (coalesce(v_profile_id, ''), p_actor_user_id::text)
    or v_assignee_user_id in (coalesce(v_profile_id, ''), p_actor_user_id::text);
end;
$$;

revoke all on function public.project_task_assigned_to_actor(jsonb, uuid) from public;
grant execute on function public.project_task_assigned_to_actor(jsonb, uuid) to authenticated;

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
  v_new_task jsonb;
  v_old_task jsonb;
  v_task_id text;
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

  for v_new_task in
    select elem
    from jsonb_array_elements(coalesce(new.tasks, '[]'::jsonb)) as elem
  loop
    v_task_id := coalesce(v_new_task->>'id', '');
    if v_task_id = '' then
      continue;
    end if;

    select elem
      into v_old_task
    from jsonb_array_elements(coalesce(old.tasks, '[]'::jsonb)) as elem
    where elem->>'id' = v_task_id
    limit 1;

    if v_old_task is null then
      raise exception 'Modification non autorisée: tâche introuvable dans l''état précédent (%).', v_task_id;
    end if;

    if v_old_task is distinct from v_new_task then
      if not public.project_task_assigned_to_actor(v_new_task, auth.uid()) then
        raise exception 'Modification non autorisée: seules les tâches explicitement assignées peuvent être mises à jour (%).', v_task_id;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

commit;
