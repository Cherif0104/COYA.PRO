-- Phase 4 Bloc 1.5: Fiche salarié (employees 1-1 avec profiles par organisation)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position text,
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cnss text,
  amo text,
  indemnities text,
  leave_rate numeric DEFAULT 1.5,
  tenure_date date,
  family_situation text,
  photo_url text,
  cv_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_mentor_id ON public.employees(mentor_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Lecture : propre fiche ou même organisation (RH/admin verra toutes)
DROP POLICY IF EXISTS "employees_select_own_or_org" ON public.employees;
CREATE POLICY "employees_select_own_or_org" ON public.employees
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Insert/Update : admin ou RH (même org)
DROP POLICY IF EXISTS "employees_insert_org_admin" ON public.employees;
CREATE POLICY "employees_insert_org_admin" ON public.employees
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')
    )
  );

DROP POLICY IF EXISTS "employees_update_own_or_admin" ON public.employees;
CREATE POLICY "employees_update_own_or_admin" ON public.employees
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')
    )
  );

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
