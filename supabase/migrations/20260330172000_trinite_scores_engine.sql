begin;

create table if not exists public.trinite_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ndiguel_score numeric(7,2) not null default 0,
  yar_score numeric(7,2) not null default 0,
  barke_score numeric(7,2) not null default 0,
  global_score numeric(7,2) not null default 0,
  presence_score numeric(7,2) not null default 0,
  performance_score numeric(7,2) not null default 0,
  objective_score numeric(7,2) not null default 0,
  quality_score numeric(7,2) not null default 0,
  source_snapshot jsonb null,
  generated_by_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id, period_start, period_end)
);

create index if not exists idx_trinite_scores_org_period on public.trinite_scores(organization_id, period_start, period_end);
create index if not exists idx_trinite_scores_org_global on public.trinite_scores(organization_id, global_score desc);

alter table public.trinite_scores enable row level security;

drop policy if exists "trinite_scores_read_org" on public.trinite_scores;
create policy "trinite_scores_read_org" on public.trinite_scores
for select to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "trinite_scores_manage_org" on public.trinite_scores;
create policy "trinite_scores_manage_org" on public.trinite_scores
for all to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('super_administrator', 'administrator', 'manager')
  )
)
with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

commit;
