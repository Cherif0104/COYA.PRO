# Migration des rôles pour la production

## Problème identifié

La contrainte `profiles_role_check` dans Supabase bloque la création de profils avec le rôle `partner_facilitator` et certains autres rôles du MVP. L'erreur retournée est :

```
new row for relation "profiles" violates check constraint "profiles_role_check"
```

## Solution

Exécuter le script SQL `scripts/fix-roles-constraint.sql` sur Supabase pour mettre à jour la contrainte et autoriser tous les rôles du MVP COYA.

## Étapes d'exécution sur Supabase

### 1. Accéder à l'éditeur SQL

1. Ouvrez votre projet Supabase : https://supabase.com/dashboard
2. Naviguez vers **SQL Editor** dans le menu de gauche
3. Cliquez sur **New query**

### 2. Exécuter la migration

1. Copiez-collez le contenu de `scripts/fix-roles-constraint.sql`
2. Cliquez sur **Run** pour exécuter le script
3. Vérifiez qu'il n'y a pas d'erreur dans la sortie

### 3. Vérifier les profils existants

Le script inclut une requête de vérification qui liste tous les profils avec des rôles non conformes. Si des profils sont retournés, vous devez les migrer manuellement :

```sql
-- Exemple : migrer un profil avec un rôle invalide
UPDATE profiles 
SET role = 'facilitator' 
WHERE id = '<UUID_DU_PROFIL>';
```

### 4. Tester la création de comptes

Après la migration, testez la création de comptes avec différents rôles :

1. **Facilitateur partenaire** : Créez un compte avec `partner_facilitator`
2. **Student** : Créez un compte avec `student`
3. **Entrepreneur** : Créez un compte avec `entrepreneur`

Tous ces comptes devraient se créer sans erreur.

## Rôles autorisés après migration

### Rôles UI → Rôles stockés en base

| Rôle UI (interface) | Rôle stocké (Supabase) |
|---------------------|------------------------|
| partner_facilitator | partner |
| super_administrator | super_administrator |
| administrator | administrator |
| manager | manager |
| supervisor | supervisor |
| intern | intern |
| trainer | trainer |
| coach | coach |
| facilitator | facilitator |
| mentor | mentor |
| student | student |
| alumni | alumni |
| entrepreneur | entrepreneur |
| employer | employer |
| implementer | implementer |
| funder | funder |
| publisher | publisher |
| editor | editor |
| producer | producer |
| artist | artist |

## Problèmes résolus

- ✅ Création de compte facilitateur partenaire
- ✅ Connexion avec session persistée
- ✅ Mapping automatique des rôles (partner_facilitator ↔ partner)
- ✅ Création automatique de profil manquant lors de la connexion

## Notes importantes

1. **Compatibilité descendante** : Les anciens rôles (`professor`, `learner`, `ai_*`) sont gardés dans la contrainte pour éviter de casser les profils existants. Ils seront migrés progressivement.

2. **Mapping UI** : Le service `authService.ts` gère automatiquement le mapping entre les rôles UI et les rôles stockés. L'utilisateur voit toujours "Facilitateur partenaire" même si c'est stocké comme "partner".

3. **Organisation par défaut** : Tous les nouveaux comptes sont automatiquement assignés à l'organisation SENEGEL (`550e8400-e29b-41d4-a716-446655440000`) sauf si un `organization_id` est spécifié.

## Erreurs connexes résolues

### Erreur `created_by` dans organizations

L'erreur suivante a été observée :

```
Could not find the 'created_by' column of 'organizations' in the schema cache
```

**Solution** : Ajouter la colonne `created_by` à la table `organizations` ou la retirer du code si elle n'existe pas.

```sql
-- Ajouter la colonne si elle n'existe pas
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
```

### Erreur 400 sur budget_lines

Les erreurs 400 sur `budget_lines` sont non bloquantes et sont déjà gérées gracieusement par l'application (logs d'erreur mais pas de crash).

## Vérification post-migration

```sql
-- Lister tous les rôles utilisés actuellement
SELECT DISTINCT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- Vérifier qu'aucun profil n'a un rôle invalide
SELECT *
FROM profiles
WHERE role NOT IN (
  'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
  'trainer', 'coach', 'facilitator', 'mentor',
  'partner', 'supplier', 'service_provider',
  'student', 'learner', 'alumni',
  'entrepreneur', 'employer', 'implementer', 'funder',
  'publisher', 'editor', 'producer', 'artist',
  'ai_coach', 'ai_developer', 'ai_analyst',
  'professor'
);
```

## Aide supplémentaire

Si vous rencontrez des problèmes lors de la migration, contactez l'équipe technique avec :
- Le message d'erreur exact
- L'email du compte problématique
- La sortie de la requête de vérification

## Prochaines étapes

Après cette migration, vous pourrez :
1. Créer des comptes facilitateurs partenaires
2. Les inviter sur des projets spécifiques
3. Filtrer automatiquement leur accès aux ressources
4. Déployer en production sur Netlify

---

**Date de création** : 2025-11-07  
**Priorité** : CRITIQUE - À exécuter avant déploiement production  
**Durée estimée** : 5 minutes

