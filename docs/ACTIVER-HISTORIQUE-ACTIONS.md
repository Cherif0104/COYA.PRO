# 📋 Système d'Historique des Actions - Guide d'Activation

## 🎯 Fonctionnalités

Le système d'historique permet de :
- ✅ **Voir le créateur** de chaque entité (projet, facture, dépense, etc.)
- ✅ **Historique complet** de toutes les modifications (création, mise à jour, suppression)
- ✅ **Traçabilité** : qui a fait quoi et quand
- ✅ **Détails des changements** : quels champs ont été modifiés (avant/après)

## 📦 Installation (2 minutes)

### Étape 1 : Exécuter le script SQL dans Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Ouvrir **"SQL Editor"** → **"New query"**
4. Copier-coller le contenu du fichier `scripts/create-activity-logs-system.sql`
5. Cliquer sur **"Run"**
6. Attendre la confirmation "✅ Système d'historique créé avec succès!"

### Étape 2 : Vérifier l'installation

Exécuter cette requête dans Supabase SQL Editor :

```sql
SELECT 
    'activity_logs' as table_name,
    COUNT(*) as row_count
FROM activity_logs
UNION ALL
SELECT 
    'projects avec created_by_name' as table_name,
    COUNT(*) as row_count
FROM projects
WHERE created_by_name IS NOT NULL;
```

Si vous voyez des résultats, c'est que tout est installé correctement !

## 📍 Où voir l'historique ?

### 1. **Page de détails d'un projet**
- Ouvrir un projet
- Cliquer sur l'onglet **"Historique"**
- Voir toutes les modifications depuis la création

### 2. **Header des projets**
- Le nom du créateur apparaît dans le header de chaque projet
- Format : "Créé par: [Nom de l'utilisateur]"

### 3. **Modules concernés**
- ✅ **Projets** : Historique complet + créateur visible
- ✅ **Factures** : Créateur visible (historique à venir)
- ✅ **Dépenses** : Créateur visible (historique à venir)
- ✅ **Cours** : Créateur visible (historique à venir)
- ✅ **Objectifs (OKRs)** : Créateur visible (historique à venir)

## 🔍 Exemple d'historique

Quand vous créez ou modifiez un projet, l'historique affiche :

```
✨ Créé par: John Doe
   Projet créé
   Il y a 2h

📝 Modifié par: Jane Smith
   Projet modifié
   3 champ(s) modifié(s)
   - status: Not Started → In Progress
   - description: [ancien] → [nouveau]
   Il y a 30 min
```

## 🔧 Dépannage

### Problème : "L'historique n'est pas encore disponible"

**Solution :** Exécuter le script SQL dans Supabase (voir Étape 1)

### Problème : Le créateur n'apparaît pas

**Solution :** 
1. Vérifier que la colonne `created_by_name` existe dans la table
2. Les nouveaux projets afficheront automatiquement le créateur
3. Les anciens projets peuvent ne pas avoir cette information

### Problème : L'historique est vide

**Solution :**
1. L'historique commence à être enregistré après l'installation
2. Les actions antérieures à l'installation ne seront pas dans l'historique
3. Créer ou modifier une entité pour voir l'historique se remplir

## 📊 Tables créées

### `activity_logs`
- `id` : UUID
- `entity_type` : Type d'entité ('project', 'invoice', etc.)
- `entity_id` : ID de l'entité
- `action` : 'created', 'updated', 'deleted'
- `user_id` : ID du profil de l'utilisateur
- `user_name` : Nom de l'utilisateur
- `user_email` : Email de l'utilisateur
- `changes` : JSONB avec les détails des modifications
- `description` : Description de l'action
- `created_at` : Timestamp

## 🎨 Interface utilisateur

L'historique s'affiche dans un composant moderne avec :
- 🟢 **Créateur** mis en évidence (badge vert)
- 📝 **Modifications** avec détails des champs changés
- ⏰ **Dates relatives** ("Il y a 2h", "Il y a 3j")
- 📊 **Statistiques** : nombre de modifications par action

## ✅ Validation

Après installation, testez :
1. Créer un nouveau projet
2. Modifier le projet (changer le statut, la description)
3. Ouvrir la page de détails → Onglet "Historique"
4. Vérifier que toutes les actions apparaissent avec le bon utilisateur

---

**Note :** Ce système enregistre automatiquement toutes les actions futures. Les actions passées ne seront pas rétroactivement ajoutées.


