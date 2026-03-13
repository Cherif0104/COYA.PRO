-- ============================================================
-- Comptabilité SYSCOHADA / SYCEBNL (Phase 4 – Plan implantation)
-- Plan comptable, journaux, écritures, lignes d'écriture
-- ============================================================

-- Plan comptable (comptes)
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_org ON public.chart_of_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON public.chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chart of accounts of their org"
ON public.chart_of_accounts FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins and allowed roles can manage chart of accounts"
ON public.chart_of_accounts FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

-- Journaux comptables
CREATE TABLE IF NOT EXISTS public.accounting_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  journal_type TEXT NOT NULL DEFAULT 'general' CHECK (journal_type IN ('general', 'bank', 'cash', 'sales', 'purchase', 'various')),
  currency TEXT DEFAULT 'XOF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_accounting_journals_org ON public.accounting_journals(organization_id);

ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journals of their org"
ON public.accounting_journals FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins can manage journals"
ON public.accounting_journals FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

-- Pièces / écritures (en-tête)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  journal_id UUID NOT NULL REFERENCES public.accounting_journals(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON public.journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_journal ON public.journal_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries of their org"
ON public.journal_entries FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins and allowed can manage entries"
ON public.journal_entries FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

-- Lignes d'écriture (débit/crédit par compte)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  label TEXT,
  debit DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit DECIMAL(18,2) NOT NULL DEFAULT 0,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_debit_credit CHECK (debit >= 0 AND credit >= 0)
);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON public.journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lines of their org entries"
ON public.journal_entry_lines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_entry_lines.entry_id
    AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  )
);

CREATE POLICY "Admins can manage lines"
ON public.journal_entry_lines FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_entry_lines.entry_id
    AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_entry_lines.entry_id
    AND (je.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
         OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')))
  )
);
