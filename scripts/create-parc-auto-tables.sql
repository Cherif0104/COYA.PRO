-- ============================================================
-- TABLES PARC AUTO (Phase 4.3 – Véhicules, demandes)
-- ============================================================
-- Même logique que Logistique, dédié véhicules
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  plate_number TEXT,
  location TEXT,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicles of their org"
ON public.vehicles FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage vehicles"
ON public.vehicles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

CREATE TABLE IF NOT EXISTS public.vehicle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_org ON public.vehicle_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle ON public.vehicle_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON public.vehicle_requests(status);

ALTER TABLE public.vehicle_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicle_requests of their org"
ON public.vehicle_requests FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create vehicle_requests"
ON public.vehicle_requests FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  AND requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Managers can update vehicle_requests"
ON public.vehicle_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));
