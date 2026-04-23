-- DOCS SENEGEL : visibilité des dossiers (private / org_public)

begin;

alter table public.drive_items
  add column if not exists visibility text not null default 'private';

alter table public.drive_items
  drop constraint if exists drive_items_visibility_check;

alter table public.drive_items
  add constraint drive_items_visibility_check
  check (
    (item_type <> 'folder' and visibility = 'private')
    or (item_type = 'folder' and visibility in ('private', 'org_public'))
  );

-- Sécurise les données existantes
update public.drive_items
set visibility = 'private'
where visibility is null;

-- RLS : lecture autorisée si dossier org_public dans la même org
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
      select 1 from public.drive_items f3
      where f3.id = p_folder_id and f3.item_type = 'folder' and f3.visibility = 'org_public'
    ) then true
    when exists (
      select 1 from public.drive_item_acl a
      where a.drive_item_id = p_folder_id and a.profile_id = p_profile_id
    ) then true
    else false
  end;
$$;

grant execute on function public.drive_folder_can_view(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

