-- Dossier contact CRM : historique, notes, liens, pièces (métadonnées + traçabilité).
begin;

create table if not exists public.contact_dossier_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  kind text not null,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contact_dossier_items_kind_chk check (
    kind in ('timeline', 'note', 'link', 'file')
  )
);

create index if not exists contact_dossier_items_contact_created_idx
  on public.contact_dossier_items (contact_id, created_at desc);

comment on table public.contact_dossier_items is
  'Entrées du dossier CRM par contact : timeline, notes, liens externes, références fichiers (metadata).';

alter table public.contact_dossier_items enable row level security;

grant select, insert, update, delete on public.contact_dossier_items to authenticated;

create policy contact_dossier_items_select
  on public.contact_dossier_items
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

create policy contact_dossier_items_insert
  on public.contact_dossier_items
  for insert
  to authenticated
  with check (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
    )
    and exists (
      select 1
      from public.contacts c
      where c.id = contact_id
        and c.organization_id = organization_id
    )
  );

create policy contact_dossier_items_update
  on public.contact_dossier_items
  for update
  to authenticated
  using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
    )
  )
  with check (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
    )
  );

create policy contact_dossier_items_delete
  on public.contact_dossier_items
  for delete
  to authenticated
  using (
    organization_id in (
      select p.organization_id
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id is not null
    )
  );

commit;
