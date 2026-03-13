-- Lien projet ↔ programme (Phase 1 – Plan implantation COYA.PRO)
-- À exécuter sur la base Supabase si la colonne n'existe pas.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'programme_id') THEN
      ALTER TABLE public.projects
        ADD COLUMN programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_projects_programme_id ON public.projects(programme_id);
    END IF;
  END IF;
END $$;
