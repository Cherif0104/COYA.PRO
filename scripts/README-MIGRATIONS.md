# Migrations Supabase – Utilisation du MCP

Les migrations sont **appliquées via le MCP Supabase** (Cursor) ou **manuellement** dans le SQL Editor du Dashboard Supabase. Elles doivent être exécutées sur **le même projet** que celui utilisé par l’application (voir [docs/SUPABASE-PROJECT-ALIGNMENT.md](coya-pro/docs/SUPABASE-PROJECT-ALIGNMENT.md)).

## Alignement projet

- **App (coya-pro)** : utilise par défaut le projet `tdwbqgyubigaurnjzbfv` (URL dans [services/supabaseService.ts](coya-pro/services/supabaseService.ts)).
- **MCP** : peut pointer vers un autre projet. Vérifier avec l’outil `get_project_url`. Pour que les migrations MCP soient effectives sur l’app, configurer le MCP pour utiliser le projet `tdwbqgyubigaurnjzbfv`, **ou** exécuter les scripts SQL ci‑dessous dans le **SQL Editor** du Dashboard du projet utilisé par l’app.

## Outils MCP disponibles

- **`apply_migration`** : applique une migration (DDL). Paramètres : `name` (snake_case), `query` (SQL).
- **`list_migrations`** : liste les migrations déjà appliquées.
- **`execute_sql`** : exécute du SQL brut (requêtes, pas pour créer des tables de façon pérenne ; privilégier `apply_migration` pour le DDL).

## Ordre d’exécution des migrations (projet app)

À exécuter sur le **projet utilisé par l’app** (tdwbqgyubigaurnjzbfv), dans l’ordre suivant. Prérequis : tables `organizations` et `profiles` existantes (créées par le socle multi-tenant ou le template Supabase).

| Ordre | Nom logique | Fichier SQL | Remarque |
|-------|-------------|-------------|----------|
| 1 | Comptabilité – tables de base | `create-comptabilite-tables.sql` | Plan comptable, journaux, écritures, lignes. Nécessite `organizations`. |
| 2 | Comptabilité – extensions | `comptabilite-extensions.sql` | Cadre SYSCOHADA/SYCEBNL, PJ, centres de coûts, fiscal, budgets (compta). |
| 3 | Comptabilité – audit P2 | `comptabilite-audit-p2.sql` | accounting_permissions, fiscal_years, status écritures, audit log, organization_accounting_features. |
| 4 | Programme & Bailleur | `create-programme-bailleur-tables.sql` | bailleurs, programmes, programme_budget_lines, bénéficiaires. Nécessite `organizations`. |
| 5 | Postes | `create-postes-table.sql` | Table postes (rôle vs poste). Nécessite `organizations`. |
| 5b | Poste sur profil | `add-poste-id-to-profiles.sql` | Colonne `profiles.poste_id` (FK postes). À exécuter après create-postes-table. |
| 6 | Départements / user_departments | (à créer si manquant) | Tables `departments`, `user_departments` pour droits par département. |
| 7 | module_labels, dashboard_settings | (à créer si manquant) | Tables optionnelles pour libellés modules et paramètres dashboard. |
| 8 | presence_sessions | (à créer si manquant) | Table présence / pointage. |
| 9 | Type panne Ticket IT | `add-issue-type-to-it-tickets.sql` | Colonne `it_tickets.issue_type_id` (FK referential_values). Après create-referential-values-table. |
| 10 | Paie – bulletins | `create-pay-slips-table.sql` | Table `pay_slips` (profile_id, period, montants, status). |
| 11 | Logistique | `create-logistique-tables.sql` | Tables `equipments`, `equipment_requests`. |
| 12 | Parc automobile | `create-parc-auto-tables.sql` | Tables `vehicles`, `vehicle_requests`. |

Pour les migrations "fix 404" (départements, programme, presence_sessions, module_labels, dashboard_settings), si les tables n’existent pas encore sur le projet app, créer les fichiers SQL correspondants dans ce dossier (ou les extraire du plan consolidé) et les exécuter dans l’ordre après les tables de base (organizations, profiles).

## Migrations Comptabilité (détail)

1. **create_comptabilite_tables** (ou contenu de `create-comptabilite-tables.sql`) – Plan comptable, journaux, écritures, lignes (SYSCOHADA/SYCEBNL).
2. **comptabilite_extensions** (ou contenu de `comptabilite-extensions.sql`) – Cadre par org, pièces justificatives, centres de coûts, fiscal, budgets compta.
3. **comptabilite_audit_p2** (ou contenu de `comptabilite-audit-p2.sql`) – Droits granulaires, exercices, statut écritures, audit log, features.

Pour appliquer via MCP (une fois le MCP configuré sur le projet app) :

1. Lire le contenu du fichier `.sql` concerné.
2. Appeler `apply_migration` avec `name` en snake_case (ex. `create_comptabilite_tables`) et `query` = contenu du fichier.

## Exécution manuelle des migrations 10, 11, 12

Si le MCP Supabase pointe vers un autre projet ou si `organizations` n'existe pas sur le projet MCP, exécutez manuellement :

1. Ouvrez le **Dashboard Supabase** du projet utilisé par l'app (`tdwbqgyubigaurnjzbfv`) : https://supabase.com/dashboard/project/tdwbqgyubigaurnjzbfv
2. Allez dans **SQL Editor** → **New query**
3. Copiez-collez le contenu de **`run-migrations-10-11-12.sql`**
4. Cliquez sur **Run**

Ce script crée les tables `pay_slips`, `equipments`, `equipment_requests`, `vehicles`, `vehicle_requests` avec leurs politiques RLS.

## Storage

Le bucket **`accounting-attachments`** pour les pièces jointes des écritures n’est pas créé par les migrations. À créer manuellement dans le Dashboard Supabase (Storage → New bucket) si vous utilisez l’upload de fichiers en comptabilité.
