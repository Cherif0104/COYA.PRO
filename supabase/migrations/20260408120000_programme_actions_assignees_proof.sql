-- Actions programme : période, preuve (lien / capture), assignés multiples, clôture auto « non réalisé »

begin;

alter table public.programme_actions drop constraint if exists programme_actions_status_check;

alter table public.programme_actions
  add constraint programme_actions_status_check
  check (status in (
    'draft',
    'pending_validation',
    'validated',
    'assigned',
    'done',
    'cancelled',
    'not_realized'
  ));

alter table public.programme_actions
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists proof_url text,
  add column if not exists proof_storage_path text,
  add column if not exists completed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

create table if not exists public.programme_action_assignees (
  action_id uuid not null references public.programme_actions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (action_id, profile_id)
);

create index if not exists idx_programme_action_assignees_profile on public.programme_action_assignees(profile_id);

alter table public.programme_action_assignees enable row level security;

drop policy if exists programme_action_assignees_select on public.programme_action_assignees;
create policy programme_action_assignees_select on public.programme_action_assignees
  for select to authenticated using (
    exists (
      select 1 from public.programme_actions pa
      join public.programmes pr on pr.id = pa.programme_id
      join public.profiles p on p.user_id = auth.uid()
      where pa.id = programme_action_assignees.action_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

drop policy if exists programme_action_assignees_all on public.programme_action_assignees;
create policy programme_action_assignees_all on public.programme_action_assignees
  for all to authenticated using (
    exists (
      select 1 from public.programme_actions pa
      join public.programmes pr on pr.id = pa.programme_id
      join public.profiles p on p.user_id = auth.uid()
      where pa.id = programme_action_assignees.action_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  ) with check (
    exists (
      select 1 from public.programme_actions pa
      join public.programmes pr on pr.id = pa.programme_id
      join public.profiles p on p.user_id = auth.uid()
      where pa.id = programme_action_assignees.action_id
        and pr.organization_id is not null
        and p.organization_id = pr.organization_id
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'programme-action-proofs',
  'programme-action-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "programme_action_proofs_select_authenticated" on storage.objects;
create policy "programme_action_proofs_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'programme-action-proofs');

drop policy if exists "programme_action_proofs_insert_org" on storage.objects;
create policy "programme_action_proofs_insert_org"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'programme-action-proofs'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "programme_action_proofs_update_org" on storage.objects;
create policy "programme_action_proofs_update_org"
on storage.objects for update
to authenticated
using (
  bucket_id = 'programme-action-proofs'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "programme_action_proofs_delete_org" on storage.objects;
create policy "programme_action_proofs_delete_org"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'programme-action-proofs'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and split_part(name, '/', 1) = p.organization_id::text
  )
);

commit;
