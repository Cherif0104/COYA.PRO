# 🔴 CORRECTION URGENTE - Contrainte CHECK invoices

## Problème

La table `invoices` dans Supabase a une contrainte CHECK qui bloque la création de factures avec le statut `partially_paid`.

**Erreur :** `new row for relation "invoices" violates check constraint "invoices_status_check"`

## Solution (2 minutes)

### Étape 1 : Ouvrir Supabase Dashboard
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet (tdwbqgyubigaurnjzbfv)

### Étape 2 : Ouvrir SQL Editor
1. Dans le menu de gauche, cliquer sur **"SQL Editor"**
2. Cliquer sur **"New query"**

### Étape 3 : Copier-coller ce script

```sql
-- ====================================================
-- CORRECTION : Contrainte CHECK invoices.status
-- ====================================================
-- Ce script corrige la contrainte CHECK pour accepter 'partially_paid'
-- ====================================================

-- ÉTAPE 1 : Supprimer l'ancienne contrainte
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

-- ÉTAPE 2 : Recréer la contrainte avec 'partially_paid' inclus
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL);

-- ÉTAPE 3 : Vérification (optionnel)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
AND contype = 'c'
AND conname = 'invoices_status_check';
```

### Étape 4 : Exécuter
1. Cliquer sur le bouton **"Run"** (ou appuyer sur `Ctrl+Enter`)
2. Attendre la confirmation "Success. No rows returned"

### Étape 5 : Vérifier
Vous devriez voir dans les résultats :
```
constraint_name: invoices_status_check
constraint_definition: CHECK (status IN ('draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'partially_paid'::text) OR status IS NULL)
```

### Étape 6 : Recharger l'application
1. Recharger la page de l'application (F5)
2. Essayer de créer une facture "Partiellement payé"

## ✅ Vérification

Après exécution, vous devriez pouvoir :
- ✅ Créer des factures avec le statut "Partiellement payé"
- ✅ Voir les factures partiellement payées dans la liste
- ✅ Modifier le montant payé des factures partiellement payées

## 🔍 Si ça ne fonctionne pas

1. Vérifier que vous êtes sur le bon projet Supabase
2. Vérifier que vous avez les droits d'administration
3. Vérifier les logs dans la console du navigateur
4. Réessayer en rafraîchissant la page

## 📞 Support

Si le problème persiste après avoir exécuté ce script, vérifier :
- Les logs de la console navigateur
- Les logs Supabase dans "Logs" > "Postgres Logs"
- La structure de la table dans "Table Editor" > "invoices"


