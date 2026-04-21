-- Trinité : auto-évaluation (self notes) + retours managers (reviews).

begin;

create table if not exists public.trinite_self_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  note text,
  aided_received boolean not null default false,
  aided_by_profile_id uuid references public.profiles(id) on delete set null,
  aided_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trinite_self_notes_period_unique unique (organization_id, profile_id, period_start, period_end)
);

create index if not exists idx_trinite_self_notes_org_period
  on public.trinite_self_notes(organization_id, period_start, period_end);

create table if not exists public.trinite_manager_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  manager_profile_id uuid not null references public.profiles(id) on delete cascade,
  rating numeric,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trinite_manager_reviews_unique unique (organization_id, subject_profile_id, period_start, period_end)
);

create index if not exists idx_trinite_manager_reviews_org_period
  on public.trinite_manager_reviews(organization_id, period_start, period_end);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists trinite_self_notes_set_updated_at on public.trinite_self_notes;
    create trigger trinite_self_notes_set_updated_at
      before update on public.trinite_self_notes
      for each row execute function public.set_updated_at();
    drop trigger if exists trinite_manager_reviews_set_updated_at on public.trinite_manager_reviews;
    create trigger trinite_manager_reviews_set_updated_at
      before update on public.trinite_manager_reviews
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.trinite_self_notes enable row level security;
alter table public.trinite_manager_reviews enable row level security;

-- --- trinite_self_notes ---
drop policy if exists trinite_self_notes_select on public.trinite_self_notes;
create policy trinite_self_notes_select on public.trinite_self_notes
  for select to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and (
      profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
      or (select p.role from public.profiles p where p.user_id = auth.uid())
        in ('super_administrator', 'administrator', 'manager', 'supervisor')
    )
  );

drop policy if exists trinite_self_notes_insert on public.trinite_self_notes;
create policy trinite_self_notes_insert on public.trinite_self_notes
  for insert to authenticated
  with check (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists trinite_self_notes_update on public.trinite_self_notes;
create policy trinite_self_notes_update on public.trinite_self_notes
  for update to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
  )
  with check (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists trinite_self_notes_delete on public.trinite_self_notes;
create policy trinite_self_notes_delete on public.trinite_self_notes
  for delete to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
  );

-- --- trinite_manager_reviews ---
drop policy if exists trinite_manager_reviews_select on public.trinite_manager_reviews;
create policy trinite_manager_reviews_select on public.trinite_manager_reviews
  for select to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and (
      subject_profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
      or (select p.role from public.profiles p where p.user_id = auth.uid())
        in ('super_administrator', 'administrator', 'manager', 'supervisor')
    )
  );

drop policy if exists trinite_manager_reviews_insert on public.trinite_manager_reviews;
create policy trinite_manager_reviews_insert on public.trinite_manager_reviews
  for insert to authenticated
  with check (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and manager_profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
    and (select p.role from public.profiles p where p.user_id = auth.uid())
      in ('super_administrator', 'administrator', 'manager', 'supervisor')
  );

drop policy if exists trinite_manager_reviews_update on public.trinite_manager_reviews;
create policy trinite_manager_reviews_update on public.trinite_manager_reviews
  for update to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and manager_profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
    and (select p.role from public.profiles p where p.user_id = auth.uid())
      in ('super_administrator', 'administrator', 'manager', 'supervisor')
  )
  with check (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and manager_profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists trinite_manager_reviews_delete on public.trinite_manager_reviews;
create policy trinite_manager_reviews_delete on public.trinite_manager_reviews
  for delete to authenticated
  using (
    organization_id in (select p.organization_id from public.profiles p where p.user_id = auth.uid())
    and manager_profile_id = (select p.id from public.profiles p where p.user_id = auth.uid())
    and (select p.role from public.profiles p where p.user_id = auth.uid())
      in ('super_administrator', 'administrator', 'manager', 'supervisor')
  );

-- API PostgREST : exposer les tables sans attendre le reload automatique.
grant select, insert, update, delete on table public.trinite_self_notes to authenticated;
grant all on table public.trinite_self_notes to service_role;
grant select, insert, update, delete on table public.trinite_manager_reviews to authenticated;
grant all on table public.trinite_manager_reviews to service_role;

notify pgrst, 'reload schema';

commit;
