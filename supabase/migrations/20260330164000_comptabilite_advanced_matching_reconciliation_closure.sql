begin;

create table if not exists public.accounting_matching_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  matched_at timestamptz null,
  note text null,
  created_by_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.accounting_matching_lines (
  id uuid primary key default gen_random_uuid(),
  matching_group_id uuid not null references public.accounting_matching_groups(id) on delete cascade,
  line_id uuid not null references public.journal_entry_lines(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (matching_group_id, line_id)
);

create table if not exists public.accounting_reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  journal_id uuid not null references public.accounting_journals(id) on delete restrict,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  statement_reference text not null,
  statement_date date not null,
  statement_balance numeric(18,2) not null default 0,
  book_balance numeric(18,2) not null default 0,
  variance numeric(18,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'validated')),
  notes text null,
  created_by_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_period_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  closure_type text not null check (closure_type in ('month', 'quarter', 'semester', 'year')),
  status text not null default 'closed' check (status in ('closed', 'reopened')),
  reason text null,
  closed_by_id uuid null references auth.users(id) on delete set null,
  closed_at timestamptz null,
  reopened_by_id uuid null references auth.users(id) on delete set null,
  reopened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (organization_id, period_start, period_end)
);

create index if not exists idx_accounting_matching_groups_org on public.accounting_matching_groups(organization_id, matched_at desc);
create index if not exists idx_accounting_matching_lines_group on public.accounting_matching_lines(matching_group_id);
create index if not exists idx_accounting_reconciliations_org on public.accounting_reconciliations(organization_id, statement_date desc);
create index if not exists idx_accounting_period_closures_org on public.accounting_period_closures(organization_id, period_start desc);

alter table public.accounting_matching_groups enable row level security;
alter table public.accounting_matching_lines enable row level security;
alter table public.accounting_reconciliations enable row level security;
alter table public.accounting_period_closures enable row level security;

drop policy if exists "accounting_matching_groups org read" on public.accounting_matching_groups;
create policy "accounting_matching_groups org read" on public.accounting_matching_groups
for select to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "accounting_matching_groups org manage" on public.accounting_matching_groups;
create policy "accounting_matching_groups org manage" on public.accounting_matching_groups
for all to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
)
with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "accounting_matching_lines read" on public.accounting_matching_lines;
create policy "accounting_matching_lines read" on public.accounting_matching_lines
for select to authenticated
using (
  exists (
    select 1
    from public.accounting_matching_groups g
    where g.id = accounting_matching_lines.matching_group_id
      and g.organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  )
);

drop policy if exists "accounting_matching_lines manage" on public.accounting_matching_lines;
create policy "accounting_matching_lines manage" on public.accounting_matching_lines
for all to authenticated
using (
  exists (
    select 1
    from public.accounting_matching_groups g
    where g.id = accounting_matching_lines.matching_group_id
      and g.organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.accounting_matching_groups g
    where g.id = accounting_matching_lines.matching_group_id
      and g.organization_id in (select organization_id from public.profiles where user_id = auth.uid())
  )
);

drop policy if exists "accounting_reconciliations org read" on public.accounting_reconciliations;
create policy "accounting_reconciliations org read" on public.accounting_reconciliations
for select to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "accounting_reconciliations org manage" on public.accounting_reconciliations;
create policy "accounting_reconciliations org manage" on public.accounting_reconciliations
for all to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
)
with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "accounting_period_closures org read" on public.accounting_period_closures;
create policy "accounting_period_closures org read" on public.accounting_period_closures
for select to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

drop policy if exists "accounting_period_closures org manage" on public.accounting_period_closures;
create policy "accounting_period_closures org manage" on public.accounting_period_closures
for all to authenticated
using (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
)
with check (
  organization_id in (select organization_id from public.profiles where user_id = auth.uid())
);

create or replace function public.guard_closed_accounting_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked boolean;
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    return new;
  end if;

  select exists (
    select 1
    from public.accounting_period_closures c
    where c.organization_id = new.organization_id
      and c.status = 'closed'
      and new.entry_date between c.period_start and c.period_end
  ) into v_locked;

  if v_locked then
    raise exception 'Periode comptable cloturee: modification interdite.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_closed_accounting_period on public.journal_entries;
create trigger trg_guard_closed_accounting_period
before insert or update on public.journal_entries
for each row
execute function public.guard_closed_accounting_period();

commit;
