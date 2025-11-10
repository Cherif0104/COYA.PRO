# Architecture Multi-Tenant - EcosystIA

## 📋 Vue d'ensemble

EcosystIA supporte maintenant une **architecture multi-tenant** qui permet à plusieurs organisations partenaires d'avoir leurs propres espaces dédiés, isolés et sécurisés, tout en partageant la même application et base de données.

## 🏗️ Architecture

### Concept

Au lieu de dupliquer l'application pour chaque organisation, nous utilisons une **approche multi-tenant avec isolation basée sur `organization_id`** :

```
┌─────────────────────────────────────────────┐
│         PLATEFORME ECOSYSTIA                │
│      (Une seule application)                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌─────────────┐       │
│  │   SENEGEL   │    │  PARTENAIRE1 │       │
│  │             │    │              │       │
│  │ • Projets   │    │ • Projets    │       │
│  │ • Cours     │    │ • Cours      │       │
│  │ • Jobs      │    │ • Jobs       │       │
│  │ • Finance   │    │ • Finance    │       │
│  └─────────────┘    └─────────────┘       │
│                                             │
│  ┌─────────────┐    ┌─────────────┐       │
│  │ PARTENAIRE2 │    │ PARTENAIRE3 │       │
│  └─────────────┘    └─────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

### Avantages

✅ **Une seule base de données** - Maintenance centralisée  
✅ **Isolation complète** - Chaque organisation voit uniquement ses données  
✅ **Scalable** - Ajout facile de nouvelles organisations  
✅ **Partage possible** - Cours publics, projets collaboratifs (futur)  
✅ **RLS automatique** - Sécurité au niveau base de données  

## 📊 Structure de Base de Données

### Table `organizations`

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- 'senegel', 'partenaire1', etc.
  description TEXT,
  logo_url TEXT,
  website TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### Colonnes `organization_id` dans toutes les tables

Toutes les tables principales ont une colonne `organization_id` :

- ✅ `profiles`
- ✅ `projects`
- ✅ `courses`
- ✅ `jobs`
- ✅ `objectives`
- ✅ `invoices`
- ✅ `expenses`
- ✅ `time_logs`
- ✅ `leave_requests`
- ✅ `contacts`
- ✅ `meetings`
- ✅ `knowledge_articles`
- ✅ `job_applications`

## 🔐 Sécurité (RLS - Row Level Security)

### Principe

Les **Row Level Security (RLS) policies** filtrent automatiquement toutes les requêtes par `organization_id` de l'utilisateur connecté.

### Exemple de Policy RLS

```sql
-- Les utilisateurs voient uniquement les données de leur organisation
CREATE POLICY "Users see only their organization's projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);
```

### Isolation Garantie

1. **SELECT** : Un utilisateur ne voit que les données de son organisation
2. **INSERT** : Un utilisateur ne peut créer que dans son organisation
3. **UPDATE** : Un utilisateur ne peut modifier que les données de son organisation
4. **DELETE** : Un utilisateur ne peut supprimer que les données de son organisation

## 🛠️ Implémentation

### 1. Service `OrganizationService`

**Fichier** : `services/organizationService.ts`

Méthodes principales :
- `getCurrentUserOrganization()` - Récupère l'organisation de l'utilisateur
- `getCurrentUserOrganizationId()` - Récupère l'ID de l'organisation
- `getAllOrganizations()` - Liste toutes les organisations (Super Admin)
- `createOrganization()` - Crée une nouvelle organisation (Super Admin)
- `updateOrganization()` - Met à jour une organisation (Super Admin)
- `deleteOrganization()` - Supprime une organisation (Super Admin)

### 2. Composant `OrganizationManagement`

**Fichier** : `components/OrganizationManagement.tsx`

Interface Super Admin pour :
- ✅ Créer des organisations partenaires
- ✅ Modifier les organisations
- ✅ Activer/Désactiver des organisations
- ✅ Voir les statistiques par organisation (utilisateurs, projets, cours, jobs)
- ✅ Supprimer des organisations (sauf SENEGEL)

### 3. Intégration dans `DataService`

**Fichier** : `services/dataService.ts`

Toutes les méthodes de création incluent automatiquement `organization_id` :

```typescript
// Exemple: createProject
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('user_id', currentUser.id)
  .single();

return await ApiHelper.post('projects', {
  // ... autres champs ...
  organization_id: profile?.organization_id || null,
});
```

## 📝 Scripts SQL

### 1. `create-multi-tenant-architecture.sql`

Ce script :
- ✅ Crée la table `organizations`
- ✅ Ajoute `organization_id` à toutes les tables (si manquant)
- ✅ Crée les index pour performance
- ✅ Migre les données existantes vers SENEGEL
- ✅ Active Realtime pour `organizations`

### 2. `update-rls-policies-multi-tenant.sql`

Ce script :
- ✅ Met à jour toutes les RLS policies pour filtrer par `organization_id`
- ✅ Couvre toutes les tables principales
- ✅ Garantit l'isolation complète

## 🚀 Installation

### Étape 1 : Exécuter le script SQL principal

Dans l'éditeur SQL de Supabase, exécutez :

```sql
-- Copier-coller le contenu de:
scripts/create-multi-tenant-architecture.sql
```

### Étape 2 : Mettre à jour les RLS policies

Dans l'éditeur SQL de Supabase, exécutez :

```sql
-- Copier-coller le contenu de:
scripts/update-rls-policies-multi-tenant.sql
```

### Étape 3 : Activer Realtime pour `organizations`

Dans Supabase Dashboard :
1. Aller à **Database** > **Replication**
2. Activer Realtime pour la table `organizations`

Ou via SQL :
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
```

## 🎯 Utilisation

### Pour les Super Administrateurs

1. Se connecter en tant que Super Admin
2. Aller dans **Management Panel** > **Gestion des Organisations**
3. Cliquer sur **Nouvelle Organisation**
4. Remplir :
   - **Nom** : Nom de l'organisation
   - **Slug** : Identifiant unique (ex: `partenaire-abc`)
   - **Description** : Description optionnelle
   - **Site Web** : Optionnel
   - **Email de contact** : Optionnel

### Pour les Utilisateurs Normaux

Les utilisateurs voient automatiquement uniquement les données de leur organisation. Aucune action requise.

### Attribution d'Organisation lors du Signup

Lorsqu'un utilisateur s'inscrit, il doit être assigné à une organisation. Actuellement, il est assigné à SENEGEL par défaut.

**Futur** : Possibilité d'inviter des utilisateurs à rejoindre une organisation spécifique via un système d'invitation.

## 📈 Statistiques par Organisation

Le composant `OrganizationManagement` affiche pour chaque organisation :
- 👥 Nombre d'utilisateurs
- 📊 Nombre de projets
- 📚 Nombre de cours
- 💼 Nombre d'offres d'emploi

## 🔒 Sécurité et Permissions

### Accès au Module Organization Management

- ✅ **Super Administrateur uniquement** : Peut créer, modifier, supprimer des organisations
- ❌ **Autres rôles** : Accès refusé (message d'erreur affiché)

### Protection SENEGEL

- ⚠️ L'organisation SENEGEL (`id: 550e8400-e29b-41d4-a716-446655440000`) ne peut pas être supprimée
- ⚠️ Le slug `senegel` est réservé

## 🔮 Évolutions Futures

### 1. Système d'Invitation

Permettre aux Super Admins d'inviter des utilisateurs à rejoindre une organisation spécifique.

### 2. Partage Inter-Organisationnel

- Cours publics visibles par toutes les organisations
- Projets collaboratifs entre organisations
- Documents partagés

### 3. Analytics Globaux

Permettre aux Super Admins de voir des statistiques agrégées sur toutes les organisations.

### 4. Configuration par Organisation

Chaque organisation pourrait avoir :
- Ses propres modules activés
- Ses propres règles métier
- Sa propre configuration

## 📚 Fichiers Créés/Modifiés

### Nouveaux Fichiers

- ✅ `services/organizationService.ts` - Service de gestion des organisations
- ✅ `components/OrganizationManagement.tsx` - Interface de gestion
- ✅ `scripts/create-multi-tenant-architecture.sql` - Script SQL principal
- ✅ `scripts/update-rls-policies-multi-tenant.sql` - Mise à jour RLS
- ✅ `docs/ARCHITECTURE-MULTI-TENANT.md` - Cette documentation

### Fichiers Modifiés

- ✅ `types.ts` - Ajout interface `Organization` et `organization_management` dans `ModuleName`
- ✅ `services/dataService.ts` - Ajout helper `getCurrentUserOrganizationId()` et intégration dans `createProject()`
- ✅ `App.tsx` - Ajout du composant `OrganizationManagement` dans le routing
- ✅ `components/Sidebar.tsx` - Ajout du menu "Gestion des Organisations"

## ✅ Checklist de Validation

- [ ] Script SQL `create-multi-tenant-architecture.sql` exécuté
- [ ] Script SQL `update-rls-policies-multi-tenant.sql` exécuté
- [ ] Realtime activé pour `organizations`
- [ ] Création d'une organisation test réussie
- [ ] Vérification isolation : Un utilisateur d'une organisation ne voit pas les données d'une autre
- [ ] Vérification création : Les nouvelles entités ont bien `organization_id`
- [ ] Vérification RLS : Les policies fonctionnent correctement

## 🐛 Dépannage

### Problème : Les utilisateurs voient les données de toutes les organisations

**Solution** : Vérifier que les RLS policies sont activées et correctement configurées.

### Problème : Erreur "organization_id is null" lors de la création

**Solution** : Vérifier que l'utilisateur a bien un `organization_id` dans `profiles`.

### Problème : Impossible de créer une organisation

**Solution** : Vérifier que l'utilisateur est bien Super Administrateur.

---

**Documentation créée le** : 2025-01-29  
**Auteur** : EcosystIA Development Team  
**Version** : 1.0



