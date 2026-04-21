-- PostgREST / pooler : auth.uid() peut être NULL dans certains contextes ; le claim JWT « sub » reste fiable.
-- search_path inclut « auth » pour les appels auth.uid() (recommandation Supabase pour SECURITY DEFINER).

begin;

create or replace function public.drive_item_user_belongs_to_org(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
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
    select 1
    from public.profiles pr
    cross join uid u
    where u.id is not null
      and pr.user_id = u.id
      and pr.organization_id is not null
      and pr.organization_id = p_organization_id
  );
$$;

create or replace function public.drive_item_can_manage(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = coalesce(
      auth.uid(),
      case
        when nullif(trim(current_setting('request.jwt.claim.sub', true)), '') is null then null::uuid
        else nullif(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
      end
    )
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
  );
$$;

create or replace function public.drive_item_visible_to_reader(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = coalesce(
      auth.uid(),
      case
        when nullif(trim(current_setting('request.jwt.claim.sub', true)), '') is null then null::uuid
        else nullif(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
      end
    )
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
  );
$$;

grant execute on function public.drive_item_user_belongs_to_org(uuid) to authenticated;
grant execute on function public.drive_item_can_manage(uuid) to authenticated;
grant execute on function public.drive_item_visible_to_reader(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
