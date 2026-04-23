-- Webhooks HTTP sortants CRM : configuration par organisation + RLS.
begin;

create table if not exists public.organization_crm_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text,
  target_url text not null,
  signing_secret text not null,
  is_enabled boolean not null default true,
  last_delivery_at timestamptz,
  last_delivery_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_crm_webhooks_org_enabled_idx
  on public.organization_crm_webhooks (organization_id)
  where is_enabled = true;

comment on table public.organization_crm_webhooks is
  'Cibles HTTP pour relais Edge des événements CRM (signature HMAC-SHA256, secret stocké côté serveur via RLS).';

-- Mise à jour automatique de updated_at
create or replace function public.touch_organization_crm_webhooks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_crm_webhooks_touch_updated on public.organization_crm_webhooks;
create trigger organization_crm_webhooks_touch_updated
  before update on public.organization_crm_webhooks
  for each row
  execute procedure public.touch_organization_crm_webhooks_updated_at();

alter table public.organization_crm_webhooks enable row level security;

grant select, insert, update, delete on public.organization_crm_webhooks to authenticated;

-- Lecture : tout membre de l''organisation
create policy organization_crm_webhooks_select
  on public.organization_crm_webhooks
  for select
  to authenticated
  using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
    )
  );

-- Écriture : rôles organisationnels élevés (aligné gestion CRM / paramètres)
create policy organization_crm_webhooks_insert
  on public.organization_crm_webhooks
  for insert
  to authenticated
  with check (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
        and p.role in ('super_administrator', 'administrator', 'manager')
    )
  );

create policy organization_crm_webhooks_update
  on public.organization_crm_webhooks
  for update
  to authenticated
  using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
        and p.role in ('super_administrator', 'administrator', 'manager')
    )
  )
  with check (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
        and p.role in ('super_administrator', 'administrator', 'manager')
    )
  );

create policy organization_crm_webhooks_delete
  on public.organization_crm_webhooks
  for delete
  to authenticated
  using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
        and p.role in ('super_administrator', 'administrator', 'manager')
    )
  );

commit;
