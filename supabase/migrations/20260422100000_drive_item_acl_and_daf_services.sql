-- DOCS SENEGEL : ACL par dossier (propriétaire + liste viewer/editor). Fichiers : visibilité = dossier parent.
-- Moyens généraux / DAF : demandes internes (table daf_service_requests + RLS).
-- Storage drive-files : lecture limitée aux fichiers visibles via drive_items.

begin;

-- ---------------------------------------------------------------------------
-- drive_items : propriétaire explicite du dossier
-- ---------------------------------------------------------------------------
alter table public.drive_items
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null;

update public.drive_items di
set owner_profile_id = coalesce(di.owner_profile_id, di.created_by_id)
where di.item_type = 'folder';

update public.drive_items di
set owner_profile_id = (
  select p.id from public.profiles p
  where p.organization_id = di.organization_id
  order by case p.role when 'super_administrator' then 1 when 'administrator' then 2 else 3 end
  limit 1
)
where di.item_type = 'folder' and di.owner_profile_id is null;

alter table public.drive_items
  drop constraint if exists drive_items_folder_owner_required;

alter table public.drive_items
  add constraint drive_items_folder_owner_required
  check (item_type <> 'folder' or owner_profile_id is not null);

create index if not exists idx_drive_items_owner on public.drive_items(owner_profile_id);

-- ---------------------------------------------------------------------------
-- ACL (uniquement pour des lignes item_type = 'folder')
-- ---------------------------------------------------------------------------
create table if not exists public.drive_item_acl (
  drive_item_id uuid not null references public.drive_items(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (drive_item_id, profile_id)
);

create index if not exists idx_drive_item_acl_profile on public.drive_item_acl(profile_id);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists drive_item_acl_set_updated_at on public.drive_item_acl;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonctions RLS (SECURITY DEFINER, JWT + auth.uid)
-- ---------------------------------------------------------------------------
create or replace function public.drive_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id
  from public.profiles p
  where p.user_id = coalesce(
    auth.uid(),
    case
      when nullif(trim(current_setting('request.jwt.claim.sub', true)), '') is null then null::uuid
      else nullif(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
    end
  )
  limit 1;
$$;

create or replace function public.drive_is_org_admin_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = p_profile_id
      and pr.role in ('super_administrator', 'administrator')
  );
$$;

create or replace function public.drive_item_acl_folder_id(p_item_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select case (select di.item_type from public.drive_items di where di.id = p_item_id)
    when 'folder' then p_item_id
    else (select di2.parent_id from public.drive_items di2 where di2.id = p_item_id)
  end;
$$;

create or replace function public.drive_folder_can_view(p_folder_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when p_folder_id is null or p_profile_id is null then false
    when not exists (
      select 1 from public.drive_items f
      join public.profiles pr on pr.id = p_profile_id
      where f.id = p_folder_id and f.item_type = 'folder' and f.organization_id = pr.organization_id
    ) then false
    when public.drive_is_org_admin_profile(p_profile_id) then true
    when exists (select 1 from public.drive_items f2 where f2.id = p_folder_id and f2.owner_profile_id = p_profile_id) then true
    when exists (
      select 1 from public.drive_item_acl a
      where a.drive_item_id = p_folder_id and a.profile_id = p_profile_id
    ) then true
    else false
  end;
$$;

create or replace function public.drive_folder_can_edit(p_folder_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when p_folder_id is null or p_profile_id is null then false
    when not exists (
      select 1 from public.drive_items f
      join public.profiles pr on pr.id = p_profile_id
      where f.id = p_folder_id and f.item_type = 'folder' and f.organization_id = pr.organization_id
    ) then false
    when public.drive_is_org_admin_profile(p_profile_id) then true
    when exists (select 1 from public.drive_items f2 where f2.id = p_folder_id and f2.owner_profile_id = p_profile_id) then true
    when exists (
      select 1 from public.drive_item_acl a
      where a.drive_item_id = p_folder_id and a.profile_id = p_profile_id and a.permission = 'editor'
    ) then true
    else false
  end;
$$;

create or replace function public.drive_item_visible_to_reader(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.drive_items it where it.id = p_item_id)
    and exists (
      select 1 from public.drive_items it2
      join public.profiles pr on pr.id = public.drive_current_profile_id()
      where it2.id = p_item_id and it2.organization_id = pr.organization_id
    )
    and (
      public.drive_is_org_admin_profile(public.drive_current_profile_id())
      or public.drive_folder_can_view(public.drive_item_acl_folder_id(p_item_id), public.drive_current_profile_id())
    );
$$;

create or replace function public.drive_item_can_manage(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when public.drive_current_profile_id() is null then false
    when public.drive_is_org_admin_profile(public.drive_current_profile_id())
      and exists (
        select 1 from public.drive_items it
        join public.profiles pr on pr.id = public.drive_current_profile_id()
        where it.id = p_item_id and it.organization_id = pr.organization_id
      ) then true
    when (select item_type from public.drive_items where id = p_item_id) = 'folder'
      then public.drive_folder_can_edit(p_item_id, public.drive_current_profile_id())
    else coalesce(
      (select public.drive_folder_can_edit(di.parent_id, public.drive_current_profile_id())
       from public.drive_items di where di.id = p_item_id and di.parent_id is not null),
      false
    )
  end;
$$;

create or replace function public.drive_item_user_belongs_to_org(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  with uid as (
    select coalesce(
      auth.uid(),
      case
        when nullif(trim(current_setting('request.jwt.claim.sub', true)), '') is null then null::uuid
        else nullif(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
      end
    ) as id
  )
  select exists (
    select 1 from public.profiles pr cross join uid u
    where u.id is not null
      and pr.user_id = u.id
      and pr.organization_id is not null
      and pr.organization_id = p_organization_id
  );
$$;

create or replace function public.drive_item_insert_allowed(
  p_organization_id uuid,
  p_item_type text,
  p_parent_id uuid,
  p_owner_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.drive_item_user_belongs_to_org(p_organization_id)
    and public.drive_current_profile_id() is not null
    and case
      when p_item_type = 'folder' then
        p_owner_profile_id = public.drive_current_profile_id()
        and (p_parent_id is null or public.drive_folder_can_edit(p_parent_id, public.drive_current_profile_id()))
      when p_item_type in ('file', 'doc') then
        p_parent_id is not null
        and exists (select 1 from public.drive_items p where p.id = p_parent_id and p.item_type = 'folder')
        and public.drive_folder_can_edit(p_parent_id, public.drive_current_profile_id())
      else false
    end;
$$;

create or replace function public.drive_acl_administers_folder(p_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.drive_items f
    where f.id = p_folder_id and f.item_type = 'folder'
  )
  and public.drive_folder_can_edit(p_folder_id, public.drive_current_profile_id());
$$;

create or replace function public.drive_item_storage_select_allowed(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.drive_items di
    where di.storage_bucket = 'drive-files'
      and di.storage_path = p_object_name
      and di.item_type in ('file', 'doc')
      and public.drive_item_visible_to_reader(di.id)
  );
$$;

grant execute on function public.drive_current_profile_id() to authenticated;
grant execute on function public.drive_is_org_admin_profile(uuid) to authenticated;
grant execute on function public.drive_item_acl_folder_id(uuid) to authenticated;
grant execute on function public.drive_folder_can_view(uuid, uuid) to authenticated;
grant execute on function public.drive_folder_can_edit(uuid, uuid) to authenticated;
grant execute on function public.drive_item_visible_to_reader(uuid) to authenticated;
grant execute on function public.drive_item_can_manage(uuid) to authenticated;
grant execute on function public.drive_item_user_belongs_to_org(uuid) to authenticated;
grant execute on function public.drive_item_insert_allowed(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.drive_acl_administers_folder(uuid) to authenticated;
grant execute on function public.drive_item_storage_select_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- drive_items : politiques
-- ---------------------------------------------------------------------------
drop policy if exists drive_items_insert on public.drive_items;
drop policy if exists drive_items_update on public.drive_items;
drop policy if exists drive_items_select on public.drive_items;
drop policy if exists drive_items_delete on public.drive_items;

create policy drive_items_select on public.drive_items
  for select using (public.drive_item_visible_to_reader(id));

create policy drive_items_insert on public.drive_items
  for insert with check (
    public.drive_item_insert_allowed(organization_id, item_type, parent_id, owner_profile_id)
  );

create policy drive_items_update on public.drive_items
  for update
  using (public.drive_item_can_manage(id))
  with check (
    public.drive_item_user_belongs_to_org(organization_id)
    and (
      parent_id is null
      or exists (select 1 from public.drive_items p where p.id = parent_id and p.item_type = 'folder')
    )
    and (
      parent_id is null
      or public.drive_folder_can_edit(parent_id, public.drive_current_profile_id())
      or public.drive_is_org_admin_profile(public.drive_current_profile_id())
    )
  );

create policy drive_items_delete on public.drive_items
  for delete using (public.drive_item_can_manage(id));

-- ---------------------------------------------------------------------------
-- drive_item_acl : politiques
-- ---------------------------------------------------------------------------
alter table public.drive_item_acl enable row level security;

drop policy if exists drive_item_acl_select on public.drive_item_acl;
drop policy if exists drive_item_acl_insert on public.drive_item_acl;
drop policy if exists drive_item_acl_update on public.drive_item_acl;
drop policy if exists drive_item_acl_delete on public.drive_item_acl;

create policy drive_item_acl_select on public.drive_item_acl
  for select using (public.drive_acl_administers_folder(drive_item_id));

create policy drive_item_acl_insert on public.drive_item_acl
  for insert with check (
    public.drive_acl_administers_folder(drive_item_id)
    and exists (
      select 1 from public.drive_items f
      join public.profiles pr on pr.id = profile_id
      where f.id = drive_item_id and f.organization_id = pr.organization_id
    )
  );

create policy drive_item_acl_update on public.drive_item_acl
  for update using (public.drive_acl_administers_folder(drive_item_id));

create policy drive_item_acl_delete on public.drive_item_acl
  for delete using (public.drive_acl_administers_folder(drive_item_id));

grant select, insert, update, delete on table public.drive_item_acl to authenticated;
grant all on table public.drive_item_acl to service_role;

-- ---------------------------------------------------------------------------
-- Storage : lecture restreinte aux fichiers drive visibles
-- ---------------------------------------------------------------------------
drop policy if exists "drive_files_select_authenticated" on storage.objects;
create policy "drive_files_select_authenticated"
on storage.objects for select to authenticated
using (
  bucket_id = 'drive-files'
  and public.drive_item_storage_select_allowed(name)
);

-- ---------------------------------------------------------------------------
-- DAF / moyens généraux
-- ---------------------------------------------------------------------------
create table if not exists public.daf_service_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'other' check (category in (
    'supplies', 'logistics', 'it_misc', 'vehicle', 'furniture', 'travel', 'other'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'in_review', 'approved', 'rejected', 'fulfilled'
  )),
  daf_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daf_requests_org on public.daf_service_requests(organization_id, created_at desc);
create index if not exists idx_daf_requests_requester on public.daf_service_requests(requester_profile_id);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists daf_service_requests_set_updated_at on public.daf_service_requests;
    create trigger daf_service_requests_set_updated_at
      before update on public.daf_service_requests
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.daf_profile_can_review(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = p_profile_id
      and pr.role in ('super_administrator', 'administrator', 'manager')
  );
$$;

grant execute on function public.daf_profile_can_review(uuid) to authenticated;

alter table public.daf_service_requests enable row level security;

drop policy if exists daf_service_requests_select on public.daf_service_requests;
create policy daf_service_requests_select on public.daf_service_requests
  for select using (
    organization_id in (select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id())
    and (
      requester_profile_id = public.drive_current_profile_id()
      or public.daf_profile_can_review(public.drive_current_profile_id())
    )
  );

drop policy if exists daf_service_requests_insert on public.daf_service_requests;
create policy daf_service_requests_insert on public.daf_service_requests
  for insert with check (
    requester_profile_id = public.drive_current_profile_id()
    and organization_id in (select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id())
    and status in ('draft', 'submitted')
  );

drop policy if exists daf_service_requests_update on public.daf_service_requests;
create policy daf_service_requests_update on public.daf_service_requests
  for update using (
    organization_id in (select p.organization_id from public.profiles p where p.id = public.drive_current_profile_id())
    and (
      (requester_profile_id = public.drive_current_profile_id() and status = 'draft')
      or public.daf_profile_can_review(public.drive_current_profile_id())
    )
  );

drop policy if exists daf_service_requests_delete on public.daf_service_requests;
create policy daf_service_requests_delete on public.daf_service_requests
  for delete using (
    requester_profile_id = public.drive_current_profile_id()
    and status = 'draft'
  );

grant select, insert, update, delete on table public.daf_service_requests to authenticated;
grant all on table public.daf_service_requests to service_role;

notify pgrst, 'reload schema';

commit;
