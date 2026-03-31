begin;

alter table public.presence_sessions
  add column if not exists hourly_rate numeric(12,2) null;

create table if not exists public.hr_absence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  absence_date date not null,
  duration_minutes int not null default 480,
  is_authorized boolean not null default true,
  reason text null,
  created_by_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hr_absence_events_org_date on public.hr_absence_events(organization_id, absence_date desc);
create index if not exists idx_hr_absence_events_profile on public.hr_absence_events(profile_id, absence_date desc);

alter table public.hr_absence_events enable row level security;

drop policy if exists "hr_absence_events_read_org" on public.hr_absence_events;
create policy "hr_absence_events_read_org" on public.hr_absence_events
for select to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "hr_absence_events_insert_manage" on public.hr_absence_events;
create policy "hr_absence_events_insert_manage" on public.hr_absence_events
for insert to authenticated
with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('super_administrator', 'administrator', 'manager')
  )
);

drop policy if exists "hr_absence_events_update_manage" on public.hr_absence_events;
create policy "hr_absence_events_update_manage" on public.hr_absence_events
for update to authenticated
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

drop policy if exists "hr_absence_events_delete_manage" on public.hr_absence_events;
create policy "hr_absence_events_delete_manage" on public.hr_absence_events
for delete to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('super_administrator', 'administrator', 'manager')
  )
);

commit;
