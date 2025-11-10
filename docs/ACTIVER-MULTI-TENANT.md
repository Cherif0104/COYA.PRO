# 🚀 Activation de l'Architecture Multi-Tenant

## 📋 Instructions d'Activation

Suivez ces étapes pour activer l'architecture multi-tenant dans votre instance Supabase.

---

## ⚙️ Étape 1 : Créer la Structure Multi-Tenant

1. **Ouvrez l'éditeur SQL de Supabase**
   - Allez dans votre dashboard Supabase
   - Cliquez sur **SQL Editor** dans la barre latérale gauche

2. **Copiez le script SQL principal**
   - Ouvrez le fichier : `scripts/create-multi-tenant-architecture.sql`
   - **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)

3. **Collez dans l'éditeur SQL**
   - Collez le script dans l'éditeur SQL de Supabase
   - **Vérifiez** que vous avez bien collé du SQL (pas du JavaScript !)
   - Cliquez sur **RUN** ou appuyez sur `Ctrl+Enter`

4. **Vérifiez le succès**
   - Vous devriez voir un message de succès
   - La table `organizations` devrait être créée
   - L'organisation SENEGEL devrait être insérée

---

## 🔐 Étape 2 : Mettre à Jour les RLS Policies

1. **Ouvrez un nouvel onglet SQL Editor**
   - Cliquez sur **+ New Query** dans Supabase

2. **Copiez le script RLS**
   - Ouvrez le fichier : `scripts/update-rls-policies-multi-tenant.sql`
   - **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)

3. **Collez dans l'éditeur SQL**
   - Collez le script dans le nouvel onglet
   - Cliquez sur **RUN**

4. **Vérifiez le succès**
   - Vous devriez voir plusieurs messages de succès
   - Toutes les tables principales ont maintenant des policies RLS multi-tenant

---

## 🔄 Étape 3 : Activer Realtime pour Organizations

### Méthode 1 : Via l'Interface Supabase (Recommandé)

1. **Allez dans Database > Replication**
   - Dans le dashboard Supabase, cliquez sur **Database** dans la barre latérale
   - Cliquez sur **Replication** dans le sous-menu

2. **Activez Realtime pour `organizations`**
   - Trouvez la table `organizations` dans la liste
   - Cliquez sur le toggle à droite pour activer Realtime
   - ✅ La table devrait passer en vert/activée

### Méthode 2 : Via SQL (Alternative)

Si la méthode 1 ne fonctionne pas, exécutez cette commande SQL :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
```

**Note** : Si vous voyez une erreur `relation "organizations" is already member of publication`, c'est bon signe ! Realtime est déjà activé.

---

## ✅ Étape 4 : Vérification

### Vérifier que tout fonctionne

1. **Vérifier la table organizations**
   ```sql
   SELECT * FROM organizations;
   ```
   - Vous devriez voir l'organisation SENEGEL avec l'ID `550e8400-e29b-41d4-a716-446655440000`

2. **Vérifier que organization_id existe dans les tables**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'projects' AND column_name = 'organization_id';
   ```
   - Devrait retourner `organization_id`

3. **Vérifier les RLS policies**
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('projects', 'courses', 'jobs')
   AND policyname LIKE '%organization%';
   ```
   - Devrait retourner plusieurs policies avec "organization" dans le nom

---

## 🎯 Utilisation

### Pour créer une nouvelle organisation partenaire

1. **Connectez-vous en tant que Super Administrateur**
   - Vous devez avoir le rôle `super_administrator`

2. **Allez dans Management Panel > Gestion des Organisations**
   - Le module devrait être visible dans le menu latéral

3. **Cliquez sur "Nouvelle Organisation"**
   - Remplissez le formulaire :
     - **Nom** : Ex: "Partenaire ABC"
     - **Slug** : Ex: "partenaire-abc" (sans espaces, minuscules)
     - **Description** : Optionnel
     - **Site Web** : Optionnel
     - **Email de contact** : Optionnel

4. **Cliquez sur "Créer"**
   - La nouvelle organisation devrait apparaître dans la liste

### Pour assigner un utilisateur à une organisation

Actuellement, lors de l'inscription, les utilisateurs sont assignés à SENEGEL par défaut.

**Futur** : Un système d'invitation sera ajouté pour permettre d'inviter des utilisateurs à rejoindre une organisation spécifique.

**Pour l'instant, manuellement via SQL** :
```sql
-- Remplacer USER_ID et ORGANIZATION_ID
UPDATE profiles 
SET organization_id = 'ORGANIZATION_ID' 
WHERE user_id = 'USER_ID';
```

---

## 🐛 Dépannage

### Erreur : "relation 'organizations' does not exist"

**Solution** : L'étape 1 n'a pas été exécutée correctement. Réexécutez le script `create-multi-tenant-architecture.sql`.

### Erreur : "column 'organization_id' does not exist"

**Solution** : Le script a échoué partiellement. Vérifiez les erreurs dans la console SQL et réexécutez uniquement les parties qui ont échoué.

### Erreur : "policy already exists"

**Solution** : C'est normal ! Cela signifie que la policy existe déjà. Le script utilise `DROP POLICY IF EXISTS` pour éviter cette erreur, mais si elle persiste, vous pouvez ignorer cette erreur spécifique.

### Les utilisateurs voient toujours toutes les données

**Solution** :
1. Vérifiez que les RLS policies ont été créées (Étape 4 - Vérification)
2. Vérifiez que les utilisateurs ont bien un `organization_id` dans `profiles`
3. Vérifiez que RLS est activé sur les tables :
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('projects', 'courses', 'jobs');
   ```
   - `rowsecurity` devrait être `true`

---

## 📚 Documentation Complète

Pour plus de détails sur l'architecture multi-tenant, consultez :
- `docs/ARCHITECTURE-MULTI-TENANT.md` - Documentation technique complète

---

**Créé le** : 2025-01-29  
**Dernière mise à jour** : 2025-01-29



