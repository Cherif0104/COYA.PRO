-- Phase 2: Departments and user_departments
-- Run this in Supabase SQL Editor if not using Supabase CLI.

-- 1. Table departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  module_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  sequence int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active) WHERE is_active = true;

-- 2. Table user_departments (user_id = auth user id, same as profiles.user_id)
CREATE TABLE IF NOT EXISTS public.user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  role_in_department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON public.user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON public.user_departments(department_id);

-- 3. RLS departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_own_org" ON public.departments;
CREATE POLICY "departments_select_own_org" ON public.departments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
CREATE POLICY "departments_insert_admin" ON public.departments
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );

DROP POLICY IF EXISTS "departments_update_admin" ON public.departments;
CREATE POLICY "departments_update_admin" ON public.departments
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );

DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;
CREATE POLICY "departments_delete_admin" ON public.departments
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );

-- 4. RLS user_departments
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_departments_select_own_org" ON public.user_departments;
CREATE POLICY "user_departments_select_own_org" ON public.user_departments
  FOR SELECT USING (
    department_id IN (
      SELECT id FROM public.departments d
      WHERE d.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "user_departments_insert_admin" ON public.user_departments;
CREATE POLICY "user_departments_insert_admin" ON public.user_departments
  FOR INSERT WITH CHECK (
    department_id IN (
      SELECT id FROM public.departments d
      WHERE d.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );

DROP POLICY IF EXISTS "user_departments_delete_admin_or_self" ON public.user_departments;
CREATE POLICY "user_departments_delete_admin_or_self" ON public.user_departments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')
    )
  );

-- 5. Seed 10 departments (SENEGEL default org)
INSERT INTO public.departments (organization_id, name, slug, sequence)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  v.name,
  v.slug,
  v.seq
FROM (VALUES
  ('Administratif & Financier', 'admin_financier', 10),
  ('Juridique', 'juridique', 20),
  ('Audiovisuel / Production', 'audiovisuel', 30),
  ('Formation & Bootcamp', 'formation_bootcamp', 40),
  ('RH', 'rh', 50),
  ('Project Management', 'pm', 60),
  ('Prospection & Partenariat', 'prospection_partenariat', 70),
  ('Conseil consultatif', 'conseil', 80),
  ('Qualité & Suivi performance', 'qualite', 90),
  ('IT & Tech Solutions', 'it_tech', 100)
) AS v(name, slug, seq)
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments
  WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000' AND slug = v.slug
);

-- Trigger updated_at for departments
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
