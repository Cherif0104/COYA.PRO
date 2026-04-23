-- DAF : politique SELECT sans appel à daf_can_access_request() pour éviter les 403 PostgREST
-- (42501 / permission denied sur l’exécution de fonction ou effets de bord de cache) tout en conservant la même logique métier.

begin;

drop policy if exists daf_service_requests_select on public.daf_service_requests;

create policy daf_service_requests_select on public.daf_service_requests
  for select using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.id = public.drive_current_profile_id()
    )
    and (
      requester_profile_id = public.drive_current_profile_id()
      or assignee_profile_id = public.drive_current_profile_id()
      or public.drive_is_org_admin_profile(public.drive_current_profile_id())
      or (
        assignee_profile_id is null
        and public.daf_profile_can_review(public.drive_current_profile_id())
      )
    )
  );

grant execute on function public.daf_can_access_request(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
