begin;

alter table if exists public.projects
  add column if not exists programme_id uuid references public.programmes(id) on delete set null;

create index if not exists idx_projects_programme_id on public.projects(programme_id);

create table if not exists public.project_module_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_types text[] not null default '{}'::text[],
  statuses text[] not null default '{}'::text[],
  alert_delay_days int not null default 3,
  task_templates jsonb not null default '[]'::jsonb,
  task_score_percent numeric(8,2),
  manager_score_percent numeric(8,2),
  require_justification_for_completion boolean default false,
  auto_freeze_overdue_tasks boolean default true,
  evaluation_start_date date,
  leave_pending_sla_days int default 2,
  budget_warning_percent numeric(8,2),
  budget_critical_percent numeric(8,2),
  objective_offtrack_gap_percent numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id)
);

create table if not exists public.planning_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  slot_date date not null,
  slot_type text not null default 'other',
  start_time time,
  end_time time,
  meeting_id uuid,
  title text,
  notes text,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planning_slots_org_date on public.planning_slots(organization_id, slot_date);
create index if not exists idx_planning_slots_user_date on public.planning_slots(user_id, slot_date);

alter table public.project_module_settings enable row level security;
alter table public.planning_slots enable row level security;

drop policy if exists project_module_settings_read_org on public.project_module_settings;
create policy project_module_settings_read_org on public.project_module_settings
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = project_module_settings.organization_id
  )
);

drop policy if exists project_module_settings_manage_org on public.project_module_settings;
create policy project_module_settings_manage_org on public.project_module_settings
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = project_module_settings.organization_id
      and coalesce(p.role, '') in ('super_admin','admin','manager','super_administrator','administrator')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = project_module_settings.organization_id
      and coalesce(p.role, '') in ('super_admin','admin','manager','super_administrator','administrator')
  )
);

drop policy if exists planning_slots_read_org on public.planning_slots;
create policy planning_slots_read_org on public.planning_slots
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = planning_slots.organization_id
  )
);

drop policy if exists planning_slots_insert_org on public.planning_slots;
create policy planning_slots_insert_org on public.planning_slots
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = planning_slots.organization_id
  )
);

drop policy if exists planning_slots_update_org on public.planning_slots;
create policy planning_slots_update_org on public.planning_slots
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = planning_slots.organization_id
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = planning_slots.organization_id
  )
);

drop policy if exists planning_slots_delete_org on public.planning_slots;
create policy planning_slots_delete_org on public.planning_slots
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = planning_slots.organization_id
  )
);

drop trigger if exists trg_project_module_settings_updated_at on public.project_module_settings;
create trigger trg_project_module_settings_updated_at
before update on public.project_module_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_planning_slots_updated_at on public.planning_slots;
create trigger trg_planning_slots_updated_at
before update on public.planning_slots
for each row execute function public.set_updated_at();

commit;
