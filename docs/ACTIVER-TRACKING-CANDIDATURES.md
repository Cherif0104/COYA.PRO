# 📊 Activer le Système de Tracking des Candidatures par Source

Ce guide vous explique comment activer le suivi détaillé des candidatures avec leur source (bouton "Postuler", email, lien externe).

## 📋 Étapes d'Activation

### 1. Exécuter le Script SQL

1. Connectez-vous à votre tableau de bord Supabase
2. Allez dans **SQL Editor**
3. Copiez et collez le contenu de `scripts/create-job-applications-tracking.sql`
4. Cliquez sur **Run** pour exécuter le script

Le script va :
- ✅ Créer la table `job_applications` avec les colonnes nécessaires
- ✅ Ajouter les index pour les performances
- ✅ Configurer les politiques RLS (Row Level Security)
- ✅ Créer des triggers pour mettre à jour automatiquement `applicants_count` dans `jobs`
- ✅ Activer Realtime pour les mises à jour en temps réel

### 2. Vérification

Après exécution, vérifiez que :
- ✅ La table `job_applications` existe dans Database → Tables
- ✅ Les politiques RLS sont actives (Database → Tables → job_applications → Policies)
- ✅ Realtime est activé (Database → Replication)

### 3. Utilisation

Une fois activé, le système va automatiquement :

#### Pour les Candidats :
- ✅ Tracker chaque clic sur "Postuler" → source: `online`
- ✅ Tracker chaque clic sur "Envoyer un email" → source: `email`
- ✅ Tracker chaque clic sur "Postuler en ligne" (lien externe) → source: `link`

#### Pour les Employeurs/Administrateurs :
- ✅ Voir les statistiques par source dans Job Management
- ✅ Voir le nombre de candidatures par source (bouton, email, lien)
- ✅ Voir la source de chaque candidat dans la modal de détails
- ✅ Mises à jour en temps réel via Realtime

## 📊 Statistiques Disponibles

### Métriques Globales (Job Management)
- **Total par bouton "Postuler"** : Nombre de candidatures via le bouton principal
- **Total par email** : Nombre de candidatures via mailto
- **Total par lien externe** : Nombre de candidatures via liens externes
- **Pourcentages** : Distribution des candidatures par source

### Par Offre d'Emploi
- Badges affichant le nombre de candidatures par source
- Scores moyens et top candidat
- Liste détaillée avec source pour chaque candidat

## 🎯 Avantages

1. **Analyse du Comportement** : Comprendre comment les candidats préfèrent postuler
2. **Optimisation** : Améliorer les processus de recrutement basés sur les données
3. **ROI** : Mesurer l'efficacité de chaque canal de candidature
4. **Temps Réel** : Suivre les candidatures en direct sans rechargement

## 🔍 Exemple de Données

```sql
-- Voir toutes les candidatures avec leur source
SELECT 
  j.title as job_title,
  p.full_name as candidate_name,
  ja.source,
  ja.applied_at
FROM job_applications ja
JOIN jobs j ON ja.job_id = j.id
JOIN profiles p ON ja.user_id = p.user_id
ORDER BY ja.applied_at DESC;
```

## 🐛 Dépannage

### Les candidatures ne sont pas trackées

1. Vérifiez que la table `job_applications` existe
2. Vérifiez les politiques RLS (les utilisateurs doivent pouvoir INSÉRER leurs propres candidatures)
3. Vérifiez la console du navigateur pour les erreurs

### Les statistiques ne s'affichent pas

1. Rechargez la page pour synchroniser les données
2. Vérifiez que Realtime est activé pour `job_applications`
3. Attendez quelques secondes, les mises à jour peuvent prendre du temps

### Erreur "relation does not exist"

Le script SQL n'a pas été exécuté. Retournez à l'étape 1 et exécutez le script.

## 📝 Structure de la Table

```sql
CREATE TABLE job_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  user_id UUID REFERENCES auth.users(id),
  source TEXT CHECK (source IN ('online', 'email', 'link', 'direct')),
  applied_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  match_score NUMERIC(5,2),
  UNIQUE(job_id, user_id)
);
```


