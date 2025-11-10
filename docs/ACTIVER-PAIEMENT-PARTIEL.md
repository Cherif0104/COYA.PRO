# ✅ Activer le Paiement Partiel/Différé

## 📋 RÉSUMÉ

La fonctionnalité de **paiement partiel/différé** a été implémentée dans le code. Il reste une étape importante : **mettre à jour la contrainte CHECK dans Supabase** pour accepter le statut `partially_paid`.

---

## 🔧 ACTION REQUISE (2 minutes)

### Exécuter le Script SQL dans Supabase

1. **Aller sur** https://supabase.com/dashboard
2. **Sélectionner votre projet**
3. **Ouvrir** "SQL Editor" → "New query"
4. **Copier-coller** ce script :

```sql
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Recréer la contrainte avec 'partially_paid' inclus
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid') OR status IS NULL);
```

5. **Cliquer** sur "Run"
6. **Vérifier** que vous voyez "Success. No rows returned"

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### 1. Interface Utilisateur
- ✅ Option "Partiellement payé" dans le formulaire de création/modification
- ✅ Champ "Montant payé" qui s'affiche automatiquement quand le statut est "Partiellement payé"
- ✅ Validation en temps réel avec calcul du reste à payer
- ✅ Affichage du montant payé dans le tableau (format: `$1500.00 / $3000.00`)

### 2. Calculs de Métriques
- ✅ **Revenu Total** : inclut les montants payés des factures partiellement payées
- ✅ **Factures Impayées** : calcule le montant restant pour les factures partiellement payées

### 3. Filtres et Recherche
- ✅ Filtre "Partiellement payé" dans la liste des factures
- ✅ Recherche fonctionne avec toutes les factures

### 4. Persistance Supabase
- ✅ Création de factures avec statut `partially_paid`
- ✅ Sauvegarde du champ `paid_amount` dans la base de données
- ✅ Mise à jour et récupération correctes des données

---

## 📊 EXEMPLE D'UTILISATION

### Créer une facture partiellement payée :

1. Cliquer sur "Nouvelle facture"
2. Remplir :
   - Client : "Client ABC"
   - Montant : `3000`
   - Date d'échéance : `2025-12-01`
   - **Statut : "Partiellement payé"**
3. Le champ "Montant payé" apparaît automatiquement
4. Saisir le montant payé : `1500`
5. Le système affiche : "Reste à payer: $1500.00"
6. Cliquer sur "Enregistrer"

### Résultat dans le tableau :
- **Montant affiché** : `$1500.00 / $3000.00`
- **Reste** : `$1500.00`
- **Badge** : `Partiellement payé` (fond jaune)

---

## 🔍 VÉRIFICATION

Après avoir exécuté le script SQL, tester :

1. **Créer une facture** avec statut "Partiellement payé"
2. **Vérifier** qu'elle s'enregistre sans erreur
3. **Vérifier** qu'elle apparaît dans la liste avec le bon affichage
4. **Vérifier** que les métriques sont correctement calculées

---

## ⚠️ NOTE IMPORTANTE

**Si vous voyez l'erreur** :
```
new row for relation "invoices" violates check constraint "invoices_status_check"
```

Cela signifie que le script SQL n'a pas encore été exécuté. Suivez les étapes ci-dessus.

---

**Fichiers modifiés** :
- ✅ `types.ts` - Interface Invoice mise à jour
- ✅ `components/Finance.tsx` - Formulaire et affichage
- ✅ `services/dataAdapter.ts` - Conversion des données
- ✅ `services/dataService.ts` - Gestion Supabase
- ✅ `App.tsx` - Logs et état

---

**Statut** : ✅ Code prêt - En attente d'exécution du script SQL dans Supabase


