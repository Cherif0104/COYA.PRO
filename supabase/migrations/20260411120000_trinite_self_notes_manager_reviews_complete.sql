-- Trinité : tables trinite_self_notes + trinite_manager_reviews (idempotent).
-- À appliquer avec : supabase db push (depuis coya-pro/) ou copier-coller dans Supabase → SQL Editor.
-- Complète / sécurise le schéma si des migrations 20260401130000 / 20260409100000 n’ont pas été appliquées sur le remote.

begin;

create table if not exists public.trinite_self_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id, period_start, period_end)
);

alter table public.trinite_self_notes
  add column if not exists aided_received boolean not null default false,
  add column if not exists aided_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists aided_reason text;

create index if not exists idx_trinite_self_notes_org on public.trinite_self_notes(organization_id);

alter table public.trinite_self_notes enable row level security;

drop policy if exists trinite_self_notes_select on public.trinite_self_notes;
create policy trinite_self_notes_select on public.trinite_self_notes
for select to authenticated using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = trinite_self_notes.organization_id
        and coalesce(p.role, '') in (
          'super_administrator',
          'administrator',
          'manager',
          'supervisor'
        )
    )
  )
);

drop policy if exists trinite_self_notes_upsert_self on public.trinite_self_notes;
create policy trinite_self_notes_upsert_self on public.trinite_self_notes
for insert to authenticated with check (
  profile_id in (select id from public.profiles where user_id = auth.uid())
  and organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists trinite_self_notes_update_self on public.trinite_self_notes;
create policy trinite_self_notes_update_self on public.trinite_self_notes
for update to authenticated using (
  profile_id in (select id from public.profiles where user_id = auth.uid())
) with check (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);

create table if not exists public.trinite_manager_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  manager_profile_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint,
  feedback text,
  updated_at timestamptz not null default now(),
  constraint trinite_manager_reviews_rating_range check (rating is null or (rating >= 1 and rating <= 20)),
  unique (organization_id, subject_profile_id, period_start, period_end)
);

create index if not exists idx_trinite_manager_reviews_org on public.trinite_manager_reviews(organization_id);

alter table public.trinite_manager_reviews enable row level security;

drop policy if exists trinite_manager_reviews_select on public.trinite_manager_reviews;
create policy trinite_manager_reviews_select on public.trinite_manager_reviews
for select to authenticated using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and (
    subject_profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = trinite_manager_reviews.organization_id
        and coalesce(p.role, '') in (
          'super_administrator',
          'administrator',
          'manager',
          'supervisor'
        )
    )
  )
);

drop policy if exists trinite_manager_reviews_write on public.trinite_manager_reviews;
create policy trinite_manager_reviews_write on public.trinite_manager_reviews
for all to authenticated using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = trinite_manager_reviews.organization_id
      and coalesce(p.role, '') in (
        'super_administrator',
        'administrator',
        'manager',
        'supervisor'
      )
  )
) with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and manager_profile_id in (select id from public.profiles where user_id = auth.uid())
);

commit;

notify pgrst, 'reload schema';
