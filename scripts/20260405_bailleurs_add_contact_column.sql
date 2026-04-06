-- Colonne manquante sur bailleurs (erreur PostgREST : « contact » introuvable dans le cache de schéma)
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.bailleurs
  ADD COLUMN IF NOT EXISTS contact TEXT;

COMMENT ON COLUMN public.bailleurs.contact IS 'Coordonnées du bailleur (email, téléphone, etc.)';

SELECT pg_notify('pgrst', 'reload schema');
