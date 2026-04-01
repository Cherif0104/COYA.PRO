-- Trinité: lecture restreinte pour les membres (own row), managers/admins voient l'org ; notes auto-évaluation

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

create index if not exists idx_trinite_self_notes_org on public.trinite_self_notes(organization_id);

alter table public.trinite_self_notes enable row level security;

drop policy if exists trinite_self_notes_select on public.trinite_self_notes;
create policy trinite_self_notes_select on public.trinite_self_notes
for select to authenticated using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
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

-- Replace broad trinite_scores read with own-row OR manager role
drop policy if exists "trinite_scores_read_org" on public.trinite_scores;
create policy "trinite_scores_read_org" on public.trinite_scores
for select to authenticated using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = trinite_scores.organization_id
        and coalesce(p.role, '') in ('super_administrator', 'administrator', 'manager')
    )
  )
);

commit;
