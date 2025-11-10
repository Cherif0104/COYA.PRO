-- Script pour insérer les données de test des objectifs dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- Vérifier si la table objectives existe et l'initialiser si nécessaire
CREATE TABLE IF NOT EXISTS objectives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  owner_id UUID,
  owner_name TEXT,
  status TEXT DEFAULT 'active',
  progress DECIMAL DEFAULT 0,
  priority TEXT DEFAULT 'Medium',
  start_date DATE,
  end_date DATE,
  category TEXT,
  team_members JSONB DEFAULT '[]',
  key_results JSONB DEFAULT '[]',
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer l'objectif de test correspondant au MVP client
INSERT INTO objectives (
  title,
  project_id,
  key_results,
  created_at,
  updated_at
) VALUES (
  'Lancer avec succès la campagne du quatrième trimestre et obtenir une adoption rapide',
  '1',
  '[
    {
      "id": "kr1-1",
      "title": "Atteindre 10 000 inscriptions d''utilisateurs au cours du premier mois suivant le lancement",
      "current": 3500,
      "target": 10000,
      "unit": "utilisateurs"
    },
    {
      "id": "kr1-2", 
      "title": "Sécuriser 50 partenaires B2B pour intégrer le nouveau produit",
      "current": 5,
      "target": 50,
      "unit": "partenaires"
    },
    {
      "id": "kr1-3",
      "title": "Atteindre un score de satisfaction utilisateur de 8,5/10",
      "current": 0,
      "target": 8.5,
      "unit": "/10"
    }
  ]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Vérifier les données insérées
SELECT * FROM objectives;
