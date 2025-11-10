# ✅ Activer Realtime pour les Notifications

## 🎯 Étape Finale

Le script SQL a été exécuté avec succès ! Il reste une dernière étape pour activer les notifications en temps réel.

## 📝 Instructions

### Option 1 : Via l'Interface Supabase (Recommandé)

1. **Dans Supabase Dashboard**
   - Aller dans **"Database"** (menu de gauche)
   - Cliquer sur **"Replication"**

2. **Trouver la table `notifications`**
   - Dans la liste des tables, trouver **"notifications"**
   - Chercher la colonne **"Realtime"**

3. **Activer Realtime**
   - Cliquer sur le **toggle** pour activer **"Enable Realtime"**
   - Le toggle devrait passer de gris à vert/bleu

### Option 2 : Via SQL (Alternative)

Si l'interface ne fonctionne pas, exécuter cette commande SQL :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Note :** Si la table est déjà dans la publication, vous verrez peut-être une erreur. C'est normal, cela signifie que c'est déjà activé.

## ✅ Vérification

Après activation, vous pouvez tester :

1. **Créer un projet** dans l'application
2. **Vérifier** que les membres de l'équipe reçoivent une notification en temps réel
3. **Ouvrir** le centre de notifications (icône cloche dans le Header)

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

Si la table `notifications` apparaît dans les résultats, Realtime est activé ! ✅

## 🐛 Si les notifications ne fonctionnent pas

1. Vérifier que Realtime est activé (voir ci-dessus)
2. Vérifier la console du navigateur pour des erreurs
3. Vérifier que l'utilisateur est bien connecté
4. Vérifier que les membres de l'équipe ont bien été assignés au projet

---

**Une fois Realtime activé, le système de notifications en temps réel sera pleinement fonctionnel !** 🚀


