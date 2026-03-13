# Architecture Finale SENEGEL

## Date
30 octobre 2024

## Principes Fondamentaux

### 1. Organisation Unique SENEGEL
- **SENEGEL** est l'organisation principale et unique
- Tous les utilisateurs appartiennent à SENEGEL
- Aucune distinction "interne/externe" en termes d'organisation

### 2. Rôles
**29 rôles** disponibles dans SENEGEL, organisés en 7 catégories:

#### 🏢 Gestion (Accès Management Ecosysteia)
- `super_administrator` - Super Administrateur
- `administrator` - Administrateur
- `manager` - Manager
- `supervisor` - Superviseur
- `intern` - Stagiaire

#### 🎓 Pédagogique et Formation
- `trainer` - Formateur
- `professor` - Professeur
- `facilitator` - Facilitateur
- `coach` - Coach
- `mentor` - Mentor

#### 👨‍🎓 Académique
- `student` - Étudiant
- `learner` - Apprenant
- `alumni` - Ancien élève

#### 💼 Professionnel
- `entrepreneur` - Entrepreneur
- `employer` - Employeur
- `implementer` - Implémenteur
- `funder` - Bailleur de fonds

#### 🎨 Créatif et Médias
- `artist` - Artiste
- `producer` - Producteur
- `editor` - Éditeur
- `publisher` - Publier

#### 🤖 IA et Technologie
- `ai_coach` - Coach IA
- `ai_developer` - Développeur IA
- `ai_analyst` - Analyste IA

#### 🤝 Partenaires
- `partner` - Partenaire
- `supplier` - Fournisseur
- `service_provider` - Prestataire

### 3. Permissions

#### Open Access par Défaut
- **TOUS** les rôles ont accès complet (Read, Write, Delete, Approve) à **TOUS** les modules par défaut
- Aucune restriction basée sur le rôle pour les modules standards

#### Management Ecosysteia (Exception)
- **SEULEMENT** les `MANAGEMENT_ROLES` ont accès:
  - `super_administrator`
  - `administrator`
  - `manager`
  - `supervisor`
  - `intern`

- **Tous les autres rôles** n'ont **PAS** accès au Management Ecosysteia

## Structure des Modules

### Modules Standard (Accessibles à TOUS)
1. **Workspace**
   - Dashboard
   - Projects
   - Goals (OKRs)
   - Time Tracking
   - Leave Management (Demandes de Congés)
   - Finance
   - Knowledge Base

2. **Development**
   - Courses
   - Jobs

3. **CRM & Sales** (Module indépendant)

5. **Settings**

### Management Ecosysteia (Accès LIMITÉ)
1. Gestion des Cours
2. Gestion des Jobs
3. Demandes de Congés (Admin)
4. Gestion des Utilisateurs
5. Analytics
6. Talent Analytics

## Implémentation Technique

### Code

#### types.ts
```typescript
// Rôles ayant accès au Management Ecosysteia (seule restriction)
export const MANAGEMENT_ROLES: Role[] = [
  'super_administrator', 
  'administrator', 
  'manager', 
  'supervisor', 
  'intern'
];

// Tous les autres rôles n'ont pas accès au Management Ecosysteia
export const NON_MANAGEMENT_ROLES: Role[] = [
  'trainer', 'professor', 'facilitator', 'coach', 'mentor',
  'student', 'learner', 'alumni',
  'entrepreneur', 'employer', 'implementer', 'funder',
  'artist', 'producer', 'editor', 'publisher',
  'ai_coach', 'ai_developer', 'ai_analyst',
  'partner', 'supplier', 'service_provider'
];
```

#### Sidebar.tsx
```typescript
// Tous les utilisateurs ont accès à tous les modules SAUF Management Ecosysteia
const hasManagementAccess = user && MANAGEMENT_ROLES.includes(user.role);

// Menu expandable Management - SEULEMENT pour MANAGEMENT_ROLES
{hasManagementAccess && (
  <>
    <p className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">Management Panel</p>
    <ExpandableNavItem
      icon="fas fa-tasks"
      label="Management Ecosysteia"
      currentView={currentView}
      setView={setView}
      items={[
        { icon: 'fas fa-chalkboard-teacher', label: 'Gestion des Cours', viewName: 'course_management' },
        { icon: 'fas fa-briefcase', label: 'Gestion des Jobs', viewName: 'job_management' },
        { icon: 'fas fa-calendar-alt', label: 'Demandes de Congés', viewName: 'leave_management_admin' },
        { icon: 'fas fa-user-cog', label: 'Gestion des Utilisateurs', viewName: 'user_management' },
        { icon: 'fas fa-chart-pie', label: 'Analytics', viewName: 'analytics' },
        { icon: 'fas fa-user-tie', label: 'Talent Analytics', viewName: 'talent_analytics' },
      ]}
    />
  </>
)}
```

#### useModulePermissions.ts
```typescript
// Par défaut, TOUS les utilisateurs ont accès complet à TOUS les modules
const basePermissions: ModulePermissions = {
  dashboard: { canRead: true, canWrite: true, canDelete: true, canApprove: true },
  projects: { canRead: true, canWrite: true, canDelete: true, canApprove: true },
  // ... tous les modules avec accès complet
};

return basePermissions;
```

### Base de Données

#### Table organizations
```sql
-- Une seule organisation
SELECT * FROM organizations;
-- Résultat: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'SENEGEL' }
```

#### Contrainte profiles.role
```sql
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role = ANY (ARRAY[
    'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
    'trainer', 'professor', 'facilitator', 'coach', 'mentor',
    'student', 'learner', 'alumni',
    'entrepreneur', 'employer', 'implementer', 'funder',
    'artist', 'producer', 'editor', 'publisher',
    'ai_coach', 'ai_developer', 'ai_analyst',
    'partner', 'supplier', 'service_provider'
  ])
);
```

#### RLS (Row Level Security)
Toutes les tables ont RLS activé avec isolation par `organization_id`:
- Tous les utilisateurs voient les mêmes données (même organization_id = SENEGEL)
- Préparation pour futures organisations partenaires

## Flux d'Inscription

### Nouveau Compte
1. Utilisateur choisit un rôle parmi 29 disponibles
2. `organization_id` = SENEGEL (automatique)
3. Permissions par défaut = Open Access complet
4. Accès Management Panel selon `MANAGEMENT_ROLES`

### Contrôle d'Accès
```typescript
// Sidebar.tsx
const hasManagementAccess = user && MANAGEMENT_ROLES.includes(user.role);

// Afficher Management Panel seulement si hasManagementAccess
{hasManagementAccess && <ManagementPanel />}
```

## Avantages de l'Architecture

### ✅ Simplicité
- Une seule organisation: SENEGEL
- Permissions uniformes (Open Access)
- Une seule restriction: Management Ecosysteia

### ✅ Flexibilité
- 29 rôles disponibles
- Granularité via `UserModulePermissions` si nécessaire
- Préparation pour multi-organisations future

### ✅ Sécurité
- RLS actif sur toutes les tables
- Contraintes DB pour valider les rôles
- Audit trail complet

### ✅ Expérience Utilisateur
- Pas de frictions lors de l'inscription
- Accès immédiat aux modules
- Interface claire et intuitive

## Cas d'Usage

### Employer (Alioune Samb)
- **Accès**: TOUS les modules standards
- **Restriction**: PAS d'accès au Management Ecosysteia
- **Sidebar**: Workspace, Development, Tools, CRM & Sales, Settings

### Manager (Rôle gestion)
- **Accès**: TOUS les modules
- **Incluant**: Management Ecosysteia
- **Sidebar**: Workspace, Development, Tools, CRM & Sales, Management Panel, Settings

### Student
- **Accès**: TOUS les modules standards
- **Restriction**: PAS d'accès au Management Ecosysteia
- **Peut**: Créer des projets, suivre des cours, utiliser AI Coach, etc.

## Préparation Future Multi-Organisations

L'architecture actuelle est préparée pour l'expansion:
- RLS par `organization_id` déjà en place
- Structure pour ajouter de nouvelles organisations
- SENEGEL comme modèle de référence
- Les futurs partenaires auront leur propre organisation avec la même structure de rôles

## Migration

### Changements majeurs
1. ✅ Tous les utilisateurs → SENEGEL
2. ✅ Rôles étendus de 19 à 29
3. ✅ Open Access par défaut
4. ✅ Management Ecosysteia limité aux MANAGEMENT_ROLES
5. ✅ Suppression distinction interne/externe

### Compatibilité
- ✅ Backward compatible avec RLS
- ✅ Données existantes préservées
- ✅ Pas de breaking changes

## Résumé

**SENEGEL** = Organisation unique + 29 rôles + Open Access + Management Panel limité

Cette architecture simplifie la gestion, améliore l'expérience utilisateur, et prépare l'expansion future tout en maintenant la sécurité et la flexibilité.


