-- Migration pour corriger la contrainte CHECK sur profiles.role
-- Cette contrainte doit autoriser tous les rôles du MVP COYA

-- 1. Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Créer la nouvelle contrainte avec tous les rôles autorisés
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    -- Rôles de gestion
    'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
    -- Rôles pédagogiques et facilitation
    'trainer', 'coach', 'facilitator', 'mentor',
    -- Rôles partenaires (mapping pour partner_facilitator)
    'partner', 'supplier', 'service_provider',
    -- Rôles académiques
    'student', 'learner', 'alumni',
    -- Rôles entrepreneuriaux
    'entrepreneur', 'employer', 'implementer', 'funder',
    -- Rôles créatifs
    'publisher', 'editor', 'producer', 'artist',
    -- Rôles IA/Tech (legacy - à garder pour compatibilité avec données existantes)
    'ai_coach', 'ai_developer', 'ai_analyst',
    -- Anciens rôles à migrer progressivement
    'professor'
  )
);

-- 3. Nettoyer les rôles non conformes (optionnel, à décommenter si besoin)
-- UPDATE profiles SET role = 'facilitator' WHERE role = 'partner_facilitator';
-- UPDATE profiles SET role = 'trainer' WHERE role = 'professor';
-- UPDATE profiles SET role = 'student' WHERE role = 'learner';

-- 4. Vérifier les profils avec des rôles invalides
SELECT id, email, role, created_at 
FROM profiles 
WHERE role NOT IN (
  'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
  'trainer', 'coach', 'facilitator', 'mentor',
  'partner', 'supplier', 'service_provider',
  'student', 'learner', 'alumni',
  'entrepreneur', 'employer', 'implementer', 'funder',
  'publisher', 'editor', 'producer', 'artist',
  'ai_coach', 'ai_developer', 'ai_analyst',
  'professor'
)
ORDER BY created_at DESC;

