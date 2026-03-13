-- Libellés personnalisables des modules (super admin) – Phase 0.5
CREATE TABLE IF NOT EXISTS public.module_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  display_name_fr text,
  display_name_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_module_labels_org ON public.module_labels(organization_id);
CREATE INDEX IF NOT EXISTS idx_module_labels_key ON public.module_labels(module_key);

ALTER TABLE public.module_labels ENABLE ROW LEVEL SECURITY;

-- Lecture : selon organisation (profil) ou global (organization_id NULL)
DROP POLICY IF EXISTS "module_labels_select" ON public.module_labels;
CREATE POLICY "module_labels_select" ON public.module_labels
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Écriture : super_administrator (ou admin org selon besoin)
DROP POLICY IF EXISTS "module_labels_insert" ON public.module_labels;
CREATE POLICY "module_labels_insert" ON public.module_labels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
  );

DROP POLICY IF EXISTS "module_labels_update" ON public.module_labels;
CREATE POLICY "module_labels_update" ON public.module_labels
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
  );

DROP POLICY IF EXISTS "module_labels_delete" ON public.module_labels;
CREATE POLICY "module_labels_delete" ON public.module_labels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
  );

DROP TRIGGER IF EXISTS module_labels_updated_at ON public.module_labels;
CREATE TRIGGER module_labels_updated_at
  BEFORE UPDATE ON public.module_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
