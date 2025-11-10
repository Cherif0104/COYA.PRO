-- Script SQL pour créer les politiques RLS pour la table objectives
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Activer RLS sur la table objectives
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

-- 2. Politique pour permettre aux utilisateurs authentifiés de voir leurs propres objectifs
-- et les objectifs des projets auxquels ils participent
CREATE POLICY "Users can view their own objectives"
ON objectives
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id::text = objectives.project_id 
    AND (
      projects.owner_id = auth.uid()
      OR auth.uid() = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

-- 3. Politique pour permettre aux utilisateurs authentifiés de créer des objectifs
-- où ils sont le propriétaire
CREATE POLICY "Users can create their own objectives"
ON objectives
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- 4. Politique pour permettre aux utilisateurs authentifiés de modifier leurs propres objectifs
CREATE POLICY "Users can update their own objectives"
ON objectives
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 5. Politique pour permettre aux utilisateurs authentifiés de supprimer leurs propres objectifs
CREATE POLICY "Users can delete their own objectives"
ON objectives
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Note: Les administrateurs et super administrateurs peuvent avoir besoin de politiques supplémentaires
-- selon vos besoins spécifiques.

