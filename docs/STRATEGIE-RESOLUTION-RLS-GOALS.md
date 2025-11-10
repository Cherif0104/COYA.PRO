# Stratégie de Résolution des Problèmes RLS - Module Goals

## Date : 2025-01-29
## Module : Goals (OKRs)

## Problèmes Rencontrés et Solutions

### Problème 1 : Erreur 403 (Forbidden) - Violation de la politique RLS

**Symptôme :**
```
code: '42501'
message: 'new row violates row-level security policy for table "objectives"'
```

**Cause :**
- La table `objectives` a une contrainte de clé étrangère `objectives_owner_id_fkey` qui référence `profiles.id` (pas `auth.users.id`)
- Les politiques RLS initiales vérifiaient `owner_id = auth.uid()`, ce qui ne fonctionnait pas car `owner_id` est un UUID de `profiles`, pas de `auth.users`

**Solution :**
1. Récupérer l'ID du profil (`profiles.id`) à partir de `auth.uid()` via `profiles.user_id = auth.uid()`
2. Utiliser `profiles.id` comme `owner_id` lors de l'insertion
3. Mettre à jour les politiques RLS pour vérifier que `owner_id` correspond au profil de l'utilisateur authentifié :
   ```sql
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE profiles.id = objectives.owner_id 
     AND profiles.user_id = auth.uid()
   )
   ```

**Code corrigé :**
```typescript
// Dans dataService.ts - createObjective
const { data: { user: currentUser } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('user_id', currentUser.id)
  .single();

// Utiliser profile.id comme owner_id
owner_id: profile.id
```

### Problème 2 : Erreur 409 (Conflict) - Violation de contrainte de clé étrangère

**Symptôme :**
```
code: '23503'
message: 'insert or update on table "objectives" violates foreign key constraint "objectives_owner_id_fkey"'
details: 'Key is not present in table "profiles".'
```

**Cause :**
- Tentative d'utiliser `auth.uid()` directement comme `owner_id` alors que la contrainte nécessite `profiles.id`

**Solution :**
- Toujours récupérer le profil avant d'insérer et utiliser `profile.id`
- Vérifier que le profil existe avant de créer l'entité

### Problème 3 : Conversion du champ `progress`

**Symptôme :**
- Le champ `progress` dans Supabase est stocké en décimal (0-1) mais l'application utilise des pourcentages (0-100)

**Solution :**
- Convertir en décimal avant insertion : `progress / 100`
- Convertir en pourcentage après récupération : `progress * 100`

**Code :**
```typescript
// Avant insertion
progress: progress / 100  // Convertir 0-100 en 0-1

// Après récupération
progress: (data.progress || 0) * 100  // Convertir 0-1 en 0-100
```

## Checklist pour Nouveaux Modules

### 1. Vérifier la Structure de la Table
- [ ] Vérifier les contraintes de clé étrangère (`owner_id`, `user_id`, etc.)
- [ ] Identifier si les FK référencent `profiles.id` ou `auth.users.id`
- [ ] Vérifier les types de données (décimal vs entier, JSONB, etc.)

### 2. Récupérer les Bonnes Références
- [ ] Si `owner_id` référence `profiles.id`, récupérer le profil :
  ```typescript
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single();
  ```
- [ ] Utiliser `profile.id` au lieu de `auth.uid()` si nécessaire

### 3. Créer les Politiques RLS
```sql
-- Pattern de politique pour INSERT
CREATE POLICY "Users can create their own [entity]"
ON [table_name]
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = [table_name].owner_id 
    AND profiles.user_id = auth.uid()
  )
);
```

### 4. Gérer les Conversions de Types
- [ ] Identifier les champs nécessitant une conversion (décimal ↔ pourcentage, dates, etc.)
- [ ] Convertir avant insertion dans Supabase
- [ ] Convertir après récupération pour l'application

### 5. Tester la Persistance
- [ ] Créer une entité
- [ ] Rafraîchir la page et vérifier la persistance
- [ ] Modifier l'entité et vérifier qu'elle n'est pas dupliquée
- [ ] Supprimer l'entité et vérifier la suppression

## Migrations SQL Créées

1. `create_objectives_rls_policies_v3` - Politiques RLS de base
2. `fix_objectives_rls_policy_owner_id` - Correction politique INSERT
3. `fix_objectives_rls_policies_all` - Toutes les politiques corrigées

## Leçons Apprises

1. **Toujours vérifier les contraintes FK** : Ne pas supposer que `owner_id` = `auth.uid()`
2. **Logger les données** : Les logs aident à identifier rapidement les problèmes
3. **Utiliser EXISTS dans RLS** : Plus flexible que les comparaisons directes
4. **Tester immédiatement après correction** : Ne pas attendre pour valider

## Template de Politique RLS Universel

```sql
-- Pour les tables avec owner_id référençant profiles.id
CREATE POLICY "[Policy name]"
ON [table_name]
FOR [SELECT|INSERT|UPDATE|DELETE]
TO authenticated
USING/WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = [table_name].owner_id 
    AND profiles.user_id = auth.uid()
  )
);
```

## Notes Importantes

- Les politiques RLS sont évaluées dans le contexte de la session Supabase
- `auth.uid()` retourne l'UUID de `auth.users`, pas de `profiles`
- Toujours vérifier la structure de la table avant de créer les politiques
- Utiliser le MCP Supabase pour appliquer les migrations rapidement


