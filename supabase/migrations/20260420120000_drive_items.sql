-- Drive (type Google Drive) : dossiers + fichiers dans Storage, multi-tenant par organisation.
-- MVP: arborescence, listing, upload, corbeille (trashed_at), lecture org, gestion créateur/admin.

begin;

-- Table des items Drive
create table if not exists public.drive_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.drive_items(id) on delete cascade,
  item_type text not null check (item_type in ('folder','file','doc')),
  name text not null,
  description text,
  -- Pour les fichiers
  mime_type text,
  size_bytes bigint,
  storage_bucket text,
  storage_path text,
  checksum text,
  -- Visibilité simple (partages fins à venir)
  is_public boolean not null default false,
  created_by_id uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trashed_at timestamptz
);

create index if not exists idx_drive_items_org_parent on public.drive_items(organization_id, parent_id);
create index if not exists idx_drive_items_org_trashed on public.drive_items(organization_id, trashed_at);
create index if not exists idx_drive_items_org_type on public.drive_items(organization_id, item_type);

-- Updated_at trigger (utilise la fonction existante si présente)
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists drive_items_set_updated_at on public.drive_items;
    create trigger drive_items_set_updated_at
      before update on public.drive_items
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

-- Fonctions RLS (évite politiques circulaires)
create or replace function public.drive_item_can_manage(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = auth.uid()
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
      and (
        i.created_by_id = pr.id
        or pr.role in ('super_administrator', 'administrator')
      )
  );
$$;

create or replace function public.drive_item_visible_to_reader(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.drive_items i
    join public.profiles pr on pr.user_id = auth.uid()
    where i.id = p_item_id
      and i.organization_id = pr.organization_id
      and (
        i.trashed_at is null
      )
  );
$$;

revoke all on function public.drive_item_can_manage(uuid) from public;
grant execute on function public.drive_item_can_manage(uuid) to authenticated;
revoke all on function public.drive_item_visible_to_reader(uuid) from public;
grant execute on function public.drive_item_visible_to_reader(uuid) to authenticated;

alter table public.drive_items enable row level security;

drop policy if exists drive_items_select on public.drive_items;
create policy drive_items_select
  on public.drive_items for select to authenticated
  using (public.drive_item_visible_to_reader(id));

drop policy if exists drive_items_insert on public.drive_items;
create policy drive_items_insert
  on public.drive_items for insert to authenticated
  with check (
    organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  );

drop policy if exists drive_items_update on public.drive_items;
create policy drive_items_update
  on public.drive_items for update to authenticated
  using (public.drive_item_can_manage(id))
  with check (
    organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  );

drop policy if exists drive_items_delete on public.drive_items;
create policy drive_items_delete
  on public.drive_items for delete to authenticated
  using (public.drive_item_can_manage(id));

-- Bucket Storage pour les fichiers du Drive
insert into storage.buckets (id, name, public, file_size_limit)
values (
  'drive-files',
  'drive-files',
  true,
  52428800
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Politiques Storage : accès par organisation via préfixe {organization_id}/...
drop policy if exists "drive_files_select_authenticated" on storage.objects;
create policy "drive_files_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'drive-files');

drop policy if exists "drive_files_insert_own_org" on storage.objects;
create policy "drive_files_insert_own_org"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'drive-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "drive_files_update_own_org" on storage.objects;
create policy "drive_files_update_own_org"
on storage.objects for update
to authenticated
using (
  bucket_id = 'drive-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "drive_files_delete_own_org" on storage.objects;
create policy "drive_files_delete_own_org"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'drive-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

commit;

