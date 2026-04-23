-- DAF : assignation stricte (demandeur + DAF assigné), file des non-assignées, notifications.

begin;

-- ---------------------------------------------------------------------------
-- Assignation
-- ---------------------------------------------------------------------------
alter table public.daf_service_requests
  add column if not exists assignee_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_daf_requests_assignee on public.daf_service_requests(assignee_profile_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Accès demande : demandeur + assigné + admins, et reviewers voient les non-assignées pour les prendre
-- ---------------------------------------------------------------------------
create or replace function public.daf_can_access_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.daf_service_requests r
    join public.profiles pr on pr.id = public.drive_current_profile_id()
    where r.id = p_request_id
      and r.organization_id = pr.organization_id
      and (
        r.requester_profile_id = pr.id
        or r.assignee_profile_id = pr.id
        or public.drive_is_org_admin_profile(pr.id)
        or (r.assignee_profile_id is null and public.daf_profile_can_review(pr.id))
      )
  );
$$;

grant execute on function public.daf_can_access_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Politiques DAF requests : remplace la SELECT par une version stricte
-- ---------------------------------------------------------------------------
drop policy if exists daf_service_requests_select on public.daf_service_requests;
create policy daf_service_requests_select on public.daf_service_requests
  for select using (public.daf_can_access_request(id));

-- Update : reviewers peuvent assigner / changer statut; demandeur peut modifier brouillon ou répondre quand sollicité (déjà présent)
drop policy if exists daf_service_requests_update on public.daf_service_requests;
create policy daf_service_requests_update on public.daf_service_requests
  for update using (
    organization_id in (select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id())
    and (
      (requester_profile_id = public.drive_current_profile_id() and status = 'draft')
      or public.daf_profile_can_review(public.drive_current_profile_id())
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications (utilise la table public.notifications existante)
-- ---------------------------------------------------------------------------
create or replace function public.daf_notify(
  p_target_profile_id uuid,
  p_type text,
  p_action text,
  p_title text,
  p_message text,
  p_entity_id uuid,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_target_profile_id is null then
    return;
  end if;
  insert into public.notifications(
    user_id, message, type, module, action, title,
    entity_type, entity_id, entity_title, created_by, created_by_name, metadata, read, created_at
  )
  values (
    p_target_profile_id,
    coalesce(p_message, ''),
    coalesce(p_type, 'info'),
    'knowledge',
    coalesce(p_action, 'updated'),
    coalesce(p_title, 'DAF'),
    'daf_service_request',
    p_entity_id,
    null,
    public.drive_current_profile_id(),
    null,
    p_metadata,
    false,
    now()
  );
exception when undefined_table then
  -- Si la table notifications n'existe pas, on ne bloque pas la transaction DAF.
  null;
end;
$$;

grant execute on function public.daf_notify(uuid, text, text, text, text, uuid, jsonb) to authenticated;

create or replace function public.daf_notify_reviewers_new_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    join public.daf_service_requests d on d.organization_id = p.organization_id
    where d.id = p_request_id
      and p.role in ('super_administrator', 'administrator', 'manager')
  loop
    perform public.daf_notify(
      r.id,
      'info',
      'submitted',
      'Nouvelle demande DAF',
      'Une nouvelle demande a été soumise et attend une assignation.',
      p_request_id,
      jsonb_build_object('view', 'daf_services')
    );
  end loop;
end;
$$;

grant execute on function public.daf_notify_reviewers_new_request(uuid) to authenticated;

-- Trigger: nouvelle demande soumise => notifier reviewers (file)
create or replace function public.daf_requests_notify_new()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.daf_notify_reviewers_new_request(new.id);
  return new;
end;
$$;

drop trigger if exists daf_requests_notify_new on public.daf_service_requests;
create trigger daf_requests_notify_new
  after insert on public.daf_service_requests
  for each row
  when (new.status = 'submitted')
  execute function public.daf_requests_notify_new();

-- Trigger: assignation / changement statut => notifier demandeur et/ou assigné
create or replace function public.daf_requests_notify_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.assignee_profile_id is distinct from old.assignee_profile_id then
    if new.assignee_profile_id is not null then
      perform public.daf_notify(
        new.assignee_profile_id,
        'info',
        'assigned',
        'Demande DAF assignée',
        'Une demande vous a été assignée.',
        new.id,
        jsonb_build_object('view', 'daf_services')
      );
    end if;
    perform public.daf_notify(
      new.requester_profile_id,
      'info',
      'updated',
      'Suivi demande DAF',
      'Votre demande a été prise en charge (assignation).',
      new.id,
      jsonb_build_object('view', 'daf_services')
    );
  end if;

  if new.status is distinct from old.status then
    perform public.daf_notify(
      new.requester_profile_id,
      case when new.status in ('rejected') then 'error' when new.status in ('fulfilled','approved') then 'success' else 'info' end,
      'updated',
      'Statut demande DAF',
      'Le statut de votre demande a changé.',
      new.id,
      jsonb_build_object('status', new.status, 'view', 'daf_services')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists daf_requests_notify_update on public.daf_service_requests;
create trigger daf_requests_notify_update
  after update on public.daf_service_requests
  for each row
  when (new.status is distinct from old.status or new.assignee_profile_id is distinct from old.assignee_profile_id)
  execute function public.daf_requests_notify_update();

-- Trigger: nouveau message public => notifier l'autre partie (demandeur <-> assigné)
create or replace function public.daf_messages_notify_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  req record;
begin
  if new.visibility <> 'public' then
    return new;
  end if;
  select requester_profile_id, assignee_profile_id into req
  from public.daf_service_requests
  where id = new.request_id;

  if req.requester_profile_id is null then
    return new;
  end if;

  -- Si le demandeur écrit, notifier l'assigné (sinon la file des reviewers)
  if new.author_profile_id = req.requester_profile_id then
    if req.assignee_profile_id is not null then
      perform public.daf_notify(req.assignee_profile_id, 'info', 'updated', 'Message demande DAF', 'Nouveau message du demandeur.', new.request_id, null);
    else
      perform public.daf_notify_reviewers_new_request(new.request_id);
    end if;
  else
    -- sinon notifier le demandeur
    perform public.daf_notify(req.requester_profile_id, 'info', 'updated', 'Message DAF', 'Nouvelle réponse sur votre demande.', new.request_id, null);
  end if;

  return new;
end;
$$;

drop trigger if exists daf_messages_notify_insert on public.daf_service_request_messages;
create trigger daf_messages_notify_insert
  after insert on public.daf_service_request_messages
  for each row
  execute function public.daf_messages_notify_insert();

notify pgrst, 'reload schema';

commit;

