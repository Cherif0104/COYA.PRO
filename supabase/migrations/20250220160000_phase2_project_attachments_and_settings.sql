-- Phase 2.4 – Pièces jointes projets (Storage + BDD) et administration module Projets
-- Tables: project_attachments, project_module_settings.
-- IMPORTANT : Créer le bucket Storage "project-attachments" (privé) dans Supabase Dashboard > Storage si pas déjà fait.

-- 1) Pièces jointes projets (lien BDD vers Storage)
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  uploaded_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON public.project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_org ON public.project_attachments(organization_id);

ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_attachments_select" ON public.project_attachments;
CREATE POLICY "project_attachments_select" ON public.project_attachments FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_attachments_insert" ON public.project_attachments;
CREATE POLICY "project_attachments_insert" ON public.project_attachments FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_attachments_delete" ON public.project_attachments;
CREATE POLICY "project_attachments_delete" ON public.project_attachments FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 2) Paramètres du module Projets (une ligne par organisation)
CREATE TABLE IF NOT EXISTS public.project_module_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_types jsonb NOT NULL DEFAULT '["Projet interne", "Client", "Partenariat", "Recherche"]',
  statuses jsonb NOT NULL DEFAULT '["Not Started", "In Progress", "Completed", "On Hold", "Cancelled"]',
  alert_delay_days int NOT NULL DEFAULT 3,
  task_templates jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_module_settings_org ON public.project_module_settings(organization_id);

ALTER TABLE public.project_module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_module_settings_select" ON public.project_module_settings;
CREATE POLICY "project_module_settings_select" ON public.project_module_settings FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_module_settings_insert" ON public.project_module_settings;
CREATE POLICY "project_module_settings_insert" ON public.project_module_settings FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_module_settings_update" ON public.project_module_settings;
CREATE POLICY "project_module_settings_update" ON public.project_module_settings FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP TRIGGER IF EXISTS project_module_settings_updated_at ON public.project_module_settings;
CREATE TRIGGER project_module_settings_updated_at
  BEFORE UPDATE ON public.project_module_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
