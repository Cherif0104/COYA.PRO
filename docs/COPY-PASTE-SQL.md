# 🚀 Guide Simple - Copier le SQL dans Supabase

## ⚠️ ERREUR ACTUELLE

Vous avez copié du **JavaScript** (`import { createClient }`) au lieu du **SQL**.

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1 : Ouvrir le BON fichier

Dans votre éditeur VS Code / Cursor :

1. **Aller dans** : `C:\Users\HP\Desktop\MES SITE WEB\EcosystIA-MVP\scripts\`
2. **Ouvrir** : `create-notifications-system.sql` (✅ PAS le `.js`)
3. **Vérifier** : La première ligne doit être `-- ====================================================`
   - ❌ **PAS** `import { createClient }`
   - ✅ **OUI** `-- ====================================================`

### ÉTAPE 2 : Sélectionner TOUT

1. Cliquer n'importe où dans le fichier
2. **Ctrl+A** (sélectionner tout)
3. **Ctrl+C** (copier)

### ÉTAPE 3 : Coller dans Supabase

1. **Aller sur Supabase** : https://supabase.com/dashboard
2. **SQL Editor** → **New query**
3. **Effacer** tout le contenu actuel (sélectionner tout + Delete)
4. **Coller** : Ctrl+V

Le contenu devrait commencer par :
```sql
-- ====================================================
-- SYSTÈME DE NOTIFICATIONS EN TEMPS RÉEL
-- ====================================================
-- Ce script crée la table notifications et active Realtime
...
```

5. **Cliquer** sur le bouton vert **"Run"**

## ✅ RÉSULTAT ATTENDU

Vous devriez voir :
```
✅ Système de notifications créé avec succès!
📝 IMPORTANT: Activez Realtime manuellement dans Supabase Dashboard > Database > Replication
```

## 🔧 ACTIVER REALTIME (Important !)

Après l'exécution réussie :

1. Dans Supabase Dashboard
2. **Database** → **Replication**
3. Trouver la table **"notifications"**
4. **Activer** le toggle **"Enable Realtime"**

---

**Si l'erreur persiste :**
- Vérifiez que vous avez bien ouvert `create-notifications-system.sql` (pas `.js`)
- Le fichier doit commencer par `-- ====================================================`
- Aucune ligne ne doit contenir `import` ou `export`


