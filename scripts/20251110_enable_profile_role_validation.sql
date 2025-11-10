-- =======================================================================
-- Script : 20251110_enable_profile_role_validation.sql
-- Objet  : Préparation du workflow d'approbation des rôles utilisateurs.
--          - Ajout des colonnes nécessaires sur "profiles"
--          - Création d'une table d'audit des décisions
--          - Initialisation des comptes existants
-- =======================================================================

-- 1) Colonnes complémentaires sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pending_role TEXT,
  ADD COLUMN IF NOT EXISTS review_comment TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

-- 2) Table d'historique des validations
CREATE TABLE IF NOT EXISTS public.role_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment TEXT,
  decided_by UUID NOT NULL REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_approval_logs_profile
  ON public.role_approval_logs(profile_id);

-- 3) Mise à jour des comptes existants : tout compte actuel passe en "active"
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL OR status = '';

-- 4) Garde-fous : pending_role doit être nul si le compte est actif ou rejeté
UPDATE public.profiles
SET pending_role = NULL
WHERE status IN ('active', 'rejected') AND pending_role IS NOT NULL;

-- 5) Exemple de policy RLS à adapter (documentation)
-- NOTE : Les politiques doivent être appliquées directement dans Supabase.
-- Exemple :
--   CREATE POLICY "profiles_read_own_or_admin"
--     ON public.profiles
--     FOR SELECT
--     USING (
--       auth.role() = 'service_role'
--       OR auth.uid() = id
--       OR EXISTS (
--         SELECT 1 FROM public.profiles p
--         WHERE p.id = auth.uid() AND p.role = 'super_administrator'
--       )
--     );
--
--   CREATE POLICY "profiles_update_self"
--     ON public.profiles
--     FOR UPDATE
--     USING (auth.uid() = id)
--     WITH CHECK (auth.uid() = id AND status IN ('pending', 'active'));
--
--   CREATE POLICY "profiles_admin_validate_roles"
--     ON public.profiles
--     FOR UPDATE
--     USING (
--       EXISTS (
--         SELECT 1 FROM public.profiles p
--         WHERE p.id = auth.uid() AND p.role = 'super_administrator'
--       )
--     )
--     WITH CHECK (TRUE);

