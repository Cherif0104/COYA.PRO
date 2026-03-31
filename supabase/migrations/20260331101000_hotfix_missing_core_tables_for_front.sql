begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.module_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  module_key text not null,
  display_name_fr text,
  display_name_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_key)
);

create table if not exists public.dashboard_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, widget_key)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  module_slugs jsonb not null default '[]'::jsonb,
  sequence int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.user_departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  department_id uuid not null references public.departments(id) on delete cascade,
  role_in_department text,
  created_at timestamptz not null default now(),
  unique(user_id, department_id)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  position text,
  manager_id uuid references public.profiles(id) on delete set null,
  mentor_id uuid references public.profiles(id) on delete set null,
  leave_rate numeric default 1.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, profile_id)
);

create table if not exists public.presence_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'online',
  meeting_id uuid,
  pause_minutes int not null default 0,
  notes text,
  hourly_rate numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hr_absence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  absence_date date not null,
  duration_minutes int not null default 480,
  is_authorized boolean not null default true,
  reason text,
  created_by_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bailleurs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  bailleur_id uuid references public.bailleurs(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.organization_accounting_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accounting_framework text not null default 'syscohada' check (accounting_framework in ('syscohada','sycebnl')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id)
);

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  label text not null,
  account_type text not null check (account_type in ('asset','liability','equity','income','expense')),
  framework text default 'both' check (framework in ('both','syscohada','sycebnl')),
  parent_id uuid references public.chart_of_accounts(id) on delete set null,
  is_cash_flow_register boolean default false,
  is_active boolean default true,
  sequence int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, code)
);

create table if not exists public.accounting_journals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  journal_type text not null default 'general',
  currency text default 'XOF',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, code)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  journal_id uuid not null references public.accounting_journals(id) on delete restrict,
  entry_date date not null,
  reference text,
  description text,
  status text default 'draft',
  created_by_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  label text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  sequence int default 0,
  fiscal_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.accounting_period_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  closure_type text not null,
  status text not null default 'closed',
  reason text,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

commit;
