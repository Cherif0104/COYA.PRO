begin;

alter table public.notifications
  alter column module set default 'system',
  alter column action set default 'created',
  alter column title set default 'Notification',
  alter column read set default false,
  alter column created_at set default now();

drop policy if exists notifications_insert_own on public.notifications;
drop policy if exists notifications_insert_org on public.notifications;
create policy notifications_insert_org
on public.notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles me
    join public.profiles target on target.id = notifications.user_id
    where me.user_id = auth.uid()
      and me.organization_id is not null
      and me.organization_id = target.organization_id
  )
);

commit;
