-- ============================================================
-- Comptabilité – Extensions (bilans mensuels, analytique, fiscal, budget, flux, pièces justificatives, SYSCOHADA/SYCEBNL)
-- À exécuter après create-comptabilite-tables.sql
-- ============================================================

-- Cadre comptable par organisation (SYSCOHADA vs SYCEBNL / EBNL)
CREATE TABLE IF NOT EXISTS public.organization_accounting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accounting_framework TEXT NOT NULL DEFAULT 'syscohada' CHECK (accounting_framework IN ('syscohada', 'sycebnl')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);
CREATE INDEX IF NOT EXISTS idx_org_accounting_settings_org ON public.organization_accounting_settings(organization_id);
ALTER TABLE public.organization_accounting_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view settings of their org" ON public.organization_accounting_settings FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage settings" ON public.organization_accounting_settings FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- Plan comptable : cadre optionnel par compte (both = les deux) ; compte de trésorerie pour flux
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS framework TEXT DEFAULT 'both' CHECK (framework IN ('both', 'syscohada', 'sycebnl'));
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_cash_flow_register BOOLEAN DEFAULT false;

-- Pièces justificatives sur l'écriture (traçabilité)
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('file', 'link', 'resource') OR attachment_type IS NULL);
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS resource_name TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS resource_database_url TEXT;

-- Pièces jointes binaires (fichiers) par écriture.
-- Créer le bucket Supabase Storage "accounting-attachments" (Dashboard > Storage > New bucket) si vous utilisez l’upload de fichiers.
CREATE TABLE IF NOT EXISTS public.journal_entry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_entry_attachments_entry ON public.journal_entry_attachments(entry_id);
ALTER TABLE public.journal_entry_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view attachments of their org entries" ON public.journal_entry_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_attachments.entry_id AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))));
CREATE POLICY "Admins can manage attachments" ON public.journal_entry_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_attachments.entry_id AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))))
  WITH CHECK (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_attachments.entry_id AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))));

-- Centres de coûts (comptabilité analytique)
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON public.cost_centers(organization_id);
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view cost centers of their org" ON public.cost_centers FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage cost centers" ON public.cost_centers FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- Lignes d'écriture : centre analytique et code fiscal
ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS fiscal_code TEXT;
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_cost_center ON public.journal_entry_lines(cost_center_id);

-- Règles fiscales (taux, libellé) – optionnel
CREATE TABLE IF NOT EXISTS public.fiscal_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  rate DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_fiscal_rules_org ON public.fiscal_rules(organization_id);
ALTER TABLE public.fiscal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fiscal rules of their org" ON public.fiscal_rules FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage fiscal rules" ON public.fiscal_rules FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- Budgets (prévisionnel)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budgets_org ON public.budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year ON public.budgets(organization_id, fiscal_year);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view budgets of their org" ON public.budgets FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));
CREATE POLICY "Admins can manage budgets" ON public.budgets FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- Lignes de budget (compte + centre optionnel + montant prévu)
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON public.budget_lines(account_id);
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view budget lines of their org" ON public.budget_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND (b.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))));
CREATE POLICY "Admins can manage budget lines" ON public.budget_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND (b.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))))
  WITH CHECK (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND (b.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))));
