-- Paramètres du tableau de bord par organisation (Phase 1.3)
-- Fonction updated_at si absente (compatibilité)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.dashboard_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, widget_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_settings_org ON public.dashboard_settings(organization_id);

ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_settings_select" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_select" ON public.dashboard_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dashboard_settings_insert" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_insert" ON public.dashboard_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
    OR organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dashboard_settings_update" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_update" ON public.dashboard_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
    OR organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dashboard_settings_delete" ON public.dashboard_settings;
CREATE POLICY "dashboard_settings_delete" ON public.dashboard_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_administrator')
    OR organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS dashboard_settings_updated_at ON public.dashboard_settings;
CREATE TRIGGER dashboard_settings_updated_at
  BEFORE UPDATE ON public.dashboard_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
