# Analyse de la Logique Métier - Module Time Tracking

## 📋 Vue d'ensemble

Le module **Time Tracking** permet aux utilisateurs de suivre le temps passé sur différents types d'activités (projets, cours, tâches) et de gérer leurs réunions.

---

## 🔐 1. RÈGLES DE SÉCURITÉ ET ACCÈS

### 1.1 Authentification
- **Règle BL-001** : Seuls les utilisateurs authentifiés peuvent créer, consulter, modifier et supprimer leurs time logs
- **Implémentation** : Validation via `supabase.auth.getUser()` dans `DataService.createTimeLog()`
- **Contrôle d'accès** : RLS (Row Level Security) au niveau Supabase

### 1.2 Isolation des données utilisateur
- **Règle BL-002** : Un utilisateur ne peut voir que ses propres time logs
- **Implémentation** : 
  - Filtrage frontend : `timeLogs.filter(log => String(log.userId) === userIdToMatch)`
  - Filtrage backend : RLS policies vérifiant `user_id = profiles.id AND profiles.user_id = auth.uid()`
- **Identifiant utilisé** : `profiles.id` (UUID du profil) et non `auth.users.id`

---

## 📊 2. MODÈLE DE DONNÉES

### 2.1 Structure TimeLog

```typescript
interface TimeLog {
  id: string;              // UUID from Supabase (PK)
  userId: string;          // UUID du profil (profiles.id) - FK
  entityType: 'project' | 'course' | 'task';
  entityId: number | string;  // ID de l'entité associée (UUID ou string)
  entityTitle: string;     // Titre de l'entité pour affichage rapide
  date: string;            // Date du log (format ISO: yyyy-MM-dd)
  duration: number;        // Durée en MINUTES (unité principale)
  description: string;     // Description libre
}
```

### 2.2 Table Supabase `time_logs`

**Colonnes principales** :
- `id` (uuid, PK) : Identifiant unique
- `user_id` (uuid, FK → profiles.id) : Propriétaire du log
- `project_id` (uuid, nullable, FK → projects.id) : Si lié à un projet UUID
- `course_id` (uuid, nullable, FK → courses.id) : Si lié à un cours UUID
- `task_id` (uuid, nullable) : Si lié à une tâche UUID
- `entity_type` (text) : Type d'entité ('project', 'course', 'task')
- `entity_id` (text) : ID de l'entité (peut être UUID ou string pour compatibilité)
- `entity_title` (text) : Titre de l'entité pour affichage
- `duration` (integer) : Durée en minutes
- `hours` (numeric, NOT NULL) : Durée en heures (calculé automatiquement)
- `date` (date, NOT NULL) : Date du log
- `description` (text, nullable) : Description libre
- `created_at`, `updated_at` : Timestamps automatiques

---

## ✅ 3. RÈGLES DE VALIDATION

### 3.1 Validation lors de la création (Frontend)

**Règle BL-003** : Durée minimale
- La durée doit être strictement positive (> 0)
- Implémentation : `if (!duration || Number(duration) <= 0)`

**Règle BL-004** : Sélection d'entité obligatoire
- Si `entityType === 'project'`, un projet doit être sélectionné
- Si `entityType === 'course'`, un cours doit être sélectionné
- Cas particulier : Si ouvert depuis une réunion, `entityType` par défaut = 'project'

**Règle BL-005** : Format de date
- La date doit être au format ISO (`yyyy-MM-dd`)
- Validation HTML5 avec `input type="date"`

### 3.2 Validation au niveau backend (Supabase)

**Règle BL-006** : Profil utilisateur requis
- Un profil doit exister dans `profiles` pour l'utilisateur authentifié
- Erreur si profil introuvable : `"Profil non trouvé"`

**Règle BL-007** : Gestion des UUIDs
- Si `entityId` est un UUID valide, il est stocké dans `project_id`, `course_id`, ou `task_id`
- Si `entityId` n'est pas un UUID (ex: "meeting", "ai-task-..."), seul `entity_id` (text) est utilisé
- Logique : `isValidUUID()` vérifie le format UUID avant assignation

---

## 🔄 4. LOGIQUE D'AFFECTATION ENTITÉ

### 4.1 Types d'entités supportées

**Project (Projet)** :
- Si `entityType === 'project'` et UUID valide → stocké dans `project_id`
- Si tâche sélectionnée → `entityType = 'task'`, `entityId = taskId`

**Course (Cours)** :
- Si `entityType === 'course'` et UUID valide → stocké dans `course_id`
- Sinon → stocké uniquement dans `entity_id` (text)

**Task (Tâche)** :
- IDs de tâches peuvent être non-UUID (ex: "ai-task-1761739925911-2")
- Stocké uniquement dans `entity_id` (text) et `entity_type = 'task'`

**Meeting (Réunion)** :
- Cas spécial : `entityId = 'meeting'` (string littérale)
- Stocké uniquement dans `entity_id` (text)
- `entityType` par défaut = 'project'

### 4.2 Règle BL-008 : Dualité de stockage
- **UUID valides** → Stockés dans colonnes FK dédiées (`project_id`, `course_id`, `task_id`)
- **Non-UUID** → Stockés uniquement dans `entity_id` (text) pour flexibilité
- **Pourquoi ?** : Compatibilité avec IDs locaux (tâches générées par IA, réunions, etc.)

---

## 📈 5. CALCUL DES MÉTRIQUES

### 5.1 Métriques calculées

**Règle BL-009** : Calcul des métriques
```typescript
{
  totalLogs: number,        // Nombre total de logs utilisateur
  totalHours: number,      // Total en heures (arrondi 1 décimale)
  avgMinutesPerDay: number, // Moyenne sur 7 jours (totalMinutes / 7)
  thisWeekLogs: number     // Logs créés dans les 7 derniers jours
}
```

**Règle BL-010** : Conversion des unités
- **Unité principale** : Minutes (`duration` en minutes)
- **Unité secondaire** : Heures (`hours = duration / 60`)
- **Affichage** : Heures arrondies à 1 décimale

**Règle BL-011** : Période de calcul
- **"Cette semaine"** : Logs créés dans les 7 derniers jours (relatif à aujourd'hui)
- **Moyenne quotidienne** : Basée sur 7 jours (arbitraire, pourrait être configurable)

---

## 🔍 6. FILTRAGE ET RECHERCHE

### 6.1 Filtrage par utilisateur

**Règle BL-012** : Isolation utilisateur (frontend)
- Seuls les logs où `log.userId === user.profileId` sont affichés
- Utilise `useMemo` pour optimiser le calcul

### 6.2 Filtrage par type d'entité

**Règle BL-013** : Filtre par type
- Options : 'all', 'project', 'course', 'task'
- Appliqué après le filtrage utilisateur

### 6.3 Recherche textuelle

**Règle BL-014** : Recherche insensible à la casse
- Recherche dans : `entityTitle` et `description`
- Utilise `.toLowerCase()` et `.includes()`

### 6.4 Tri

**Règle BL-015** : Options de tri
- **Par date** : `new Date(a.date).getTime() - new Date(b.date).getTime()`
- **Par durée** : `a.duration - b.duration`
- **Par entité** : `a.entityTitle.localeCompare(b.entityTitle)`
- **Ordre** : Ascendant ou descendant (toggle)

---

## 🎯 7. CRÉATION DEPUIS CONTEXTE

### 7.1 Création depuis une réunion

**Règle BL-016** : Log depuis réunion
- Auto-remplissage : Durée calculée depuis `startTime` et `endTime`
- Description : `"Meeting: ${meeting.title}"`
- Date : Date de début de la réunion
- Type : `entityType = 'project'`, `entityId = 'meeting'`

**Calcul durée** :
```typescript
const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
```

### 7.2 Création depuis un projet/tâche

**Règle BL-017** : Pré-sélection d'entité
- Possibilité de passer `initialEntity` au modal
- Auto-remplissage du type et de l'ID d'entité

---

## 💾 8. PERSISTANCE ET DONNÉES

### 8.1 Stratégie de persistance

**Règle BL-018** : Utilisation exclusive de Supabase
- Aucune donnée mockée utilisée
- Tous les logs sont persistés dans `time_logs` (Supabase)
- RLS activé pour sécurité

### 8.2 Conversion de données

**Règle BL-019** : Mapping Supabase → Application
- `log.id` → UUID string (pas de conversion en number)
- `log.user_id` → UUID string (profile.id)
- `log.duration` → Minutes (si null, calculé depuis `hours * 60`)
- `log.entity_type` → Type enum ('project' | 'course' | 'task')
- `log.entity_id` → ID de l'entité (string ou number selon contexte)

---

## 🔐 9. POLITIQUES RLS (Row Level Security)

### 9.1 Règles de sécurité Supabase

**Règle BL-020** : SELECT Policy
- Les utilisateurs ne peuvent lire que leurs propres logs
- Condition : `user_id = profiles.id AND profiles.user_id = auth.uid()`

**Règle BL-021** : INSERT Policy
- Les utilisateurs peuvent créer leurs propres logs uniquement
- Même condition que SELECT

**Règle BL-022** : UPDATE Policy
- Les utilisateurs peuvent modifier uniquement leurs propres logs
- Même condition

**Règle BL-023** : DELETE Policy
- Les utilisateurs peuvent supprimer uniquement leurs propres logs
- Même condition

---

## 📅 10. LOGIQUE MÉTIER SPÉCIFIQUE

### 10.1 Gestion de la date par défaut

**Règle BL-024** : Date par défaut
- Si non fournie, utilise la date du jour : `new Date().toISOString().split('T')[0]`
- Format toujours : `yyyy-MM-dd` (ISO date)

### 10.2 Calcul automatique des heures

**Règle BL-025** : Conversion durée/heures
- Calculé automatiquement : `hours = duration / 60`
- Stocké dans `hours` (numeric, NOT NULL)
- Permet requêtes SQL efficaces sur heures

### 10.3 Timestamps automatiques

**Règle BL-026** : Création et mise à jour
- `created_at` : Défini lors de la création
- `updated_at` : Défini à la création et à chaque mise à jour

---

## 🚨 11. GESTION D'ERREURS

### 11.1 Erreurs possibles

1. **Utilisateur non authentifié** → `"Utilisateur non authentifié"`
2. **Profil introuvable** → `"Profil non trouvé: {message}"`
3. **Durée invalide** → Alert frontend : `"Veuillez saisir une durée valide"`
4. **Entité introuvable** → Alert : `"Cours non trouvé"` ou `"Veuillez sélectionner un projet ou un cours"`
5. **UUID invalide** → Erreur PostgreSQL : `"invalid input syntax for type uuid"` (gérée par validation préalable)

---

## 📝 12. POINTS D'ATTENTION / AMÉLIORATIONS POSSIBLES

### 12.1 Limites actuelles

1. **Moyenne quotidienne** : Basée sur 7 jours fixes (non configurable)
2. **Validation durée max** : Aucune limite maximale (peut accepter des valeurs irréalistes)
3. **Doublons possibles** : Pas de vérification de doublons (même projet, même date, même durée)
4. **Correction de logs** : Possibilité de modifier des logs anciens (pas de restriction temporelle)

### 12.2 Améliorations suggérées (non critiques)

1. **Règle BL-027** (suggérée) : Limite de durée maximale par jour (ex: 24h = 1440 minutes)
2. **Règle BL-028** (suggérée) : Détection de doublons avant création
3. **Règle BL-029** (suggérée) : Restriction modification de logs > 30 jours
4. **Règle BL-030** (suggérée) : Validation existence projet/cours avant création log

---

## ✅ 13. VALIDATION DU MODULE

### 13.1 Fonctionnalités validées

✅ Création de time logs  
✅ Modification de time logs  
✅ Suppression de time logs  
✅ Filtrage par utilisateur  
✅ Filtrage par type d'entité  
✅ Recherche textuelle  
✅ Tri multi-critères  
✅ Calcul de métriques  
✅ Affichage en grille/liste/compact  
✅ Persistance Supabase  
✅ RLS policies actives  
✅ Gestion UUID/non-UUID  
✅ Création depuis contexte (réunions, projets, tâches)  

### 13.2 Conformité MVP Client

✅ Interface modernisée (header gradient, métriques Power BI style)  
✅ Persistance réelle (Supabase, pas de mock)  
✅ RLS respecté  
✅ Module développé et validé  
✅ Prêt pour verrouillage  

---

## 📌 CONCLUSION

Le module **Time Tracking** implémente une logique métier solide avec :
- ✅ Séparation claire des responsabilités
- ✅ Validation à tous les niveaux (frontend, backend, base de données)
- ✅ Isolation des données utilisateur
- ✅ Flexibilité pour gérer différents types d'entités
- ✅ Calculs de métriques pertinents
- ✅ Interface utilisateur moderne et intuitive

**Statut** : ✅ **MODULE VALIDÉ ET OPÉRATIONNEL**


