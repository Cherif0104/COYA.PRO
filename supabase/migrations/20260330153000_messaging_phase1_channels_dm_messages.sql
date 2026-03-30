begin;

create extension if not exists pgcrypto;

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text null,
  type text not null default 'public' check (type in ('public','private','announcement')),
  is_active boolean not null default true,
  created_by_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chat_channels_org_name_active
  on public.chat_channels (organization_id, lower(name), is_active);

create table if not exists public.chat_channel_members (
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  profile_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (channel_id, profile_id)
);

create table if not exists public.chat_direct_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_direct_members (
  thread_id uuid not null references public.chat_direct_threads(id) on delete cascade,
  profile_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid null references public.chat_channels(id) on delete cascade,
  direct_thread_id uuid null references public.chat_direct_threads(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text','link','voice','system')),
  attachment_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_messages_target_check check (
    (channel_id is not null and direct_thread_id is null)
    or (channel_id is null and direct_thread_id is not null)
  )
);

create index if not exists idx_chat_messages_channel_created
  on public.chat_messages (channel_id, created_at);
create index if not exists idx_chat_messages_direct_created
  on public.chat_messages (direct_thread_id, created_at);

alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_direct_threads enable row level security;
alter table public.chat_direct_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_channels_select on public.chat_channels;
create policy chat_channels_select
  on public.chat_channels
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = chat_channels.organization_id
    )
    and (
      chat_channels.type = 'public'
      or exists (
        select 1 from public.chat_channel_members m
        join public.profiles p2 on p2.user_id = auth.uid()
        where m.channel_id = chat_channels.id and m.profile_id = p2.id
      )
    )
  );

drop policy if exists chat_channels_manage on public.chat_channels;
create policy chat_channels_manage
  on public.chat_channels
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = chat_channels.organization_id
        and p.role in ('super_administrator','administrator')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = chat_channels.organization_id
        and p.role in ('super_administrator','administrator')
    )
  );

drop policy if exists chat_channel_members_select on public.chat_channel_members;
create policy chat_channel_members_select
  on public.chat_channel_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_channels c
      join public.profiles p on p.user_id = auth.uid()
      where c.id = chat_channel_members.channel_id
        and c.organization_id = p.organization_id
    )
  );

drop policy if exists chat_channel_members_manage on public.chat_channel_members;
create policy chat_channel_members_manage
  on public.chat_channel_members
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.chat_channels c
      join public.profiles p on p.user_id = auth.uid()
      where c.id = chat_channel_members.channel_id
        and c.organization_id = p.organization_id
        and p.role in ('super_administrator','administrator')
    )
  )
  with check (
    exists (
      select 1
      from public.chat_channels c
      join public.profiles p on p.user_id = auth.uid()
      where c.id = chat_channel_members.channel_id
        and c.organization_id = p.organization_id
        and p.role in ('super_administrator','administrator')
    )
  );

drop policy if exists chat_direct_threads_select on public.chat_direct_threads;
create policy chat_direct_threads_select
  on public.chat_direct_threads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      join public.chat_direct_members m on m.profile_id = p.id
      where p.user_id = auth.uid()
        and p.organization_id = chat_direct_threads.organization_id
        and m.thread_id = chat_direct_threads.id
    )
  );

drop policy if exists chat_direct_threads_insert on public.chat_direct_threads;
create policy chat_direct_threads_insert
  on public.chat_direct_threads
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.organization_id = chat_direct_threads.organization_id
    )
  );

drop policy if exists chat_direct_members_select on public.chat_direct_members;
create policy chat_direct_members_select
  on public.chat_direct_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_direct_threads t
      join public.profiles p on p.user_id = auth.uid()
      where t.id = chat_direct_members.thread_id
        and t.organization_id = p.organization_id
    )
  );

drop policy if exists chat_direct_members_insert on public.chat_direct_members;
create policy chat_direct_members_insert
  on public.chat_direct_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chat_direct_threads t
      join public.profiles p on p.user_id = auth.uid()
      where t.id = chat_direct_members.thread_id
        and t.organization_id = p.organization_id
    )
  );

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
        chat_messages.channel_id is not null and exists (
          select 1
          from public.chat_channels c
          left join public.chat_channel_members m on m.channel_id = c.id
          join public.profiles p2 on p2.user_id = auth.uid()
          where c.id = chat_messages.channel_id
            and (
              c.type = 'public'
              or m.profile_id = p2.id
            )
        )
      )
      or
      (
        chat_messages.direct_thread_id is not null and exists (
          select 1
          from public.chat_direct_members dm
          join public.profiles p3 on p3.user_id = auth.uid()
          where dm.thread_id = chat_messages.direct_thread_id
            and dm.profile_id = p3.id
        )
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
        chat_messages.channel_id is not null and exists (
          select 1
          from public.chat_channels c
          left join public.chat_channel_members m on m.channel_id = c.id
          where c.id = chat_messages.channel_id
            and (
              c.type = 'public'
              or m.profile_id = chat_messages.sender_id
            )
        )
      )
      or
      (
        chat_messages.direct_thread_id is not null and exists (
          select 1
          from public.chat_direct_members dm
          where dm.thread_id = chat_messages.direct_thread_id
            and dm.profile_id = chat_messages.sender_id
        )
      )
    )
  );

commit;
