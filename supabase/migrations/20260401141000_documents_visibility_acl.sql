-- Base documentaire : organisation + partages par profil, département, projet (équipe tâches)
-- + RLS via fonctions SECURITY DEFINER (évite les politiques circulaires).

begin;

-- Colonne multi-tenant sur documents (si la table existe)
do $$
begin
  if to_regclass('public.documents') is null then
    raise notice 'documents: table absente, migration ACL ignorée';
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'organization_id'
  ) then
    alter table public.documents
      add column organization_id uuid references public.organizations(id) on delete cascade;
  end if;

  update public.documents d
  set organization_id = p.organization_id
  from public.profiles p
  where d.created_by_id = p.id
    and d.organization_id is null
    and p.organization_id is not null;
end;
$$;

-- Tables ACL (créées seulement si documents existe)
create table if not exists public.document_acl_profiles (
  document_id uuid not null references public.documents(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, profile_id)
);

create table if not exists public.document_acl_departments (
  document_id uuid not null references public.documents(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, department_id)
);

create table if not exists public.document_acl_projects (
  document_id uuid not null references public.documents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, project_id)
);

create index if not exists idx_document_acl_profiles_profile on public.document_acl_profiles(profile_id);
create index if not exists idx_document_acl_departments_dept on public.document_acl_departments(department_id);
create index if not exists idx_document_acl_projects_project on public.document_acl_projects(project_id);

-- Qui peut gérer un document (créateur ou admin org)
create or replace function public.document_can_manage(p_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents d
    join public.profiles pr on pr.user_id = auth.uid()
    where d.id = p_document_id
      and (
        d.created_by_id = pr.id
        or (
          d.organization_id is not null
          and d.organization_id = pr.organization_id
          and pr.role in ('super_administrator', 'administrator')
        )
      )
  );
$$;

-- Lecture autorisée
create or replace function public.document_visible_to_reader(p_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents d
    join public.profiles pr on pr.user_id = auth.uid()
    where d.id = p_document_id
      and (
        (d.organization_id is null and d.created_by_id = pr.id)
        or (d.organization_id is not null and d.organization_id = pr.organization_id)
      )
      and (
        d.created_by_id = pr.id
        or (
          d.organization_id is not null
          and d.organization_id = pr.organization_id
          and pr.role in ('super_administrator', 'administrator')
        )
        or coalesce(d.is_public, false) = true
        or exists (
          select 1 from public.document_acl_profiles ap
          where ap.document_id = d.id and ap.profile_id = pr.id
        )
        or exists (
          select 1 from public.document_acl_departments ad
          join public.user_departments ud
            on ud.department_id = ad.department_id and ud.user_id = auth.uid()
          where ad.document_id = d.id
        )
        -- Branche projet/tâches : voir migration optionnelle si public.tasks existe
      )
  );
$$;

revoke all on function public.document_can_manage(uuid) from public;
grant execute on function public.document_can_manage(uuid) to authenticated;

revoke all on function public.document_visible_to_reader(uuid) from public;
grant execute on function public.document_visible_to_reader(uuid) to authenticated;

alter table public.document_acl_profiles enable row level security;
alter table public.document_acl_departments enable row level security;
alter table public.document_acl_projects enable row level security;

drop policy if exists document_acl_profiles_select on public.document_acl_profiles;
create policy document_acl_profiles_select
  on public.document_acl_profiles for select to authenticated
  using (public.document_visible_to_reader(document_id));

drop policy if exists document_acl_profiles_write on public.document_acl_profiles;
create policy document_acl_profiles_write
  on public.document_acl_profiles for all to authenticated
  using (public.document_can_manage(document_id))
  with check (public.document_can_manage(document_id));

drop policy if exists document_acl_departments_select on public.document_acl_departments;
create policy document_acl_departments_select
  on public.document_acl_departments for select to authenticated
  using (public.document_visible_to_reader(document_id));

drop policy if exists document_acl_departments_write on public.document_acl_departments;
create policy document_acl_departments_write
  on public.document_acl_departments for all to authenticated
  using (public.document_can_manage(document_id))
  with check (public.document_can_manage(document_id));

drop policy if exists document_acl_projects_select on public.document_acl_projects;
create policy document_acl_projects_select
  on public.document_acl_projects for select to authenticated
  using (public.document_visible_to_reader(document_id));

drop policy if exists document_acl_projects_write on public.document_acl_projects;
create policy document_acl_projects_write
  on public.document_acl_projects for all to authenticated
  using (public.document_can_manage(document_id))
  with check (public.document_can_manage(document_id));

-- Remplacer les politiques existantes sur documents
do $$
declare pol record;
begin
  if to_regclass('public.documents') is null then
    return;
  end if;
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'documents'
  loop
    execute format('drop policy if exists %I on public.documents', pol.policyname);
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.documents') is null then
    return;
  end if;

  execute $p$
    create policy documents_select on public.documents
      for select to authenticated
      using (public.document_visible_to_reader(id));
  $p$;

  execute $p$
    create policy documents_insert on public.documents
      for insert to authenticated
      with check (
        created_by_id in (select id from public.profiles where user_id = auth.uid())
        and (
          organization_id is null
          or organization_id in (select organization_id from public.profiles where user_id = auth.uid())
        )
      );
  $p$;

  execute $p$
    create policy documents_update on public.documents
      for update to authenticated
      using (public.document_can_manage(id))
      with check (
        organization_id is null
        or organization_id in (select organization_id from public.profiles where user_id = auth.uid())
      );
  $p$;

  execute $p$
    create policy documents_delete on public.documents
      for delete to authenticated
      using (public.document_can_manage(id));
  $p$;
end;
$$;

commit;
