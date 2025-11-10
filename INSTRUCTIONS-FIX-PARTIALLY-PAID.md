# 🔧 INSTRUCTIONS URGENTES : Corriger les Factures Partiellement Payées

## ❌ PROBLÈME ACTUEL

Erreur : `new row for relation "invoices" violates check constraint "invoices_status_check"`

**La table `invoices` refuse le statut `partially_paid`.**

---

## ✅ SOLUTION RAPIDE (2 minutes)

### Étape 1 : Ouvrir l'Éditeur SQL de Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Cliquer sur **"SQL Editor"** dans le menu de gauche
4. Cliquer sur **"New query"**

### Étape 2 : Copier-Coller le Script SQL

Copier **TOUT** le contenu du fichier `scripts/fix-invoices-status-constraint-simple.sql` :

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Recréer la contrainte avec 'partially_paid' inclus
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL);
```

### Étape 3 : Exécuter le Script

1. Cliquer sur le bouton **"Run"** (ou appuyer sur `Ctrl+Enter`)
2. Attendre le message de succès ✅

### Étape 4 : Vérifier

Vous devriez voir un message comme :
- ✅ `Success. No rows returned`

Si vous voyez une erreur, partager le message d'erreur exact.

---

## 🧪 TESTER APRÈS CORRECTION

1. Recharger la page de l'application (`F5`)
2. Aller dans **Finance** → **Invoices**
3. Cliquer sur **"New Invoice"**
4. Remplir :
   - Client : `AFRO-FELLING`
   - Montant total : `3000000`
   - Montant payé : `1000000` (inférieur au total)
   - Statut : `Partially Paid`
5. Cliquer sur **"Save"**

**Résultat attendu** : ✅ La facture est créée et apparaît dans la liste

---

## ❓ PROBLÈME PERSISTE ?

Si l'erreur persiste après avoir exécuté le script SQL :

1. **Vérifier que le script a bien été exécuté** :
   - Dans Supabase SQL Editor, voir si le message "Success" apparaît
   
2. **Vérifier la contrainte actuelle** :
   Exécuter ce SQL dans Supabase :
   ```sql
   SELECT 
       conname AS constraint_name,
       pg_get_constraintdef(oid) AS constraint_definition
   FROM pg_constraint
   WHERE conrelid = 'invoices'::regclass
   AND contype = 'c'
   AND conname LIKE '%status%';
   ```
   
3. **Partager le résultat** avec moi pour diagnostic

---

## 📝 FICHIERS

- **Script SQL simple** : `scripts/fix-invoices-status-constraint-simple.sql`
- **Script SQL complet** : `scripts/fix-invoices-status-constraint.sql`

---

**TEMPS ESTIMÉ** : 2 minutes ⏱️

