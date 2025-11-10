-- Ajout des nouvelles colonnes nécessaires à la gestion avancée des cours
-- À exécuter dans le schéma public de Supabase

-- ===== Table courses =====
alter table public.courses
  add column if not exists instructor_id uuid,
  add column if not exists requires_final_validation boolean default false,
  add column if not exists sequential_modules boolean default false,
  add column if not exists course_materials jsonb default '[]'::jsonb;

create index if not exists courses_instructor_id_idx on public.courses (instructor_id);

-- ===== Table course_modules =====
alter table public.course_modules
  add column if not exists requires_validation boolean default false,
  add column if not exists unlocks_next_module boolean default true,
  add column if not exists evidence_documents jsonb default '[]'::jsonb;

alter table public.course_modules
  alter column unlocks_next_module set default true;

update public.course_modules
set unlocks_next_module = true
where unlocks_next_module is distinct from true;

-- ===== Table course_lessons =====
alter table public.course_lessons
  add column if not exists description text,
  add column if not exists content_url text,
  add column if not exists attachments jsonb default '[]'::jsonb,
  add column if not exists external_links jsonb default '[]'::jsonb;

select pg_notify('pgrst', 'reload schema');

