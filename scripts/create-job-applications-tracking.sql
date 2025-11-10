-- Création de la table job_applications pour tracker les candidatures avec source
CREATE TABLE IF NOT EXISTS public.job_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('online', 'email', 'link', 'direct')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  match_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Empêcher les doublons (un utilisateur ne peut postuler qu'une fois par offre)
  UNIQUE(job_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_source ON public.job_applications(source);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

-- Enable Row Level Security
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Policies RLS
-- Les utilisateurs peuvent voir leurs propres candidatures
CREATE POLICY "Users can view their own applications"
  ON public.job_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les employeurs/administrateurs peuvent voir toutes les candidatures pour leurs offres
CREATE POLICY "Employers can view applications for their jobs"
  ON public.job_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles p ON j.created_by = p.user_id
      WHERE j.id = job_applications.job_id
      AND (p.role IN ('employer', 'administrator', 'super_administrator') OR j.created_by = auth.uid())
    )
  );

-- Les utilisateurs peuvent créer leurs propres candidatures
CREATE POLICY "Users can create their own applications"
  ON public.job_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les employeurs/administrateurs peuvent mettre à jour les candidatures pour leurs offres
CREATE POLICY "Employers can update applications for their jobs"
  ON public.job_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles p ON j.created_by = p.user_id
      WHERE j.id = job_applications.job_id
      AND (p.role IN ('employer', 'administrator', 'super_administrator') OR j.created_by = auth.uid())
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_job_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_job_applications_updated_at();

-- Fonction pour mettre à jour applicants_count dans jobs quand une candidature est ajoutée
CREATE OR REPLACE FUNCTION update_job_applicants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.jobs
  SET applicants_count = (
    SELECT COUNT(*) FROM public.job_applications WHERE job_id = NEW.job_id
  )
  WHERE id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le compteur
CREATE TRIGGER update_job_applicants_count_on_insert
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_job_applicants_count();

CREATE TRIGGER update_job_applicants_count_on_delete
  AFTER DELETE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_job_applicants_count();

-- Activer Realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE job_applications;

-- Commentaires
COMMENT ON TABLE public.job_applications IS 'Table pour tracker les candidatures avec leur source (online, email, link)';
COMMENT ON COLUMN public.job_applications.source IS 'Source de la candidature: online (bouton Postuler), email (lien mailto), link (lien externe), direct (autre)';
COMMENT ON COLUMN public.job_applications.status IS 'Statut de la candidature: pending, reviewed, shortlisted, rejected, hired';
COMMENT ON COLUMN public.job_applications.match_score IS 'Score de correspondance calculé (0-100)';

