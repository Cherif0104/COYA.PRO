-- Permet au créateur d’un fil DM de le SELECT immédiatement après INSERT
-- (PostgREST .select('*') après insert) avant que chat_direct_members ne soit rempli.

begin;

create or replace function public.chat_direct_user_can_see_thread(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.chat_direct_user_is_thread_member(p_thread_id)
    or exists (
      select 1
      from public.chat_direct_threads t
      join public.profiles p on p.user_id = auth.uid()
      where t.id = p_thread_id
        and t.created_by_id = p.id
        and t.organization_id = p.organization_id
    );
$$;

revoke all on function public.chat_direct_user_can_see_thread(uuid) from public;
grant execute on function public.chat_direct_user_can_see_thread(uuid) to authenticated;

drop policy if exists chat_direct_threads_select on public.chat_direct_threads;
create policy chat_direct_threads_select
  on public.chat_direct_threads
  for select
  to authenticated
  using (public.chat_direct_user_can_see_thread(chat_direct_threads.id));

commit;
