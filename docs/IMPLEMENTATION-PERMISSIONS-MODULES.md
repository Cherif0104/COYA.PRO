# Implémentation des Permissions Modules par Rôle - SENEGEL

## Vue d'ensemble

Cette implémentation définit les permissions par défaut pour chaque rôle dans SENEGEL, conformément au document `RESUME-TABLEAU-MODULES-ROLES.md`.

## Architecture

### Principe fondamental

**Tous les utilisateurs (sauf Super Administrateur) ont accès par défaut à TOUS les modules standard**, sauf le **Management Panel** réservé aux rôles de gestion.

### Rôles concernés

#### Rôles de Gestion (Accès Management Panel)
- **Administrator** (Administrateur)
- **Manager**
- **Supervisor** (Superviseur)
- **Intern** (Stagiaire)

#### Rôles sans Management Panel (22 rôles)
- **Formation** : Trainer, Professor, Facilitator, Coach, Mentor
- **Académiques** : Student, Learner, Alumni
- **Professionnels** : Entrepreneur, Employer, Implementer, Funder
- **Créatifs** : Artist, Producer, Editor, Publisher
- **Techno** : AI Coach, AI Developer, AI Analyst
- **Partenaires** : Partner, Supplier, Service Provider

## Modules disponibles

### Modules accessibles à TOUS les utilisateurs (13 modules)

#### Workspace (7 modules)
1. **Dashboard** - Tableau de bord
2. **Projects** - Gestion de projets
3. **Goals & OKRs** - Objectifs et OKRs
4. **Time Tracking** - Suivi du temps
5. **Leave Management** - Gestion des congés
6. **Finance** - Finance
7. **Knowledge Base** - Base de connaissances

#### Development (2 modules)
8. **Courses** - Cours
9. **Jobs** - Offres d'emploi

#### Tools (2 modules)
10. **AI Coach** - Coach IA
11. **Gen AI Lab** - Génération IA

#### Autres (2 modules)
12. **CRM & Sales** - CRM et ventes
13. **Settings** - Paramètres

### Modules Management Panel (6 modules) - RÉSERVÉS AUX RÔLES DE GESTION

14. **Analytics** - Analytics
15. **Talent Analytics** - Talent Analytics
16. **Course Management** - Gestion des cours
17. **Job Management** - Gestion des jobs
18. **Leave Management Admin** - Gestion des demandes de congés
19. **User Management** - Gestion des utilisateurs

## Implémentation technique

### Fichiers modifiés

1. **`types.ts`**
   - Ajout de `'dashboard'` et `'settings'` au type `ModuleName`
   - Définition de `MANAGEMENT_ROLES` et `NON_MANAGEMENT_ROLES`

2. **`hooks/useModulePermissions.ts`**
   - Modification de `getDefaultPermissions()` pour :
     - Accorder tous les modules standards à tous les utilisateurs
     - Accorder le Management Panel SEULEMENT aux rôles de gestion
     - Définir les permissions comme complètes (Read, Write, Delete, Approve)

3. **`components/UserModulePermissions.tsx`**
   - Modification de `getDefaultPermissionsByRole()` pour refléter la même logique
   - Ajout de `dashboard` et `settings` dans `moduleDisplayNames`
   - Ajout de `dashboard` et `settings` dans les catégories de modules
   - Mise à jour des catégories pour inclure Dashboard dans Workspace et Settings comme catégorie séparée

4. **`components/Sidebar.tsx`**
   - Affichage conditionnel du Management Panel basé sur `MANAGEMENT_ROLES`
   - Filtrage des modules via `canAccessModule()` pour tous les autres modules

## Logique de permission

### Permissions par défaut

Chaque module a 4 niveaux de permission :
- **canRead** : Lecture
- **canWrite** : Écriture
- **canDelete** : Suppression
- **canApprove** : Approbation

### Comportement

```typescript
// Tous les utilisateurs
workspace modules: { canRead: true, canWrite: true, canDelete: true, canApprove: true }
development modules: { canRead: true, canWrite: true, canDelete: true, canApprove: true }
tools modules: { canRead: true, canWrite: true, canDelete: true, canApprove: true }
crm_sales: { canRead: true, canWrite: true, canDelete: true, canApprove: true }
settings: { canRead: true, canWrite: true, canDelete: true, canApprove: true }

// Management Panel - CONDITIONNEL
if (hasManagementAccess) {
  management modules: { canRead: true, canWrite: true, canDelete: true, canApprove: true }
} else {
  management modules: { canRead: false, canWrite: false, canDelete: false, canApprove: false }
}
```

### Vérification d'accès au Management Panel

```typescript
const hasManagementAccess = MANAGEMENT_ROLES.includes(role as Role);
```

Où `MANAGEMENT_ROLES` est défini comme :
```typescript
export const MANAGEMENT_ROLES: Role[] = [
  'super_administrator',
  'administrator',
  'manager',
  'supervisor',
  'intern'
];
```

## Personnalisation

### Modification par Super Administrateur

Seul le **Super Administrateur** peut modifier les permissions via :
**Settings > Gestion des Utilisateurs > Permissions Module**

Les modifications sont :
1. Sauvegardées automatiquement dans Supabase (table `user_module_permissions`)
2. Immédiatement prises en compte via l'événement `permissions-reload`
3. Persistées et restaurées à chaque connexion

### Priorité des permissions

1. **Permissions Supabase** (si existantes) - Priorité 1
2. **Permissions par défaut par rôle** - Priorité 2

## Tests

### Scénarios de test

#### Test 1 : Utilisateur avec rôle de gestion (ex: Manager)
- ✅ Accès à tous les modules Workspace
- ✅ Accès à tous les modules Development
- ✅ Accès à tous les modules Tools
- ✅ Accès à CRM & Sales
- ✅ Accès au Management Panel
- ✅ Accès à Settings

#### Test 2 : Utilisateur avec rôle standard (ex: Student)
- ✅ Accès à tous les modules Workspace
- ✅ Accès à tous les modules Development
- ✅ Accès à tous les modules Tools
- ✅ Accès à CRM & Sales
- ❌ PAS d'accès au Management Panel
- ✅ Accès à Settings

#### Test 3 : Modification des permissions par Super Admin
- Super Admin modifie les permissions d'un utilisateur
- Les modifications sont sauvegardées
- Les modifications sont prises en compte immédiatement
- Les modules sont affichés/cachés selon les permissions

## Notes importantes

1. **Super Administrateur** : Rôle spécial avec accès système complet, non couvert par cette implémentation.

2. **Isolation des données** : L'isolation entre utilisateurs est gérée par les RLS policies de Supabase, pas par la visibilité des modules.

3. **Évolution future** : Cette configuration MVP peut évoluer selon les besoins de SENEGEL.

4. **Performance** : Les permissions sont chargées une seule fois au login et mises en cache. Un événement `permissions-reload` est déclenché lors des modifications.

## Conclusion

Cette implémentation garantit que **tous les utilisateurs de SENEGEL ont accès aux mêmes modules standard**, avec comme seule distinction l'accès au **Management Panel** réservé aux rôles de gestion. Le Super Administrateur peut modifier ces permissions pour personnaliser l'accès selon les besoins spécifiques de chaque utilisateur.

---

**Date de création** : Janvier 2025  
**Version** : 1.0  
**Auteur** : Système de configuration SENEGEL


