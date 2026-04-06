-- Formation (cours) : lien programme + quiz par leçon
-- Exécuter dans Supabase SQL Editor (schéma public).
-- Requiert la table public.programmes (module Programme).

alter table public.courses
  add column if not exists programme_id uuid references public.programmes (id) on delete set null,
  add column if not exists audience_segment text;

create index if not exists courses_programme_id_idx on public.courses (programme_id);

alter table public.course_lessons
  add column if not exists quiz jsonb default null;

comment on column public.courses.programme_id is 'Optionnel : rattache le cours au module Programme.';
comment on column public.courses.audience_segment is 'general | incubated | beneficiary — cible UX / parcours.';
comment on column public.course_lessons.quiz is 'JSON { "questions": [ CourseQuizQuestion ] } pour leçons type quiz.';

select pg_notify('pgrst', 'reload schema');
