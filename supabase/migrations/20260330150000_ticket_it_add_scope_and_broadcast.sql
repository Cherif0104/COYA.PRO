begin;

alter table public.it_tickets
  add column if not exists visibility_scope text not null default 'self',
  add column if not exists broadcast_on_create boolean not null default false;

alter table public.it_tickets
  drop constraint if exists it_tickets_visibility_scope_check;

alter table public.it_tickets
  add constraint it_tickets_visibility_scope_check
  check (visibility_scope in ('self', 'team', 'all_users'));

commit;
