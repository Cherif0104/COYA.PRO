-- ============================================================
-- MIGRATIONS 10, 11, 12 – À exécuter dans le SQL Editor Supabase
-- Projet : tdwbqgyubigaurnjzbfv (ou celui utilisé par l'app)
-- Prérequis : tables organizations et profiles existantes
-- ============================================================

-- ========== MIGRATION 10 : PAY_SLIPS (Paie) ==========
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

DROP POLICY IF EXISTS "Users can view pay_slips of their org" ON public.pay_slips;
CREATE POLICY "Users can view pay_slips of their org" ON public.pay_slips FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

DROP POLICY IF EXISTS "Admins and managers can insert pay_slips" ON public.pay_slips;
CREATE POLICY "Admins and managers can insert pay_slips" ON public.pay_slips FOR INSERT TO authenticated
WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

DROP POLICY IF EXISTS "Admins and managers can update pay_slips" ON public.pay_slips;
CREATE POLICY "Admins and managers can update pay_slips" ON public.pay_slips FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

DROP POLICY IF EXISTS "Admins can delete pay_slips" ON public.pay_slips;
CREATE POLICY "Admins can delete pay_slips" ON public.pay_slips FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator')));

-- ========== MIGRATION 11 : LOGISTIQUE ==========
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

DROP POLICY IF EXISTS "Users can view equipments of their org" ON public.equipments;
CREATE POLICY "Users can view equipments of their org" ON public.equipments FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can manage equipments" ON public.equipments;
CREATE POLICY "Managers can manage equipments" ON public.equipments FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Users can view equipment_requests of their org" ON public.equipment_requests;
CREATE POLICY "Users can view equipment_requests of their org" ON public.equipment_requests FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create equipment_requests" ON public.equipment_requests;
CREATE POLICY "Users can create equipment_requests" ON public.equipment_requests FOR INSERT TO authenticated
WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) AND requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can update equipment_requests" ON public.equipment_requests;
CREATE POLICY "Managers can update equipment_requests" ON public.equipment_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

-- ========== MIGRATION 12 : PARC AUTO ==========
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

DROP POLICY IF EXISTS "Users can view vehicles of their org" ON public.vehicles;
CREATE POLICY "Users can view vehicles of their org" ON public.vehicles FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can manage vehicles" ON public.vehicles;
CREATE POLICY "Managers can manage vehicles" ON public.vehicles FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Users can view vehicle_requests of their org" ON public.vehicle_requests;
CREATE POLICY "Users can view vehicle_requests of their org" ON public.vehicle_requests FOR SELECT TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create vehicle_requests" ON public.vehicle_requests;
CREATE POLICY "Users can create vehicle_requests" ON public.vehicle_requests FOR INSERT TO authenticated
WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()) AND requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can update vehicle_requests" ON public.vehicle_requests;
CREATE POLICY "Managers can update vehicle_requests" ON public.vehicle_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager')));

-- ========== FIN ==========
-- Si tout s'est bien passé, vous devriez voir : Success. No rows returned
