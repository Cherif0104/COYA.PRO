-- Messagerie : supprime la récursion infinie entre politiques RLS
-- (chat_direct_threads <-> chat_direct_members, chat_channels <-> chat_channel_members)
-- en s'appuyant sur des fonctions STABLE SECURITY DEFINER.

begin;

-- ---------- Direct : membres / fils ----------
create or replace function public.chat_direct_user_is_thread_member(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_direct_members m
    join public.profiles pr on pr.id = m.profile_id
    where m.thread_id = p_thread_id
      and pr.user_id = auth.uid()
  );
$$;

create or replace function public.chat_direct_user_can_add_thread_member(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_direct_threads t
    join public.profiles p on p.user_id = auth.uid()
    where t.id = p_thread_id
      and t.organization_id = p.organization_id
  );
$$;

create or replace function public.chat_direct_sender_in_thread(p_thread_id uuid, p_sender_profile uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_direct_members m
    where m.thread_id = p_thread_id
      and m.profile_id = p_sender_profile
  );
$$;

-- ---------- Canaux ----------
create or replace function public.chat_user_can_see_channel(p_channel_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_channels c
    join public.profiles p on p.user_id = auth.uid() and p.organization_id = c.organization_id
    where c.id = p_channel_id
      and coalesce(c.is_active, true) = true
      and (
        c.type = 'public'
        or exists (
          select 1 from public.chat_channel_members m
          where m.channel_id = c.id and m.profile_id = p.id
        )
      )
  );
$$;

create or replace function public.chat_user_is_channel_admin(p_channel_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_channels c
    join public.profiles p on p.user_id = auth.uid()
    where c.id = p_channel_id
      and c.organization_id = p.organization_id
      and p.role in ('super_administrator', 'administrator')
  );
$$;

create or replace function public.chat_user_can_post_to_channel(p_channel_id uuid, p_sender_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_channels c
    where c.id = p_channel_id
      and coalesce(c.is_active, true) = true
      and (
        c.type = 'public'
        or exists (
          select 1 from public.chat_channel_members m
          where m.channel_id = c.id and m.profile_id = p_sender_profile_id
        )
      )
  );
$$;

revoke all on function public.chat_direct_user_is_thread_member(uuid) from public;
grant execute on function public.chat_direct_user_is_thread_member(uuid) to authenticated;

revoke all on function public.chat_direct_user_can_add_thread_member(uuid) from public;
grant execute on function public.chat_direct_user_can_add_thread_member(uuid) to authenticated;

revoke all on function public.chat_direct_sender_in_thread(uuid, uuid) from public;
grant execute on function public.chat_direct_sender_in_thread(uuid, uuid) to authenticated;

revoke all on function public.chat_user_can_see_channel(uuid) from public;
grant execute on function public.chat_user_can_see_channel(uuid) to authenticated;

revoke all on function public.chat_user_is_channel_admin(uuid) from public;
grant execute on function public.chat_user_is_channel_admin(uuid) to authenticated;

revoke all on function public.chat_user_can_post_to_channel(uuid, uuid) from public;
grant execute on function public.chat_user_can_post_to_channel(uuid, uuid) to authenticated;

-- ---------- Politiques remplacées ----------
drop policy if exists chat_channels_select on public.chat_channels;
create policy chat_channels_select
  on public.chat_channels
  for select
  to authenticated
  using (public.chat_user_can_see_channel(chat_channels.id));

drop policy if exists chat_channel_members_select on public.chat_channel_members;
create policy chat_channel_members_select
  on public.chat_channel_members
  for select
  to authenticated
  using (public.chat_user_can_see_channel(chat_channel_members.channel_id));

drop policy if exists chat_channel_members_manage on public.chat_channel_members;
create policy chat_channel_members_manage
  on public.chat_channel_members
  for all
  to authenticated
  using (public.chat_user_is_channel_admin(chat_channel_members.channel_id))
  with check (public.chat_user_is_channel_admin(chat_channel_members.channel_id));

drop policy if exists chat_direct_threads_select on public.chat_direct_threads;
create policy chat_direct_threads_select
  on public.chat_direct_threads
  for select
  to authenticated
  using (public.chat_direct_user_is_thread_member(chat_direct_threads.id));

drop policy if exists chat_direct_members_select on public.chat_direct_members;
create policy chat_direct_members_select
  on public.chat_direct_members
  for select
  to authenticated
  using (public.chat_direct_user_is_thread_member(chat_direct_members.thread_id));

drop policy if exists chat_direct_members_insert on public.chat_direct_members;
create policy chat_direct_members_insert
  on public.chat_direct_members
  for insert
  to authenticated
  with check (public.chat_direct_user_can_add_thread_member(chat_direct_members.thread_id));

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = chat_messages.organization_id
    )
    and (
      (
        chat_messages.channel_id is not null
        and public.chat_user_can_see_channel(chat_messages.channel_id)
      )
      or (
        chat_messages.direct_thread_id is not null
        and public.chat_direct_user_is_thread_member(chat_messages.direct_thread_id)
      )
    )
  );

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert
  on public.chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.id = chat_messages.sender_id
        and p.organization_id = chat_messages.organization_id
    )
    and (
      (
        chat_messages.channel_id is not null
        and public.chat_user_can_post_to_channel(chat_messages.channel_id, chat_messages.sender_id)
      )
      or (
        chat_messages.direct_thread_id is not null
        and public.chat_direct_sender_in_thread(chat_messages.direct_thread_id, chat_messages.sender_id)
      )
    )
  );

commit;
