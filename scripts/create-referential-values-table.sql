-- ============================================================
-- TABLE REFERENTIAL_VALUES (référentiels extensibles type Odoo)
-- ============================================================
-- Une seule table pour tous les types de référentiels (contact_category, project_type, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referential_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referential_type TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referential_values_type_org ON public.referential_values(referential_type, organization_id);
CREATE INDEX IF NOT EXISTS idx_referential_values_type ON public.referential_values(referential_type);

ALTER TABLE public.referential_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referential values of their org or global"
ON public.referential_values
FOR SELECT
TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator'))
);

CREATE POLICY "Admins and managers can manage referential values"
ON public.referential_values
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('super_administrator', 'administrator', 'manager'))
);

-- Colonne catégorie sur contacts (si la table contacts existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'category_id') THEN
      ALTER TABLE public.contacts ADD COLUMN category_id UUID REFERENCES public.referential_values(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_contacts_category ON public.contacts(category_id);
    END IF;
  END IF;
END $$;
