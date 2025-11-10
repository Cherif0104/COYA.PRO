-- ====================================================
-- CORRECTION URGENTE : Contrainte CHECK invoices.status
-- ====================================================
-- Ce script corrige la contrainte CHECK pour accepter 'partially_paid'
-- À COPIER-COLLER DANS L'ÉDITEUR SQL DE SUPABASE
-- ====================================================

-- ÉTAPE 1 : Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

-- ÉTAPE 2 : Recréer la contrainte avec 'partially_paid' inclus
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL);

-- ÉTAPE 3 : Vérification (optionnel - pour confirmer que ça a marché)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
AND contype = 'c'
AND conname = 'invoices_status_check';

-- ✅ Si vous voyez "CHECK (status IN ('draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'partially_paid'::text) OR status IS NULL)"
--    alors c'est bon ! Vous pouvez maintenant créer des factures "Partially Paid"

