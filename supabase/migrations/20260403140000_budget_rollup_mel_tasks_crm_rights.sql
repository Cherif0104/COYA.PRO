-- Agrégation budget, indicateurs MEL sur activités, tâches table + activity_id, lien budget→task_id, droits budget terrain vs finance

begin;

-- 1) MEL / résultats sur activités de terrain
alter table public.project_activities
  add column if not exists mel_target_label text,
  add column if not exists mel_target_value numeric(18,2),
  add column if not exists mel_result_value numeric(18,2),
  add column if not exists mel_unit text,
  add column if not exists mel_notes text;

-- 2) Tâches : lien activité + clé client (id JSON historique) pour upsert stable
alter table public.tasks
  add column if not exists activity_id uuid references public.project_activities(id) on delete set null,
  add column if not exists client_task_key text;

create index if not exists idx_tasks_activity on public.tasks(activity_id);

create unique index if not exists idx_tasks_project_client_key
  on public.tasks (project_id, client_task_key)
  where client_task_key is not null;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects')
     and not exists (
       select 1 from information_schema.table_constraints
       where constraint_schema = 'public' and table_name = 'tasks' and constraint_name = 'tasks_project_id_fkey'
     ) then
    alter table public.tasks
      add constraint tasks_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
exception
  when others then null;
end $$;

-- 3) Budget cascade : référence tâche en base (en plus de project_task_id text legacy)
alter table public.budget_cascade_lines
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists idx_budget_cascade_task on public.budget_cascade_lines(task_id);

-- 4) Vue agrégation par programme + poste de dépense + devise
create or replace view public.v_budget_cascade_rollup_by_post as
select
  programme_id,
  coalesce(nullif(trim(expense_post_code), ''), '__sans_poste__') as expense_post_code,
  currency,
  sum(planned_amount)::numeric(18,2) as total_planned,
  sum(actual_amount)::numeric(18,2) as total_actual,
  (sum(planned_amount) - sum(actual_amount))::numeric(18,2) as variance_planned_minus_actual,
  count(*)::bigint as line_count
from public.budget_cascade_lines
group by programme_id, coalesce(nullif(trim(expense_post_code), ''), '__sans_poste__'), currency;

-- 5) Vue agrégation par niveau (pour tableaux de bord)
create or replace view public.v_budget_cascade_rollup_by_scope as
select
  programme_id,
  scope_level,
  currency,
  sum(planned_amount)::numeric(18,2) as total_planned,
  sum(actual_amount)::numeric(18,2) as total_actual,
  (sum(planned_amount) - sum(actual_amount))::numeric(18,2) as variance_planned_minus_actual,
  count(*)::bigint as line_count
from public.budget_cascade_lines
group by programme_id, scope_level, currency;

-- 6) Profils autorisés à valider / verrouiller le workflow budgétaire
create or replace function public.profile_budget_validator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and lower(coalesce(p.role, '')) in (
        'super_administrator',
        'administrator',
        'manager',
        'supervisor',
        'super_admin',
        'admin',
        'finance',
        'finance_controller'
      )
  );
$$;

-- 7) Garde-fous : terrain = actual_amount seulement (hors verrou) ; finance = workflow & prévisionnel
create or replace function public.budget_cascade_lines_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_validator boolean := public.profile_budget_validator();
  v_core_new jsonb;
  v_core_old jsonb;
begin
  if v_validator then
    return new;
  end if;

  if old.workflow_status = 'locked' then
    raise exception 'budget_cascade_locked: ligne verrouillée — contactez la finance';
  end if;

  if new.workflow_status is distinct from old.workflow_status then
    raise exception 'budget_cascade_workflow: seuls les profils finance peuvent faire avancer le workflow';
  end if;

  v_core_new := to_jsonb(new)
    - 'actual_amount' - 'updated_at';
  v_core_old := to_jsonb(old)
    - 'actual_amount' - 'updated_at';

  if v_core_new is distinct from v_core_old then
    raise exception 'budget_cascade_fields: seul le montant réel (actual_amount) est modifiable par le terrain';
  end if;

  return new;
end;
$$;

drop trigger if exists budget_cascade_lines_role_guard on public.budget_cascade_lines;
create trigger budget_cascade_lines_role_guard
  before update on public.budget_cascade_lines
  for each row
  execute function public.budget_cascade_lines_update_guard();

grant select on public.v_budget_cascade_rollup_by_post to authenticated;
grant select on public.v_budget_cascade_rollup_by_scope to authenticated;

commit;
