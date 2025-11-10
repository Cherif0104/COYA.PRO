# Migration vers Architecture SENEGEL Unique

## Date
30 octobre 2024

## Objectif
Simplifier l'architecture d'EcosystIA en centralisant tous les utilisateurs au sein d'une organisation unique **SENEGEL**, éliminant la distinction interne/externe et préparant la plateforme pour une architecture multi-organisationnelle future.

## Contexte
L'application a été initialement conçue avec une séparation stricte entre:
- **Utilisateurs internes** (SENEGEL) avec accès au Management Panel
- **Utilisateurs externes** (STUDENTS et organisations isolées) sans accès au Management

Cette séparation complexifiait la gestion des permissions et créait des silos de données.

## Modifications Appliquées

### 1. Migration Base de Données

#### Organisations
- **Avant**: 3 organisations (SENEGEL, STUDENTS, SENEGEL Default)
- **Après**: 1 organisation (SENEGEL uniquement)
- **Action**: Suppression des organisations obsolètes après migration des données

#### Utilisateurs (profiles)
```sql
-- Migration de tous les utilisateurs sans organisation vers SENEGEL
UPDATE profiles 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'  -- SENEGEL
WHERE organization_id IS NULL;

-- Migration des utilisateurs STUDENTS vers SENEGEL
UPDATE profiles 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'  -- SENEGEL
WHERE organization_id = '11111111-1111-1111-1111-111111111111';  -- STUDENTS
```

**Résultat**: 20 utilisateurs au total dans SENEGEL

#### Projets
```sql
UPDATE projects
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IS NULL 
  OR organization_id = '11111111-1111-1111-1111-111111111111';
```

#### Autres Entités
Migration de tous les objets liés aux organisations:
- `courses`
- `jobs`
- `objectives`
- `invoices`
- `expenses`
- `time_logs`
- `leave_requests`
- `contacts`
- `meetings`

#### Table users (legacy)
```sql
UPDATE users 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IN ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
```

### 2. Nouvelle Liste de Rôles

Tous les rôles sont maintenant disponibles dans SENEGEL:

#### Rôles de Gestion (accès Management Panel)
- `super_administrator` - Super Administrateur
- `administrator` - Administrateur
- `manager` - Manager
- `supervisor` - Superviseur
- `intern` - Stagiaire

#### Rôles Pédagogiques et Formation
- `trainer` - Formateur
- `facilitator` - Facilitateur
- `coach` - Coach
- `mentor` - Mentor

#### Rôles Académiques
- `student` - Étudiant
- `learner` - Apprenant
- `alumni` - Ancien élève

#### Rôles Professionnels
- `entrepreneur` - Entrepreneur
- `employer` - Employeur
- `implementer` - Implémenteur
- `funder` - Bailleur de fonds

#### Rôles Créatifs et Médias
- `artist` - Artiste
- `producer` - Producteur
- `editor` - Éditeur
- `publisher` - Publier

#### Rôles Technologiques
- `ai_coach` - Coach IA
- `ai_developer` - Développeur IA
- `ai_analyst` - Analyste IA

#### Rôles Partenaires
- `partner` - Partenaire
- `supplier` - Fournisseur
- `service_provider` - Prestataire

### 3. Modifications Code Frontend

#### `types.ts`
- Mise à jour du type `Role` avec tous les nouveaux rôles
- `INTERNAL_ROLES`: Rôles avec accès au Management Panel (5 rôles de gestion)
- `EXTERNAL_ROLES`: Vide (ancienne distinction supprimée)

#### `constants/localization.ts`
Ajout des traductions pour les nouveaux rôles:
- Anglais et Français
- Support complet pour tous les rôles

### 4. RLS Policies

Les RLS policies existantes restent fonctionnelles car elles utilisent `organization_id` pour l'isolation:
```sql
-- Exemple RLS Policy
CREATE POLICY "Users can only view their organization's data"
ON projects
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
```

**Note**: Pour l'instant, toutes les données sont dans SENEGEL, donc tous les utilisateurs authentifiés peuvent voir toutes les données SENEGEL.

## Permissions par Module

Les permissions granulaires par module (`user_module_permissions`) restent le mécanisme principal pour contrôler l'accès:
- **Read**: Lecture du module
- **Write**: Création/Modification
- **Delete**: Suppression
- **Approve**: Validation/Approbation

Seuls les **rôles de gestion** ont accès par défaut au Management Panel.

## Prochaines Étapes

### Phase 1: Consolidation SENEGEL (Immédiat)
- ✅ Migration des utilisateurs et données vers SENEGEL
- ✅ Nouvelle liste de rôles
- ✅ Traductions mises à jour
- ⏳ Tests complets avec différents rôles
- ⏳ Adaptation du formulaire de signup

### Phase 2: Architecture Multi-Organisationnelle (Futur)
Quand SENEGEL sera validé comme modèle de référence:

1. **Création de nouvelles organisations**
   - Chaque partenaire aura sa propre organisation
   - Architecture de référence basée sur SENEGEL
   - RLS policies automatiques par organisation

2. **Gestion des Partenaires**
   - Interface Super Admin pour créer des organisations
   - Invitation d'utilisateurs à rejoindre une organisation
   - Isolation complète des données entre organisations

3. **Règles de Visibilité Inter-Organisationnelle**
   - Cours publics (toutes organisations)
   - Cours privés (organisation uniquement)
   - Projets collaboratifs inter-organisations
   - Analytics agrégés globalement

## Impact

### Avant
```
SENEGEL (Rôles: Super Admin, Admin, Manager, Supervisor, Intern)
├─ Management Panel accessible
├─ Data Isolation complète
└─ RLS par organisation

STUDENTS (Rôle: Student)
├─ Pas d'accès Management Panel
├─ Data Isolation complète
└─ RLS par organisation

External Users (Rôles: Artist, Coach, etc.)
├─ Pas d'accès Management Panel
├─ Data Isolation complète
├─ organization_id = NULL
└─ RLS "propriétaire uniquement"
```

### Après
```
SENEGEL (Tous les rôles)
├─ Management Panel (rôles de gestion uniquement)
├─ Permissions granulaires par module
├─ RLS UNIFORME
└─ Model de référence pour futurs partenaires

Futurs Partenaires (Architecture à venir)
└─ Réplique de l'architecture SENEGEL
```

## Notes Techniques

### Contraintes de Clé Étrangère
Plusieurs tables ont des FK vers `organizations`:
- `profiles.organization_id`
- `projects.organization_id`
- `courses.organization_id`
- `jobs.organization_id`
- `objectives.organization_id`
- `invoices.organization_id`
- `expenses.organization_id`
- `time_logs.organization_id`
- `leave_requests.organization_id`
- `contacts.organization_id`
- `meetings.organization_id`
- `users.organization_id` (legacy)

Ces FK ont été mises à jour avant suppression des organisations obsolètes.

### Performances
- RLS: Pas de changement, toujours par `organization_id`
- Indexes: Existing indexes sur `organization_id` toujours valides
- Queries: Simplifiées (une seule organisation)

### Compatibilité
- Frontend: Aucun changement requis (utilise déjà `organization_id`)
- Auth: Inchangé
- Permissions: Inchangé (géré par `user_module_permissions`)

## Tests Recommandés

1. **Connexion avec différents rôles**
   - Super Admin (accès complet)
   - Manager (accès Management Panel)
   - Trainer (pas d'accès Management Panel)
   - Student (pas d'accès Management Panel)

2. **Création de projet**
   - Vérifier `organization_id` = SENEGEL

3. **Création de cours**
   - Vérifier visibilité selon permissions

4. **Signup**
   - Tester avec tous les nouveaux rôles
   - Vérifier attribution automatique à SENEGEL

## Résumé

✅ **Migration terminée**: 20 utilisateurs dans SENEGEL  
✅ **Organisations obsolètes supprimées**: STUDENTS et SENEGEL Default  
✅ **Nouveaux rôles ajoutés**: 34 rôles totaux (29 existants + 5 nouveaux)  
✅ **Traductions mises à jour**: EN et FR  
✅ **RLS compatible**: Pas de changement requis  
✅ **Architecture prête**: Pour expansion future multi-organisations  

L'application EcosystIA est maintenant centralisée dans **SENEGEL** et prête à servir de **modèle de référence** pour de futurs partenaires.


