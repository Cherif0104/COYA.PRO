-- ============================================================
-- Ajouter poste_id à profiles (Rôle vs Poste – Phase 0.4)
-- À exécuter après create-postes-table.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS poste_id UUID REFERENCES public.postes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_poste_id ON public.profiles(poste_id);
