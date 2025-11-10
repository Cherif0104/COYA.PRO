-- Script SQL pour corriger la contrainte CHECK sur la colonne status de la table invoices
-- Ce script permet d'ajouter 'partially_paid' aux valeurs autorisées
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier la contrainte actuelle
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
AND contype = 'c'
AND conname LIKE '%status%';

-- 2. Supprimer toutes les contraintes CHECK existantes sur status
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Trouver et supprimer toutes les contraintes CHECK sur status
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass
        AND contype = 'c'
        AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
        RAISE NOTICE 'Contrainte % supprimée', constraint_record.conname;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Aucune contrainte status trouvée';
    END IF;
END $$;

-- 3. Recréer la contrainte avec toutes les valeurs valides incluant 'partially_paid'
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL);

-- 4. Vérifier que la contrainte est bien créée
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
AND contype = 'c'
AND conname = 'invoices_status_check';

-- 5. Afficher les valeurs uniques actuelles dans status pour vérification
SELECT DISTINCT status, COUNT(*) as count
FROM invoices
GROUP BY status
ORDER BY status;

-- ✅ Script terminé - La contrainte permet maintenant 'partially_paid'
