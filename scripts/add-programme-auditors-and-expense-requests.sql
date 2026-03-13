-- Phase 2 – Programme : auditeurs externes (lecture seule) et demandes de dépense
-- À exécuter sur la base Supabase.

-- Auditeurs externes : droit lecture seule sur un programme
CREATE TABLE IF NOT EXISTS public.programme_auditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(programme_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_programme_auditors_programme ON public.programme_auditors(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_auditors_user ON public.programme_auditors(user_id);

ALTER TABLE public.programme_auditors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auditors of programmes they can access"
ON public.programme_auditors FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage programme auditors"
ON public.programme_auditors FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

-- Demandes de dépense : workflow demande → validation → justificatif
CREATE TABLE IF NOT EXISTS public.expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'quoted', 'validated', 'rejected', 'justified')),
  requested_by_id UUID,
  validated_by_id UUID,
  rejected_reason TEXT,
  justification_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_requests_programme ON public.expense_requests(programme_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON public.expense_requests(status);

ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expense requests of their org"
ON public.expense_requests FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Users can insert/update expense requests in their org"
ON public.expense_requests FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);
