-- Colonne manquante sur bailleurs → requêtes REST 400 (select …, contact)
-- À exécuter dans Supabase → SQL Editor si le module Programme échoue au chargement des bailleurs.

begin;

alter table public.bailleurs add column if not exists contact text;

commit;

notify pgrst, 'reload schema';
