-- Fiche salarié : pièces jointes JSON + bucket Storage pour photo / CV / documents

begin;

alter table if exists public.employees
  add column if not exists hr_attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-files',
  'employee-files',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "employee_files_select_authenticated" on storage.objects;
create policy "employee_files_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'employee-files');

drop policy if exists "employee_files_insert_own_org" on storage.objects;
create policy "employee_files_insert_own_org"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'employee-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "employee_files_update_own_org" on storage.objects;
create policy "employee_files_update_own_org"
on storage.objects for update
to authenticated
using (
  bucket_id = 'employee-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and split_part(name, '/', 1) = p.organization_id::text
  )
);

drop policy if exists "employee_files_delete_own_org" on storage.objects;
create policy "employee_files_delete_own_org"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'employee-files'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and split_part(name, '/', 1) = p.organization_id::text
  )
);

commit;
