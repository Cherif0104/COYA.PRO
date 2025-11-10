# 🔔 Système de Notifications en Temps Réel - Guide d'Activation

## 🎯 Fonctionnalités

Le système de notifications en temps réel permet de :
- ✅ **Notifier en temps réel** tous les utilisateurs des actions (création, modification, suppression)
- ✅ **Notifications par module** : projets, factures, dépenses, cours, objectifs, demandes de congé
- ✅ **Notifications par action** : créé, modifié, supprimé, approuvé, rejeté, assigné
- ✅ **Badge de notification** dans le Header avec compteur
- ✅ **Centre de notifications** moderne avec filtres
- ✅ **Notifications persistantes** dans Supabase

## 📦 Installation (3 minutes)

### Étape 1 : Exécuter le script SQL dans Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Ouvrir **"SQL Editor"** → **"New query"**
4. Copier-coller le contenu du fichier `scripts/create-notifications-system.sql`
5. Cliquer sur **"Run"**
6. Attendre la confirmation

### Étape 2 : Activer Realtime pour la table notifications

1. Dans Supabase Dashboard, aller dans **"Database"** → **"Replication"**
2. Trouver la table **"notifications"** dans la liste
3. Activer **"Enable Realtime"** pour cette table
4. Ou exécuter cette commande SQL :
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
   ```

### Étape 3 : Vérifier l'installation

Exécuter cette requête dans Supabase SQL Editor :

```sql
-- Vérifier que la table existe
SELECT COUNT(*) as total_notifications FROM notifications;

-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';
```

## 📍 Où voir les notifications ?

### 1. **Badge de notification dans le Header**
- Icône de cloche en haut à droite
- Badge rouge avec le nombre de notifications non lues
- Cliquer pour ouvrir le centre de notifications

### 2. **Centre de notifications**
- Panel moderne avec toutes les notifications
- Filtres : Toutes, Non lues, Par module
- Actions : Marquer comme lu, Supprimer, Tout marquer lu
- Navigation vers l'entité concernée au clic

### 3. **Notifications en temps réel**
- Les nouvelles notifications apparaissent automatiquement
- Pas besoin de rafraîchir la page
- Badge mis à jour en temps réel

## 🔔 Types de notifications

### Par Module

#### **Projets**
- ✅ Création de projet → Notifie tous les membres de l'équipe
- ✅ Modification de projet → Notifie l'équipe
- ✅ Suppression de projet → Notifie l'équipe

#### **Factures**
- ✅ Création de facture → Notifie le créateur
- ✅ Facture payée → Notifie le propriétaire
- ✅ Facture partiellement payée → Notifie le propriétaire

#### **Demandes de Congé**
- ✅ Demande créée → Notifie le manager
- ✅ Demande approuvée → Notifie le demandeur
- ✅ Demande rejetée → Notifie le demandeur

#### **Objectifs (OKRs)**
- ✅ Objectif créé → Notifie le créateur
- ✅ Objectif modifié → Notifie le propriétaire
- ✅ Objectif complété → Notifie l'équipe

#### **Cours**
- ✅ Cours créé → Notifie les étudiants ciblés
- ✅ Cours assigné → Notifie l'étudiant
- ✅ Cours complété → Notifie l'instructeur et l'étudiant

## 🎨 Interface utilisateur

### Badge de notification
- 🟢 **Compteur** : Nombre de notifications non lues
- 🔴 **Badge rouge** : Visible si > 0
- ⚡ **Temps réel** : Mis à jour automatiquement

### Centre de notifications
- 📋 **Liste complète** avec scroll
- 🎯 **Filtres** : Toutes, Non lues, Par module
- ✅ **Actions** : Marquer lu, Supprimer
- 🔗 **Navigation** : Clic pour aller à l'entité

### Types visuels
- 🟢 **Success** : Actions réussies (paiement, approbation)
- 🔵 **Info** : Informations générales (création, modification)
- 🟡 **Warning** : Avertissements (suppression)
- 🔴 **Error** : Erreurs (rejet)

## 🔧 Configuration

### Modules avec notifications activées
- ✅ Projets
- ✅ Factures
- ✅ Demandes de congé
- ✅ Objectifs (OKRs)
- ✅ Cours (partiel)

### Modules à venir
- ⏳ Dépenses
- ⏳ Time Tracking
- ⏳ Knowledge Base
- ⏳ Jobs

## ✅ Validation

Après installation, testez :
1. Créer un nouveau projet
2. Vérifier que les membres de l'équipe reçoivent une notification
3. Modifier le projet
4. Vérifier que les notifications apparaissent en temps réel
5. Cliquer sur une notification pour naviguer vers l'entité

## 🆘 Dépannage

### Problème : Les notifications n'apparaissent pas

**Solution :**
1. Vérifier que Realtime est activé pour la table `notifications`
2. Vérifier que le script SQL a été exécuté
3. Vérifier la console du navigateur pour les erreurs

### Problème : Les notifications ne se mettent pas à jour en temps réel

**Solution :**
1. Vérifier la connexion WebSocket dans la console
2. Vérifier que Realtime est activé dans Supabase
3. Recharger la page

### Problème : Badge ne se met pas à jour

**Solution :**
1. Vérifier que `NotificationCenter` est intégré dans le Header
2. Vérifier que l'utilisateur a un `profileId`
3. Vérifier les logs dans la console

---

**Note :** Ce système fonctionne avec Supabase Realtime pour des notifications instantanées. Les notifications sont également persistées dans la base de données pour consultation ultérieure.


