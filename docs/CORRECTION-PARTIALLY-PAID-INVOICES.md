# 🔧 Correction : Factures Partiellement Payées

**Date** : 2025-11-02  
**Problème** : Erreur 400 lors de la création de factures avec statut "Partially Paid"  
**Erreur** : `new row for relation "invoices" violates check constraint "invoices_status_check"`

---

## 🔍 DIAGNOSTIC

### Erreur Identifiée
```
❌ DataService.createInvoice - Erreur Supabase: 
{
  message: 'new row for relation "invoices" violates check constraint "invoices_status_check"',
  code: '23514'
}
```

### Cause
La table `invoices` a une contrainte CHECK sur la colonne `status` qui n'inclut **pas** la valeur `partially_paid`. La contrainte actuelle n'autorise probablement que :
- `draft`
- `sent`
- `paid`
- `overdue`

---

## ✅ SOLUTION

### Étape 1 : Exécuter le Script SQL

1. **Ouvrir l'éditeur SQL de Supabase**
   - Aller sur https://supabase.com
   - Sélectionner votre projet
   - Ouvrir l'onglet "SQL Editor"

2. **Exécuter le script** `scripts/fix-invoices-status-constraint.sql`

Ce script va :
- ✅ Vérifier les contraintes existantes
- ✅ Supprimer l'ancienne contrainte CHECK
- ✅ Recréer la contrainte avec `partially_paid` inclus
- ✅ Vérifier que la contrainte est bien créée

### Étape 2 : Vérifier la Colonne `paid_amount`

Assurez-vous aussi que la colonne `paid_amount` existe. Si elle n'existe pas :

1. **Exécuter le script** `scripts/ensure-invoices-paid-amount-column.sql`

---

## 📝 CORRECTIONS CODE APPLIQUÉES

### 1. Validation Améliorée
- ✅ Vérification que `paidAmount` > 0 et < `amount`
- ✅ Messages d'erreur clairs

### 2. Gestion des Colonnes
- ✅ Utilisation de `invoice_number` (basé sur les logs)
- ✅ Fallback vers `number` si erreur
- ✅ Gestion correcte de `paid_amount` (évite NaN)

### 3. Logs de Diagnostic
- ✅ Logs complets à tous les niveaux
- ✅ Affichage des erreurs détaillées de Supabase

---

## 🧪 TEST APRÈS CORRECTION

1. **Exécuter les scripts SQL** dans Supabase
2. **Tester la création** d'une facture "Partially Paid" :
   - Statut : "Partially Paid"
   - Montant total : 300000
   - Montant payé : 25000
3. **Vérifier** :
   - ✅ La facture est créée sans erreur
   - ✅ Elle apparaît dans la liste (filtre "all")
   - ✅ Elle apparaît avec le filtre "partially_paid"
   - ✅ Le montant affiché : `$25000 / $300000`

---

## 🔐 STRUCTURE FINALE

### Contrainte CHECK Status
```sql
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL)
```

### Colonnes Requises
- `invoice_number` (ou `number`)
- `client_name`
- `amount`
- `status`
- `due_date`
- `user_id`

### Colonnes Optionnelles
- `paid_amount` (pour Partially Paid)
- `paid_date`
- `receipt_file_name`
- `receipt_data_url`
- `recurring_source_id`

---

## 📋 FICHIERS MODIFIÉS

1. ✅ `scripts/fix-invoices-status-constraint.sql` - **NOUVEAU**
2. ✅ `scripts/ensure-invoices-paid-amount-column.sql` - Existant
3. ✅ `services/dataService.ts` - Gestion améliorée
4. ✅ `services/dataAdapter.ts` - Logs de diagnostic
5. ✅ `components/Finance.tsx` - Validation améliorée
6. ✅ `App.tsx` - Logs de diagnostic

---

## ⚠️ ACTION REQUISE

**IMPORTANT** : Exécuter le script SQL `fix-invoices-status-constraint.sql` dans Supabase avant de pouvoir créer des factures partiellement payées.

---

**Statut** : 🔧 Correction prête - En attente d'exécution du script SQL


