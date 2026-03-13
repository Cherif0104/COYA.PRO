-- ============================================================
-- Comptabilité – Audit P2 : droits granulaires, exercices, statut écritures, audit log, features
-- À exécuter après comptabilite-extensions.sql (et create-comptabilite-tables.sql)
-- ============================================================

-- 1) Droits Comptabilité par utilisateur (viewer | editor | validator | admin)
CREATE TABLE IF NOT EXISTS public.accounting_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'validator', 'admin')),
  allowed_journal_ids UUID[] DEFAULT NULL,
  allowed_cost_center_ids UUID[] DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_accounting_permissions_org ON public.accounting_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_permissions_user ON public.accounting_permissions(user_id);
ALTER TABLE public.accounting_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accounting permissions of their org" ON public.accounting_permissions FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage accounting permissions" ON public.accounting_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- 2) Exercices comptables (période ouverte / clôturée)
CREATE TABLE IF NOT EXISTS public.fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_fiscal_year_dates CHECK (date_end >= date_start)
);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_org ON public.fiscal_years(organization_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_dates ON public.fiscal_years(organization_id, date_start, date_end);
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fiscal years of their org" ON public.fiscal_years FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage fiscal years" ON public.fiscal_years FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- 3) Statut des écritures (draft / validated / locked) – suppression/modification selon statut
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'locked'));
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(organization_id, status);

-- 4) Journal d’audit des modifications d’écritures
CREATE TABLE IF NOT EXISTS public.journal_entry_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'validate', 'lock')),
  user_id UUID,
  at TIMESTAMPTZ DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);
CREATE INDEX IF NOT EXISTS idx_journal_entry_audit_entry ON public.journal_entry_audit_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_audit_at ON public.journal_entry_audit_log(at);
ALTER TABLE public.journal_entry_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view audit log of their org entries" ON public.journal_entry_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_audit_log.entry_id AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))));
-- Insert only via backend/triggers; no direct user INSERT policy for audit

-- 5) Options par organisation (activer/désactiver analytique, budget, fiscale, flux)
CREATE TABLE IF NOT EXISTS public.organization_accounting_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enable_analytical BOOLEAN DEFAULT true,
  enable_budget BOOLEAN DEFAULT true,
  enable_fiscal BOOLEAN DEFAULT true,
  enable_cash_flow_report BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);
CREATE INDEX IF NOT EXISTS idx_org_accounting_features_org ON public.organization_accounting_features(organization_id);
ALTER TABLE public.organization_accounting_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accounting features of their org" ON public.organization_accounting_features FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage accounting features" ON public.organization_accounting_features FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
