# 🔧 Activer Realtime pour la table notifications

## ⚠️ Important

La page "Replication" que vous voyez est pour les **réplications externes** (BigQuery, Iceberg, etc.), pas pour activer Realtime local.

## ✅ Méthode Recommandée : Via SQL (Plus Simple)

La méthode la plus simple est d'exécuter cette commande SQL directement :

### Étape 1 : Ouvrir SQL Editor

1. Dans Supabase Dashboard
2. Menu de gauche : **SQL Editor**
3. Cliquer sur **"New query"**

### Étape 2 : Exécuter la commande

Copier-coller cette commande SQL :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Étape 3 : Cliquer sur "Run"

Vous devriez voir :
```
Success. No rows returned
```

C'est normal ! Cela signifie que Realtime est maintenant activé pour la table `notifications`.

## ✅ Méthode Alternative : Via l'Interface Tables

Si vous préférez utiliser l'interface :

1. **Dans Supabase Dashboard**
   - Menu de gauche : **Database** → **Tables**

2. **Trouver la table `notifications`**
   - Dans la liste des tables, chercher **"notifications"**
   - Cliquer sur le nom de la table

3. **Onglet Replication**
   - Une fois dans la vue détaillée de la table
   - Chercher l'onglet **"Replication"** ou **"Realtime"**
   - Activer le toggle **"Enable Realtime"**

## 🔍 Vérifier que Realtime est activé

Exécuter cette requête SQL pour vérifier :

```sql
SELECT 
    schemaname, 
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications';
```

**Résultat attendu :**
- Si la table `notifications` apparaît dans les résultats → ✅ Realtime est activé
- Si aucun résultat → ❌ Realtime n'est pas activé

## 🎯 Alternative : Vérifier la publication

```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Cette requête liste toutes les tables avec Realtime activé. Si `notifications` est dans la liste, c'est bon !

---

**Recommandation :** Utilisez la méthode SQL (`ALTER PUBLICATION`), c'est la plus rapide et la plus fiable ! 🚀


