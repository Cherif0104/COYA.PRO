# 📊 PLAN DE DÉVELOPPEMENT - MODULE FINANCE

**Date de démarrage :** 2025-01-XX  
**Statut :** 🚧 EN DÉVELOPPEMENT

---

## 📋 APERÇU DU MODULE

Le module Finance gère :
1. **Invoices** (Factures) - Factures clients avec statuts (Draft, Sent, Paid, Overdue, Partially Paid)
2. **Expenses** (Dépenses) - Dépenses avec catégories et lien vers budgets
3. **Recurring Invoices** (Factures récurrentes) - Génération automatique de factures
4. **Recurring Expenses** (Dépenses récurrentes) - Génération automatique de dépenses
5. **Budgets** (Budgets) - Budgets de projet ou de bureau avec lignes et items

---

## 🗄️ STRUCTURE BASE DE DONNÉES SUPABASE

### Table `invoices`
- `id` (UUID, PK)
- `invoice_number` (text, unique)
- `client_name` (text)
- `amount` (numeric)
- `due_date` (date)
- `status` (varchar) : 'draft', 'sent', 'paid', 'overdue', 'partially_paid'
- `paid_date` (date, nullable)
- `paid_amount` (numeric, nullable)
- `receipt_file_name` (text, nullable)
- `receipt_data_url` (text, nullable) - Base64 ou URL
- `recurring_source_id` (UUID, FK → recurring_invoices.id, nullable)
- `owner_id` (UUID, FK → profiles.id)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `expenses`
- `id` (UUID, PK)
- `category` (text) : 'Software', 'Office Supplies', 'Marketing', 'Utilities', 'Travel'
- `description` (text)
- `amount` (numeric)
- `date` (date)
- `due_date` (date, nullable)
- `status` (varchar) : 'paid', 'unpaid'
- `receipt_file_name` (text, nullable)
- `receipt_data_url` (text, nullable)
- `budget_item_id` (UUID, FK → budget_items.id, nullable)
- `recurring_source_id` (UUID, FK → recurring_expenses.id, nullable)
- `owner_id` (UUID, FK → profiles.id)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `recurring_invoices`
- `id` (UUID, PK)
- `client_name` (text)
- `amount` (numeric)
- `frequency` (varchar) : 'monthly', 'quarterly', 'annually'
- `start_date` (date)
- `end_date` (date, nullable)
- `last_generated_date` (date)
- `owner_id` (UUID, FK → profiles.id)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `recurring_expenses`
- `id` (UUID, PK)
- `category` (text)
- `description` (text)
- `amount` (numeric)
- `frequency` (varchar) : 'monthly', 'quarterly', 'annually'
- `start_date` (date)
- `end_date` (date, nullable)
- `last_generated_date` (date)
- `owner_id` (UUID, FK → profiles.id)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `budgets`
- `id` (UUID, PK)
- `title` (text)
- `type` (varchar) : 'project', 'office'
- `amount` (numeric)
- `start_date` (date)
- `end_date` (date)
- `project_id` (UUID, FK → projects.id, nullable)
- `owner_id` (UUID, FK → profiles.id)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `budget_lines`
- `id` (UUID, PK)
- `budget_id` (UUID, FK → budgets.id)
- `title` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Table `budget_items`
- `id` (UUID, PK)
- `budget_line_id` (UUID, FK → budget_lines.id)
- `description` (text)
- `amount` (numeric)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## 🔐 RLS POLICIES

### Invoices
- SELECT : Utilisateurs peuvent voir leurs propres factures
- INSERT : Utilisateurs peuvent créer leurs propres factures
- UPDATE : Utilisateurs peuvent modifier leurs propres factures
- DELETE : Utilisateurs peuvent supprimer leurs propres factures

### Expenses
- SELECT : Utilisateurs peuvent voir leurs propres dépenses
- INSERT : Utilisateurs peuvent créer leurs propres dépenses
- UPDATE : Utilisateurs peuvent modifier leurs propres dépenses
- DELETE : Utilisateurs peuvent supprimer leurs propres dépenses

### Recurring Invoices/Expenses
- SELECT : Utilisateurs peuvent voir leurs propres récurrences
- INSERT : Utilisateurs peuvent créer leurs propres récurrences
- UPDATE : Utilisateurs peuvent modifier leurs propres récurrences
- DELETE : Utilisateurs peuvent supprimer leurs propres récurrences

### Budgets
- SELECT : Utilisateurs peuvent voir leurs propres budgets
- INSERT : Utilisateurs peuvent créer leurs propres budgets
- UPDATE : Utilisateurs peuvent modifier leurs propres budgets
- DELETE : Utilisateurs peuvent supprimer leurs propres budgets (avec cascade pour lines/items)

---

## 🎨 MODERNISATION DE L'INTERFACE

### Header avec Gradient
- Gradient `from-emerald-600 to-blue-600` (cohérent avec les autres modules)
- Titre "Finance" avec sous-titre
- Boutons d'action rapides

### Métriques Power BI Style
- Total Revenue (revenus totaux)
- Total Expenses (dépenses totales)
- Net Income (revenu net)
- Outstanding Invoices (factures en attente)
- Due Expenses (dépenses dues)
- Average Payment Time (temps moyen de paiement)

### Fonctionnalités à Ajouter
- ✅ Recherche (par client, description, numéro de facture)
- ✅ Filtres (par statut, catégorie, date)
- ✅ Tri (par date, montant, statut)
- ✅ Vues multiples (Grid, List, Compact)
- ✅ Compteur de résultats filtrés
- ✅ État vide amélioré

---

## 📝 NOTES TECHNIQUES

- Les IDs passent de `number` à `UUID` (string)
- Les status sont en minuscules pour Supabase
- Les fichiers de reçus sont stockés en Base64 dans `receipt_data_url`
- Les budgets sont liés aux projets via `project_id`
- Les dépenses peuvent être liées aux items de budget via `budget_item_id`
- Les factures/dépenses récurrentes génèrent automatiquement de nouvelles entrées

---

## 🚀 ÉTAPES DE DÉVELOPPEMENT

1. ✅ Créer les tables Supabase (migrations SQL)
2. ✅ Créer les RLS policies
3. ✅ Implémenter CRUD dans `dataService.ts`
4. ✅ Implémenter mapping dans `dataAdapter.ts`
5. ✅ Moderniser l'interface `Finance.tsx`
6. ✅ Mettre à jour `App.tsx` pour charger depuis Supabase
7. ✅ Supprimer les données mockées
8. ✅ Tester et valider

---

**📌 PROCHAINE ÉTAPE :** Créer les migrations SQL pour toutes les tables Finance


