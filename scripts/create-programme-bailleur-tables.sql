-- ============================================================
-- TABLES PROGRAMME & BAILLEUR (Phase 3)
-- ============================================================
-- Bailleurs (donors), Programmes (donor-funded), lignes budgétaires, bénéficiaires
-- ============================================================

-- BAILLEURS
CREATE TABLE IF NOT EXISTS public.bailleurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bailleurs_organization ON public.bailleurs(organization_id);

ALTER TABLE public.bailleurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bailleurs of their org"
ON public.bailleurs FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins can manage bailleurs"
ON public.bailleurs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

-- PROGRAMMES
CREATE TABLE IF NOT EXISTS public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  bailleur_id UUID REFERENCES public.bailleurs(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programmes_organization ON public.programmes(organization_id);
CREATE INDEX IF NOT EXISTS idx_programmes_bailleur ON public.programmes(bailleur_id);

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view programmes of their org"
ON public.programmes FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins and managers can manage programmes"
ON public.programmes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

-- LIGNES BUDGÉTAIRES PROGRAMME
CREATE TABLE IF NOT EXISTS public.programme_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  planned_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF' CHECK (currency IN ('USD', 'EUR', 'XOF')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programme_budget_lines_programme ON public.programme_budget_lines(programme_id);

ALTER TABLE public.programme_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget lines of programmes they can see"
ON public.programme_budget_lines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.programmes p
    WHERE p.id = programme_budget_lines.programme_id
    AND (p.organization_id IS NULL OR p.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  )
);

CREATE POLICY "Admins and managers can manage programme budget lines"
ON public.programme_budget_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

-- BÉNÉFICIAIRES
CREATE TABLE IF NOT EXISTS public.beneficiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  project_id UUID,
  theme TEXT,
  target TEXT,
  gender TEXT,
  sector TEXT,
  country TEXT,
  region TEXT,
  contact TEXT,
  age TEXT,
  education TEXT,
  profession TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaires_organization ON public.beneficiaires(organization_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaires_programme ON public.beneficiaires(programme_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaires_project ON public.beneficiaires(project_id);

ALTER TABLE public.beneficiaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiaires of their org"
ON public.beneficiaires FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins and managers can manage beneficiaires"
ON public.beneficiaires FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));
