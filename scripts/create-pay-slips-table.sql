-- ============================================================
-- TABLE PAY_SLIPS (Phase 3.3 – Paie / bulletins)
-- ============================================================
-- Bulletins de paie par période et profil
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pay_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'XOF',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_slips_org ON public.pay_slips(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_slips_profile ON public.pay_slips(profile_id);
CREATE INDEX IF NOT EXISTS idx_pay_slips_period ON public.pay_slips(period_start, period_end);

ALTER TABLE public.pay_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pay_slips of their org"
ON public.pay_slips
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager'))
);

CREATE POLICY "Admins and managers can insert pay_slips"
ON public.pay_slips
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager'))
);

CREATE POLICY "Admins and managers can update pay_slips"
ON public.pay_slips
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager'))
);

CREATE POLICY "Admins can delete pay_slips"
ON public.pay_slips
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);
