# 🚀 Guide Simple - Exécuter le Script SQL pour Notifications

## ⚠️ IMPORTANT

L'éditeur SQL de Supabase accepte **UNIQUEMENT du SQL**, pas du JavaScript.

## ✅ Méthode Correcte

### 1. Ouvrir le bon fichier

Ouvrir le fichier : **`scripts/create-notifications-system.sql`**
- ❌ **PAS** `create-super-admin.js` (c'est du JavaScript)
- ✅ **OUI** `create-notifications-system.sql` (c'est du SQL)

### 2. Étapes d'exécution

1. **Aller sur Supabase Dashboard**
   - URL : https://supabase.com/dashboard
   - Sélectionner le projet **"IMPULCIA AFRIQUE"**

2. **Ouvrir SQL Editor**
   - Menu de gauche : Cliquer sur **"SQL Editor"** (icône avec `</>`)
   - Cliquer sur **"New query"** ou **"Untitled query"**

3. **Ouvrir le fichier SQL**
   - Dans votre éditeur de code (VS Code, etc.)
   - Ouvrir : `C:\Users\HP\Desktop\MES SITE WEB\EcosystIA-MVP\scripts\create-notifications-system.sql`
   - Sélectionner **TOUT le contenu** (Ctrl+A)
   - **Copier** (Ctrl+C)

4. **Coller dans Supabase**
   - Dans l'éditeur SQL de Supabase
   - **Effacer** tout le contenu actuel (s'il y a du JavaScript)
   - **Coller** le SQL copié (Ctrl+V)

5. **Exécuter**
   - Cliquer sur le bouton vert **"Run"** (ou Ctrl+Enter)
   - Attendre la confirmation

### 3. Vérifier l'exécution

Vous devriez voir dans "Results" :
```
✅ Système de notifications créé avec succès!
```

Et un nombre de triggers créés.

## 🔧 Activer Realtime (Important !)

Après l'exécution du script SQL :

1. Dans Supabase Dashboard
2. Aller dans **"Database"** → **"Replication"**
3. Trouver la table **"notifications"**
4. **Activer** le toggle **"Enable Realtime"**

Ou exécuter cette commande SQL :
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## ✅ Validation

Après activation, créer un projet et vérifier que :
- Le badge de notification apparaît dans le Header
- Les notifications s'affichent en temps réel
- Les membres de l'équipe reçoivent des notifications

---

**Note :** Si vous voyez une erreur avec `import { createClient }`, c'est parce que vous essayez d'exécuter du JavaScript dans l'éditeur SQL. Utilisez uniquement les fichiers `.sql`.


