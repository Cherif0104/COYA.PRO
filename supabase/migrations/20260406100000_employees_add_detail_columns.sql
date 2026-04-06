-- Aligner employees (hotfix minimal) avec la fiche salarié complète (cnss, amo, etc.)
-- Idempotent : safe si 20250220120000_add_employees.sql a déjà tout créé.

begin;

alter table if exists public.employees
  add column if not exists cnss text,
  add column if not exists amo text,
  add column if not exists indemnities text,
  add column if not exists tenure_date date,
  add column if not exists family_situation text,
  add column if not exists photo_url text,
  add column if not exists cv_url text;

alter table if exists public.employees
  add column if not exists work_mode text,
  add column if not exists hourly_rate numeric(12,2),
  add column if not exists expected_daily_minutes int default 480;

commit;
