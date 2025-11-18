create table if not exists public.activity_logs (
    id uuid primary key default uuid_generate_v4(),
    action text not null,
    module text not null,
    entity_type text,
    entity_id text,
    actor_id text,
    actor_name text,
    actor_email text,
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index if not exists activity_logs_actor_idx on public.activity_logs (actor_id);
create index if not exists activity_logs_module_idx on public.activity_logs (module);

