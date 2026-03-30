begin;

create extension if not exists pgcrypto;

create table if not exists public.referential_values (
  id uuid primary key default gen_random_uuid(),
  referential_type text not null,
  organization_id uuid null references public.organizations(id) on delete cascade,
  name text not null,
  sequence integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_referential_values_scope_name
  on public.referential_values (referential_type, organization_id, lower(name));

create index if not exists idx_referential_values_lookup
  on public.referential_values (referential_type, organization_id, is_active, sequence, name);

create table if not exists public.it_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations(id) on delete set null,
  title text not null check (char_length(trim(title)) between 8 and 180),
  description text not null check (char_length(trim(description)) >= 30),
  status text not null default 'draft' check (status in ('draft','pending_validation','validated','sent_to_it','in_progress','resolved','rejected')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  issue_type_id uuid null references public.referential_values(id) on delete set null,
  created_by_id uuid not null,
  created_by_name text null,
  validated_by_id uuid null,
  validated_by_name text null,
  validated_at timestamptz null,
  rejection_reason text null,
  assigned_to_id uuid null,
  assigned_to_name text null,
  sent_to_it_at timestamptz null,
  resolved_at timestamptz null,
  resolution_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_it_tickets_org_status_created
  on public.it_tickets (organization_id, status, created_at desc);

create index if not exists idx_it_tickets_creator
  on public.it_tickets (created_by_id, created_at desc);

create index if not exists idx_it_tickets_assignee
  on public.it_tickets (assigned_to_id, created_at desc);

alter table public.referential_values enable row level security;
alter table public.it_tickets enable row level security;

drop policy if exists referential_values_select_scope on public.referential_values;
create policy referential_values_select_scope
  on public.referential_values
  for select
  to authenticated
  using (
    organization_id is null
    or organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
    )
  );

drop policy if exists referential_values_write_management on public.referential_values;
create policy referential_values_write_management
  on public.referential_values
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('super_administrator','administrator','manager')
        and (
          referential_values.organization_id is null
          or referential_values.organization_id = p.organization_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('super_administrator','administrator','manager')
        and (
          referential_values.organization_id is null
          or referential_values.organization_id = p.organization_id
        )
    )
  );

drop policy if exists it_tickets_select_scope on public.it_tickets;
create policy it_tickets_select_scope
  on public.it_tickets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and (
          it_tickets.created_by_id = p.id
          or it_tickets.assigned_to_id = p.id
          or (
            p.role in ('super_administrator','administrator','manager')
            and (it_tickets.organization_id is null or it_tickets.organization_id = p.organization_id)
          )
        )
    )
  );

drop policy if exists it_tickets_insert_creator on public.it_tickets;
create policy it_tickets_insert_creator
  on public.it_tickets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.id = it_tickets.created_by_id
        and (it_tickets.organization_id is null or it_tickets.organization_id = p.organization_id)
    )
  );

drop policy if exists it_tickets_update_scope on public.it_tickets;
create policy it_tickets_update_scope
  on public.it_tickets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and (
          it_tickets.created_by_id = p.id
          or it_tickets.assigned_to_id = p.id
          or (
            p.role in ('super_administrator','administrator','manager')
            and (it_tickets.organization_id is null or it_tickets.organization_id = p.organization_id)
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and (
          it_tickets.created_by_id = p.id
          or it_tickets.assigned_to_id = p.id
          or (
            p.role in ('super_administrator','administrator','manager')
            and (it_tickets.organization_id is null or it_tickets.organization_id = p.organization_id)
          )
        )
    )
  );

insert into public.referential_values (referential_type, organization_id, name, sequence, is_active)
select v.referential_type, v.organization_id, v.name, v.sequence, v.is_active
from (
  values
    ('ticket_issue_type', null::uuid, 'Bug fonctionnel', 10, true),
    ('ticket_issue_type', null::uuid, 'Erreur UI/UX', 20, true),
    ('ticket_issue_type', null::uuid, 'Problème de données', 30, true),
    ('ticket_issue_type', null::uuid, 'Compte / accès', 40, true),
    ('ticket_issue_type', null::uuid, 'Performance', 50, true)
) as v(referential_type, organization_id, name, sequence, is_active)
where not exists (
  select 1
  from public.referential_values rv
  where rv.referential_type = v.referential_type
    and rv.organization_id is not distinct from v.organization_id
    and lower(rv.name) = lower(v.name)
);

commit;
