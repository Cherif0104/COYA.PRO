begin;

alter table public.it_tickets
  drop constraint if exists it_tickets_status_check;

alter table public.it_tickets
  add constraint it_tickets_status_check
  check (status in ('draft','pending_validation','needs_reformulation','validated','sent_to_it','in_progress','resolved','rejected'));

commit;
