-- Programme extensions: allow_projects, multi-donor link, stakeholders, actions, data collection rows

begin;

alter table public.programmes
  add column if not exists allow_projects boolean not null default true;

create table if not exists public.programme_bailleurs (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  bailleur_id uuid not null references public.bailleurs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (programme_id, bailleur_id)
);

create index if not exists idx_programme_bailleurs_programme on public.programme_bailleurs(programme_id);

create table if not exists public.programme_stakeholders (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  stakeholder_type text not null default 'other'
    check (stakeholder_type in ('facilitator', 'implementation_partner', 'donor_contact', 'technical', 'other')),
  profile_id uuid references public.profiles(id) on delete set null,
  external_name text,
  external_role text,
  external_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programme_stakeholders_programme on public.programme_stakeholders(programme_id);

create table if not exists public.programme_actions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  title text not null,
  action_type text not null default 'other',
  status text not null default 'draft'
    check (status in ('draft', 'pending_validation', 'validated', 'done', 'cancelled')),
  executor_profile_id uuid references public.profiles(id) on delete set null,
  validated_by_profile_id uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programme_actions_programme on public.programme_actions(programme_id);

create table if not exists public.programme_data_rows (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  section text not null default 'default',
  row_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programme_data_rows_programme on public.programme_data_rows(programme_id);

alter table public.programme_bailleurs enable row level security;
alter table public.programme_stakeholders enable row level security;
alter table public.programme_actions enable row level security;
alter table public.programme_data_rows enable row level security;

-- Policies: same organization as programme (via profiles.organization_id = programmes.organization_id)
drop policy if exists programme_bailleurs_select on public.programme_bailleurs;
create policy programme_bailleurs_select on public.programme_bailleurs
  for select to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_bailleurs.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_bailleurs_all on public.programme_bailleurs;
create policy programme_bailleurs_all on public.programme_bailleurs
  for all to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_bailleurs.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_bailleurs.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_stakeholders_select on public.programme_stakeholders;
create policy programme_stakeholders_select on public.programme_stakeholders
  for select to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_stakeholders.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_stakeholders_all on public.programme_stakeholders;
create policy programme_stakeholders_all on public.programme_stakeholders
  for all to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_stakeholders.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_stakeholders.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_actions_select on public.programme_actions;
create policy programme_actions_select on public.programme_actions
  for select to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_actions.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_actions_all on public.programme_actions;
create policy programme_actions_all on public.programme_actions
  for all to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_actions.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_actions.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_data_rows_select on public.programme_data_rows;
create policy programme_data_rows_select on public.programme_data_rows
  for select to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_data_rows.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_data_rows_all on public.programme_data_rows;
create policy programme_data_rows_all on public.programme_data_rows
  for all to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_data_rows.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = programme_data_rows.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

commit;
