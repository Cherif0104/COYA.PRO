-- ============================================================
-- TABLES LOGISTIQUE (Phase 4.2 – Équipements, demandes)
-- ============================================================
-- Workflow : demande → validation manager → mise à disposition → retour
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  location TEXT,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipments_org ON public.equipments(organization_id);

ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipments of their org"
ON public.equipments FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage equipments"
ON public.equipments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

CREATE TABLE IF NOT EXISTS public.equipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'validated', 'allocated', 'returned', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  allocated_at TIMESTAMPTZ,
  return_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_requests_org ON public.equipment_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_equipment ON public.equipment_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_status ON public.equipment_requests(status);

ALTER TABLE public.equipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment_requests of their org"
ON public.equipment_requests FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create equipment_requests"
ON public.equipment_requests FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  AND requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Managers can update equipment_requests"
ON public.equipment_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));
