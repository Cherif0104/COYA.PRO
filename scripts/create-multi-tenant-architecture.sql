-- ============================================================
-- ARCHITECTURE MULTI-TENANT POUR ECOSYSTIA
-- ============================================================
-- Ce script crée la structure pour permettre à plusieurs
-- organisations partenaires d'avoir leurs propres espaces
-- isolés tout en partageant la même application
-- ============================================================

-- 1. CRÉER LA TABLE ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- 'senegel', 'partenaire1', etc.
  description TEXT,
  logo_url TEXT,
  website TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active);

-- Activer RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour organizations
-- Les utilisateurs peuvent voir leur propre organisation
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('super_administrator', 'administrator')
  )
);

-- Super Admin peut créer des organisations
CREATE POLICY "Super Admin can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_administrator'
  )
);

-- Super Admin peut modifier des organisations
CREATE POLICY "Super Admin can update organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_administrator'
  )
);

-- Super Admin peut supprimer des organisations
CREATE POLICY "Super Admin can delete organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_administrator'
  )
);

-- Insérer SENEGEL comme organisation principale
INSERT INTO public.organizations (id, name, slug, description, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'SENEGEL',
  'senegel',
  'Organisation principale - Propriétaire de la plateforme EcosystIA',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 2. S'ASSURER QUE TOUTES LES TABLES ONT organization_id
-- ============================================================

-- Vérifier et ajouter organization_id si manquant
DO $$ 
BEGIN
  -- Projects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='organization_id') THEN
    ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
  END IF;

  -- Courses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='courses' AND column_name='organization_id') THEN
    ALTER TABLE public.courses ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_courses_organization_id ON public.courses(organization_id);
  END IF;

  -- Jobs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='jobs' AND column_name='organization_id') THEN
    ALTER TABLE public.jobs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_jobs_organization_id ON public.jobs(organization_id);
  END IF;

  -- Objectives
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='objectives' AND column_name='organization_id') THEN
    ALTER TABLE public.objectives ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_objectives_organization_id ON public.objectives(organization_id);
  END IF;

  -- Invoices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='invoices' AND column_name='organization_id') THEN
    ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
  END IF;

  -- Expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='organization_id') THEN
    ALTER TABLE public.expenses ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);
  END IF;

  -- Time Logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='time_logs' AND column_name='organization_id') THEN
    ALTER TABLE public.time_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_time_logs_organization_id ON public.time_logs(organization_id);
  END IF;

  -- Leave Requests
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='leave_requests' AND column_name='organization_id') THEN
    ALTER TABLE public.leave_requests ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_organization_id ON public.leave_requests(organization_id);
  END IF;

  -- Contacts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='contacts' AND column_name='organization_id') THEN
    ALTER TABLE public.contacts ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON public.contacts(organization_id);
  END IF;

  -- Meetings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='meetings' AND column_name='organization_id') THEN
    ALTER TABLE public.meetings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON public.meetings(organization_id);
  END IF;

  -- Knowledge Articles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='knowledge_articles' AND column_name='organization_id') THEN
    ALTER TABLE public.knowledge_articles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_organization_id ON public.knowledge_articles(organization_id);
  END IF;

  -- Job Applications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='job_applications' AND column_name='organization_id') THEN
    ALTER TABLE public.job_applications ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    CREATE INDEX IF NOT EXISTS idx_job_applications_organization_id ON public.job_applications(organization_id);
  END IF;
END $$;

-- 3. MIGRER LES DONNÉES EXISTANTES VERS SENEGEL
-- ============================================================
UPDATE public.profiles 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000' -- SENEGEL
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.projects 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.courses 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.jobs 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.objectives 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.invoices 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.expenses 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.time_logs 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.id = time_logs.user_id
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.leave_requests 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.id = leave_requests.user_id
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.contacts 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.user_id = contacts.created_by
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.meetings 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.id = meetings.created_by
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.knowledge_articles 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.user_id = knowledge_articles.user_id
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.job_applications 
SET organization_id = (
  SELECT j.organization_id FROM jobs j WHERE j.id = job_applications.job_id
)
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM public.organizations);

-- 4. CRÉER UNE FONCTION HELPER POUR RÉCUPÉRER L'ORGANIZATION_ID
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ACTIVER REALTIME POUR ORGANIZATIONS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;

-- 6. COMMENTAIRES
-- ============================================================
COMMENT ON TABLE public.organizations IS 'Table centrale pour la gestion multi-tenant - Chaque organisation a son espace isolé';
COMMENT ON COLUMN public.organizations.slug IS 'Identifiant unique textuel pour l''organisation (ex: senegel, partenaire1)';
COMMENT ON COLUMN public.organizations.is_active IS 'Permet de désactiver une organisation sans la supprimer';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================


