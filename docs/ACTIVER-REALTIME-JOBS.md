# 🔴 Activer Realtime pour les Offres d'Emploi

Ce guide vous explique comment activer les mises à jour en temps réel pour le nombre de postulants dans le module Job Management.

## 📋 Étapes d'Activation

### 1. Accéder à la Table `jobs` dans Supabase

1. Connectez-vous à votre tableau de bord Supabase
2. Allez dans **Database** → **Tables**
3. Trouvez la table `jobs`

### 2. Activer Realtime pour la Table `jobs`

#### Méthode 1 : Via l'Interface Graphique

1. Cliquez sur la table `jobs`
2. Allez dans l'onglet **"Replication"** (ou **"Realtime"** selon votre version)
3. Activez le toggle **"Enable Realtime"** pour la table `jobs`
4. Cliquez sur **"Save"**

#### Méthode 2 : Via SQL Editor (Recommandé)

1. Allez dans **SQL Editor** dans Supabase
2. Exécutez cette commande :

```sql
-- Activer Realtime pour la table jobs
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
```

### 3. Vérification

Après activation, vous devriez voir :
- ✅ La table `jobs` dans la liste des tables avec Realtime activé
- ✅ Dans Job Management, les mises à jour apparaîtront automatiquement

## 🔍 Fonctionnalités Temps Réel

Une fois activé, le système mettra à jour automatiquement :

- ✅ **Nombre de candidats** : Le compteur se met à jour en temps réel quand quelqu'un postule
- ✅ **Scores moyens** : Calculés automatiquement quand de nouveaux candidats sont ajoutés
- ✅ **Top candidat** : Mis à jour en temps réel
- ✅ **Statistiques globales** : Total des candidats, offres, etc.

## 🎯 Indicateurs Visuels

Dans Job Management, vous verrez :

1. **Badge vert pulsant** : Indique que les données sont mises à jour en temps réel
2. **Icône de synchronisation** : Affiche "Temps réel" dans les scores
3. **Point vert** : Sur le bouton "Voir candidats" indiquant une mise à jour active

## 🐛 Dépannage

### Le nombre de candidats ne se met pas à jour

1. **Vérifier Realtime** : Assurez-vous que Realtime est activé pour `jobs`
2. **Console du navigateur** : Vérifiez les logs `🔄 JobManagement - Abonnement Realtime`
3. **Permissions RLS** : Assurez-vous que les politiques RLS permettent la lecture de `jobs`

### Realtime ne fonctionne pas

Si vous voyez cette erreur : `ERROR: 42710: relation "jobs" is already member of publication "supabase_realtime"`

Cela signifie que Realtime est **déjà activé** ✅ - pas besoin de le faire à nouveau.

### Recharger manuellement

Si les données ne se mettent pas à jour, rechargez la page. Le système synchronisera automatiquement.

## 📝 Notes Techniques

- Le système utilise Supabase Realtime via `postgres_changes`
- Les mises à jour sont détectées via les événements `UPDATE` et `INSERT` sur la table `jobs`
- Le composant `JobManagement` se réabonne automatiquement à chaque chargement
- Les données sont mises en cache localement pour améliorer les performances


