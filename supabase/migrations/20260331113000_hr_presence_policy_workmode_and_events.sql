begin;

alter table if exists public.employees
  add column if not exists work_mode text check (work_mode in ('office','remote','hybrid')) default 'office',
  add column if not exists hourly_rate numeric(12,2),
  add column if not exists expected_daily_minutes int default 480;

alter table if exists public.presence_sessions
  add column if not exists started_ip text,
  add column if not exists ended_ip text,
  add column if not exists work_mode text check (work_mode in ('office','remote','hybrid')) default 'office';

create table if not exists public.hr_attendance_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payroll_period_start_day int not null default 1 check (payroll_period_start_day between 1 and 28),
  expected_daily_minutes int not null default 480,
  expected_work_start_time time not null default '09:00:00',
  monthly_delay_tolerance_minutes int not null default 45,
  monthly_unjustified_absence_tolerance_minutes int not null default 480,
  default_work_mode text not null default 'office' check (default_work_mode in ('office','remote','hybrid')),
  enforce_office_ip boolean not null default false,
  office_ip_allowlist text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id)
);

create table if not exists public.presence_status_events (
  id uuid primary key default gen_random_uuid(),
  presence_session_id uuid not null references public.presence_sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  status text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int,
  source text not null default 'system' check (source in ('selector','widget','system')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_presence_status_events_org_started
  on public.presence_status_events(organization_id, started_at desc);
create index if not exists idx_presence_status_events_session
  on public.presence_status_events(presence_session_id, started_at desc);
create index if not exists idx_presence_status_events_user
  on public.presence_status_events(user_id, started_at desc);

alter table public.hr_attendance_policies enable row level security;
alter table public.presence_status_events enable row level security;

drop policy if exists hr_attendance_policies_read_org on public.hr_attendance_policies;
create policy hr_attendance_policies_read_org on public.hr_attendance_policies
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = hr_attendance_policies.organization_id
  )
);

drop policy if exists hr_attendance_policies_manage_org on public.hr_attendance_policies;
create policy hr_attendance_policies_manage_org on public.hr_attendance_policies
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = hr_attendance_policies.organization_id
      and coalesce(p.role, '') in ('super_admin','admin','manager','super_administrator','administrator')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = hr_attendance_policies.organization_id
      and coalesce(p.role, '') in ('super_admin','admin','manager','super_administrator','administrator')
  )
);

drop policy if exists presence_status_events_read_org on public.presence_status_events;
create policy presence_status_events_read_org on public.presence_status_events
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = presence_status_events.organization_id
  )
);

drop policy if exists presence_status_events_insert_org on public.presence_status_events;
create policy presence_status_events_insert_org on public.presence_status_events
for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = presence_status_events.organization_id
  )
);

drop policy if exists presence_status_events_update_org on public.presence_status_events;
create policy presence_status_events_update_org on public.presence_status_events
for update to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = presence_status_events.organization_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.organization_id = presence_status_events.organization_id
  )
);

drop trigger if exists trg_hr_attendance_policies_updated_at on public.hr_attendance_policies;
create trigger trg_hr_attendance_policies_updated_at
before update on public.hr_attendance_policies
for each row execute function public.set_updated_at();

commit;
