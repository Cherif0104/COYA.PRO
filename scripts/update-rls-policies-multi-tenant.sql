-- ============================================================
-- MISE À JOUR DES RLS POLICIES POUR MULTI-TENANT
-- ============================================================
-- Ce script met à jour toutes les politiques RLS pour filtrer
-- automatiquement par organization_id
-- ============================================================

-- IMPORTANT: Les politiques RLS actuelles basées sur owner_id/user_id
-- doivent être complétées avec un filtre organization_id pour l'isolation
-- multi-tenant complète.

-- ============================================================
-- 1. PROJECTS - RLS Policies Multi-Tenant
-- ============================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users see only their organization's projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects in their organization" ON public.projects;

-- SELECT: Voir uniquement les projets de leur organisation
CREATE POLICY "Users see only their organization's projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Créer uniquement dans leur organisation
CREATE POLICY "Users can create projects in their organization"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Modifier uniquement dans leur organisation
CREATE POLICY "Users can update projects in their organization"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Supprimer uniquement dans leur organisation
CREATE POLICY "Users can delete projects in their organization"
ON public.projects
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 2. COURSES - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's courses" ON public.courses;
DROP POLICY IF EXISTS "Users can create courses in their organization" ON public.courses;
DROP POLICY IF EXISTS "Users can update courses in their organization" ON public.courses;
DROP POLICY IF EXISTS "Users can delete courses in their organization" ON public.courses;

CREATE POLICY "Users see only their organization's courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create courses in their organization"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update courses in their organization"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete courses in their organization"
ON public.courses
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 3. JOBS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs in their organization" ON public.jobs;
DROP POLICY IF EXISTS "Users can update jobs in their organization" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their organization" ON public.jobs;

CREATE POLICY "Users see only their organization's jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
  OR
  status = 'published' -- Les jobs publiés peuvent être vus par tous
);

CREATE POLICY "Users can create jobs in their organization"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update jobs in their organization"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete jobs in their organization"
ON public.jobs
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 4. OBJECTIVES - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can create objectives in their organization" ON public.objectives;
DROP POLICY IF EXISTS "Users can update objectives in their organization" ON public.objectives;
DROP POLICY IF EXISTS "Users can delete objectives in their organization" ON public.objectives;

CREATE POLICY "Users see only their organization's objectives"
ON public.objectives
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create objectives in their organization"
ON public.objectives
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update objectives in their organization"
ON public.objectives
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete objectives in their organization"
ON public.objectives
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 5. INVOICES - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices in their organization" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices in their organization" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices in their organization" ON public.invoices;

CREATE POLICY "Users see only their organization's invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create invoices in their organization"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invoices in their organization"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete invoices in their organization"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 6. EXPENSES - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses in their organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses in their organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses in their organization" ON public.expenses;

CREATE POLICY "Users see only their organization's expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create expenses in their organization"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update expenses in their organization"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete expenses in their organization"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 7. TIME_LOGS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's time_logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can create time_logs in their organization" ON public.time_logs;
DROP POLICY IF EXISTS "Users can update time_logs in their organization" ON public.time_logs;
DROP POLICY IF EXISTS "Users can delete time_logs in their organization" ON public.time_logs;

CREATE POLICY "Users see only their organization's time_logs"
ON public.time_logs
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create time_logs in their organization"
ON public.time_logs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update time_logs in their organization"
ON public.time_logs
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete time_logs in their organization"
ON public.time_logs
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 8. LEAVE_REQUESTS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create leave_requests in their organization" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update leave_requests in their organization" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can delete leave_requests in their organization" ON public.leave_requests;

CREATE POLICY "Users see only their organization's leave_requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create leave_requests in their organization"
ON public.leave_requests
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update leave_requests in their organization"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete leave_requests in their organization"
ON public.leave_requests
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 9. CONTACTS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON public.contacts;

CREATE POLICY "Users see only their organization's contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create contacts in their organization"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update contacts in their organization"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete contacts in their organization"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 10. MEETINGS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings in their organization" ON public.meetings;
DROP POLICY IF EXISTS "Users can update meetings in their organization" ON public.meetings;
DROP POLICY IF EXISTS "Users can delete meetings in their organization" ON public.meetings;

CREATE POLICY "Users see only their organization's meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create meetings in their organization"
ON public.meetings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update meetings in their organization"
ON public.meetings
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete meetings in their organization"
ON public.meetings
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 11. KNOWLEDGE_ARTICLES - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's knowledge_articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can create knowledge_articles in their organization" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can update knowledge_articles in their organization" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can delete knowledge_articles in their organization" ON public.knowledge_articles;

CREATE POLICY "Users see only their organization's knowledge_articles"
ON public.knowledge_articles
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
  OR
  is_public = true -- Les documents publics sont visibles par tous
);

CREATE POLICY "Users can create knowledge_articles in their organization"
ON public.knowledge_articles
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update knowledge_articles in their organization"
ON public.knowledge_articles
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete knowledge_articles in their organization"
ON public.knowledge_articles
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 12. JOB_APPLICATIONS - RLS Policies Multi-Tenant
-- ============================================================

DROP POLICY IF EXISTS "Users see only their organization's job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create job_applications in their organization" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update job_applications in their organization" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete job_applications in their organization" ON public.job_applications;

CREATE POLICY "Users see only their organization's job_applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
  OR
  user_id = auth.uid() -- Un utilisateur peut voir ses propres candidatures
);

CREATE POLICY "Users can create job_applications in their organization"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() -- Un utilisateur ne peut postuler qu'en son nom
  AND
  organization_id = (
    SELECT j.organization_id 
    FROM jobs j 
    WHERE j.id = job_applications.job_id
  )
);

CREATE POLICY "Users can update job_applications in their organization"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete job_applications in their organization"
ON public.job_applications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() -- Un utilisateur peut supprimer sa propre candidature
  OR
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- Note: Les Super Admins peuvent avoir besoin de politiques
-- supplémentaires pour voir toutes les organisations.
-- Cela peut être ajouté si nécessaire.
-- ============================================================


