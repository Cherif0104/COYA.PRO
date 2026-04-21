-- DAF : workflows élargis (documents remis, réponses d'information, circuit signature),
-- fil de messages, pièces jointes, bucket storage dédié.

begin;

-- ---------------------------------------------------------------------------
-- Colonnes demande : type de workflow + phase signature
-- ---------------------------------------------------------------------------
alter table public.daf_service_requests
  add column if not exists request_kind text not null default 'general';

alter table public.daf_service_requests
  drop constraint if exists daf_service_requests_request_kind_check;

alter table public.daf_service_requests
  add constraint daf_service_requests_request_kind_check
  check (request_kind in (
    'general',
    'document_delivery',
    'information',
    'signature_workflow'
  ));

alter table public.daf_service_requests
  add column if not exists signature_phase text not null default 'none';

alter table public.daf_service_requests
  drop constraint if exists daf_service_requests_signature_phase_check;

alter table public.daf_service_requests
  add constraint daf_service_requests_signature_phase_check
  check (signature_phase in (
    'none',
    'original_provided',
    'sent_for_signature',
    'signed_returned'
  ));

alter table public.daf_service_requests
  drop constraint if exists daf_service_requests_status_check;

alter table public.daf_service_requests
  add constraint daf_service_requests_status_check
  check (status in (
    'draft',
    'submitted',
    'in_review',
    'awaiting_requester',
    'pending_external_signature',
    'approved',
    'rejected',
    'fulfilled',
    'cancelled'
  ));

-- ---------------------------------------------------------------------------
-- Accès demande (lecture parent pour RLS enfants)
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
        or public.daf_profile_can_review(pr.id)
      )
  );
$$;

grant execute on function public.daf_can_access_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Messages (commentaires, réponses DAF avec texte + lien optionnel)
-- ---------------------------------------------------------------------------
create table if not exists public.daf_service_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.daf_service_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  link_url text,
  visibility text not null default 'public' check (visibility in ('public', 'daf_internal')),
  created_at timestamptz not null default now()
);

create index if not exists idx_daf_messages_request on public.daf_service_request_messages(request_id, created_at desc);

alter table public.daf_service_request_messages enable row level security;

drop policy if exists daf_messages_select on public.daf_service_request_messages;
create policy daf_messages_select on public.daf_service_request_messages
  for select using (
    public.daf_can_access_request(request_id)
    and (
      visibility = 'public'
      or public.daf_profile_can_review(public.drive_current_profile_id())
    )
  );

drop policy if exists daf_messages_insert on public.daf_service_request_messages;
create policy daf_messages_insert on public.daf_service_request_messages
  for insert with check (
    author_profile_id = public.drive_current_profile_id()
    and public.daf_can_access_request(request_id)
    and organization_id in (
      select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id()
    )
    and (
      visibility = 'public'
      or (
        visibility = 'daf_internal'
        and public.daf_profile_can_review(public.drive_current_profile_id())
      )
    )
  );

grant select, insert on table public.daf_service_request_messages to authenticated;
grant all on table public.daf_service_request_messages to service_role;

-- ---------------------------------------------------------------------------
-- Pièces jointes (métadonnées + chemin storage)
-- ---------------------------------------------------------------------------
create table if not exists public.daf_service_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.daf_service_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  attachment_kind text not null check (attachment_kind in (
    'supporting',
    'daf_deliverable',
    'info_answer',
    'signature_original',
    'signature_signed'
  )),
  storage_bucket text not null default 'daf-service-files',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists idx_daf_attach_request on public.daf_service_request_attachments(request_id);

alter table public.daf_service_request_attachments enable row level security;

drop policy if exists daf_attachments_select on public.daf_service_request_attachments;
create policy daf_attachments_select on public.daf_service_request_attachments
  for select using (public.daf_can_access_request(request_id));

drop policy if exists daf_attachments_insert on public.daf_service_request_attachments;
create policy daf_attachments_insert on public.daf_service_request_attachments
  for insert with check (
    uploaded_by_profile_id = public.drive_current_profile_id()
    and public.daf_can_access_request(request_id)
    and organization_id in (
      select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id()
    )
    and exists (
      select 1 from public.daf_service_requests r
      where r.id = request_id
        and (
          (
            r.requester_profile_id = public.drive_current_profile_id()
            and attachment_kind in ('supporting', 'signature_original')
            and r.status in ('draft', 'submitted', 'awaiting_requester')
          )
          or (
            public.daf_profile_can_review(public.drive_current_profile_id())
            and attachment_kind in (
              'daf_deliverable',
              'info_answer',
              'signature_original',
              'signature_signed'
            )
            and r.status in (
              'submitted',
              'in_review',
              'awaiting_requester',
              'pending_external_signature',
              'approved',
              'fulfilled'
            )
          )
        )
    )
  );

drop policy if exists daf_attachments_delete on public.daf_service_request_attachments;
create policy daf_attachments_delete on public.daf_service_request_attachments
  for delete using (
    exists (
      select 1 from public.daf_service_requests r
      where r.id = request_id
        and (
          (
            r.requester_profile_id = public.drive_current_profile_id()
            and r.status = 'draft'
            and uploaded_by_profile_id = public.drive_current_profile_id()
          )
          or public.daf_profile_can_review(public.drive_current_profile_id())
        )
    )
  );

grant select, insert, delete on table public.daf_service_request_attachments to authenticated;
grant all on table public.daf_service_request_attachments to service_role;

-- ---------------------------------------------------------------------------
-- Demandes : politique update demandeur (réponse après sollicitation DAF)
-- ---------------------------------------------------------------------------
drop policy if exists daf_service_requests_update_requester_followup on public.daf_service_requests;

create policy daf_service_requests_update_requester_followup on public.daf_service_requests
  for update to authenticated
  using (
    requester_profile_id = public.drive_current_profile_id()
    and status = 'awaiting_requester'
  )
  with check (
    requester_profile_id = public.drive_current_profile_id()
    and status in ('in_review', 'awaiting_requester', 'cancelled')
    and organization_id in (
      select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Bucket storage (privé)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('daf-service-files', 'daf-service-files', false)
on conflict (id) do nothing;

create or replace function public.daf_storage_select_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  p1 text := split_part(p_name, '/', 1);
  p2 text := split_part(p_name, '/', 2);
  v_org uuid;
  v_req uuid;
  pid uuid := public.drive_current_profile_id();
begin
  if pid is null or p1 = '' or p2 = '' then
    return false;
  end if;
  begin
    v_org := p1::uuid;
    v_req := p2::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.profiles pr
    where pr.id = pid
      and pr.organization_id = v_org
  )
  and public.daf_can_access_request(v_req);
end;
$$;

create or replace function public.daf_storage_insert_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.daf_storage_select_allowed(p_name);
$$;

grant execute on function public.daf_storage_select_allowed(text) to authenticated;
grant execute on function public.daf_storage_insert_allowed(text) to authenticated;

drop policy if exists daf_service_files_select on storage.objects;
create policy daf_service_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'daf-service-files'
    and public.daf_storage_select_allowed(name)
  );

drop policy if exists daf_service_files_insert on storage.objects;
create policy daf_service_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'daf-service-files'
    and public.daf_storage_insert_allowed(name)
  );

drop policy if exists daf_service_files_delete on storage.objects;
create policy daf_service_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'daf-service-files'
    and public.daf_storage_select_allowed(name)
  );

notify pgrst, 'reload schema';

commit;
