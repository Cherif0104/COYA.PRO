-- Programme terrain: activités sous projet, budget prévisionnel/réel en cascade, staff interne, lien CRM bénéficiaires

begin;

-- 1) Parties prenantes : type staff interne (salariés / utilisateurs plateforme)
alter table public.programme_stakeholders
  drop constraint if exists programme_stakeholders_stakeholder_type_check;

alter table public.programme_stakeholders
  add constraint programme_stakeholders_stakeholder_type_check
  check (stakeholder_type in (
    'facilitator',
    'implementation_partner',
    'donor_contact',
    'technical',
    'internal_staff',
    'other'
  ));

-- 2) Activités de terrain (Projet → Activités → Tâches côté app via tasks JSON + activity_id)
create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  project_id uuid not null,
  title text not null,
  description text,
  location text,
  start_date date,
  end_date date,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  sequence int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_activities_project on public.project_activities(project_id);
create index if not exists idx_project_activities_programme on public.project_activities(programme_id);
create index if not exists idx_project_activities_org on public.project_activities(organization_id);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'projects'
  ) then
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_schema = 'public'
        and table_name = 'project_activities'
        and constraint_name = 'project_activities_project_id_fkey'
    ) then
      alter table public.project_activities
        add constraint project_activities_project_id_fkey
        foreign key (project_id) references public.projects(id) on delete cascade;
    end if;
  end if;
end $$;

alter table public.project_activities enable row level security;

drop policy if exists project_activities_select on public.project_activities;
create policy project_activities_select on public.project_activities
  for select to authenticated using (
    organization_id in (
      select p.organization_id from public.profiles p where p.user_id = auth.uid()
    )
  );

drop policy if exists project_activities_all on public.project_activities;
create policy project_activities_all on public.project_activities
  for all to authenticated using (
    organization_id in (
      select p.organization_id from public.profiles p where p.user_id = auth.uid()
    )
  ) with check (
    organization_id in (
      select p.organization_id from public.profiles p where p.user_id = auth.uid()
    )
  );

drop trigger if exists project_activities_updated_at on public.project_activities;
create trigger project_activities_updated_at
  before update on public.project_activities
  for each row execute function public.set_updated_at();

-- 3) Lignes budgétaires cascade (Programme → Projet → Activité → Tâche) + workflow
create table if not exists public.budget_cascade_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope_level text not null
    check (scope_level in ('programme', 'project', 'activity', 'task')),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  activity_id uuid references public.project_activities(id) on delete cascade,
  -- Identifiant de tâche dans le JSON projects.tasks lorsque scope_level = task
  project_task_id text,
  parent_line_id uuid references public.budget_cascade_lines(id) on delete set null,
  expense_post_code text,
  label text not null,
  planned_amount numeric(18,2) not null default 0,
  actual_amount numeric(18,2) not null default 0,
  currency text not null default 'XOF',
  workflow_status text not null default 'draft'
    check (workflow_status in ('draft', 'submitted', 'validated', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_cascade_scope_consistency check (
    (scope_level = 'programme' and project_id is null and activity_id is null and project_task_id is null)
    or (scope_level = 'project' and project_id is not null and activity_id is null and project_task_id is null)
    or (scope_level = 'activity' and project_id is not null and activity_id is not null and project_task_id is null)
    or (scope_level = 'task' and project_id is not null and activity_id is not null and project_task_id is not null and length(trim(project_task_id)) > 0)
  )
);

create index if not exists idx_budget_cascade_programme on public.budget_cascade_lines(programme_id);
create index if not exists idx_budget_cascade_project on public.budget_cascade_lines(project_id);
create index if not exists idx_budget_cascade_activity on public.budget_cascade_lines(activity_id);
create index if not exists idx_budget_cascade_org on public.budget_cascade_lines(organization_id);

alter table public.budget_cascade_lines enable row level security;

drop policy if exists budget_cascade_lines_select on public.budget_cascade_lines;
create policy budget_cascade_lines_select on public.budget_cascade_lines
  for select to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = budget_cascade_lines.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists budget_cascade_lines_all on public.budget_cascade_lines;
create policy budget_cascade_lines_all on public.budget_cascade_lines
  for all to authenticated using (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = budget_cascade_lines.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programmes pr
      join public.profiles p on p.user_id = auth.uid()
      where pr.id = budget_cascade_lines.programme_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop trigger if exists budget_cascade_lines_updated_at on public.budget_cascade_lines;
create trigger budget_cascade_lines_updated_at
  before update on public.budget_cascade_lines
  for each row execute function public.set_updated_at();

-- 4) Lien bénéficiaire → fiche CRM (contacts)
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'beneficiaires'
  ) and exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contacts'
  ) then
    alter table public.beneficiaires
      add column if not exists crm_contact_id uuid references public.contacts(id) on delete set null;
    create index if not exists idx_beneficiaires_crm_contact on public.beneficiaires(crm_contact_id);
  end if;
end $$;

commit;
