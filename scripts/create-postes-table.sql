-- ============================================================
-- TABLE POSTES (Rôle vs Poste – socle RBAC Phase 0.2)
-- ============================================================
-- Poste = fonction dans l'organigramme (DG, DAF, Chef de projet, etc.)
-- Distinct du rôle système (Superadmin, Admin, Manager, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.postes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postes_organization ON public.postes(organization_id);
CREATE INDEX IF NOT EXISTS idx_postes_active ON public.postes(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_postes_org_slug ON public.postes(organization_id, slug)
  WHERE slug IS NOT NULL AND slug != '';

ALTER TABLE public.postes ENABLE ROW LEVEL SECURITY;

-- Utilisateurs authentifiés : voir postes de leur organisation ou postes globaux (organization_id NULL)
CREATE POLICY "Users can view postes of their org or global"
ON public.postes
FOR SELECT
TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

-- Admin / Super admin : créer, modifier, désactiver les postes
CREATE POLICY "Admins can insert postes"
ON public.postes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins can update postes"
ON public.postes
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins can delete postes"
ON public.postes
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);
