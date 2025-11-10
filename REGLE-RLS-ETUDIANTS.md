# 🎓 Règles RLS pour les Étudiants

## ✅ Situation Finale

### Contexte
Vous avez demandé que **les étudiants font partie des rôles externes** mais avec des **règles RLS spécifiques**, comme les autres utilisateurs externes à SENEGEL.

### Solution Implémentée
✅ Organisation STUDENTS créée avec UUID `11111111-1111-1111-1111-111111111111`  
✅ Tous les étudiants assignés à l'organisation STUDENTS  
✅ Règles RLS spécifiques pour les étudiants  
✅ Isolation totale des données entre étudiants  

---

## 🏗️ Architecture des Organisations

### 1. SENEGEL (Rôles Internes)
**UUID** : `550e8400-e29b-41d4-a716-446655440000`

**Rôles** :
- `super_administrator`
- `administrator`
- `manager`
- `supervisor`
- `intern`

**Règles** : Voir tous les projets SENEGEL, collaboration interne

### 2. STUDENTS (Étudiants)
**UUID** : `11111111-1111-1111-1111-111111111111`

**Rôles** :
- `student`

**Règles** : Isolation totale, voir UNIQUEMENT ses propres projets

### 3. NULL (Autres Utilisateurs Externes)
**UUID** : NULL

**Rôles** :
- `entrepreneur`, `employer`, `trainer`, `funder`, `implementer`, `mentor`, `coach`, `facilitator`, `publisher`, `editor`, `producer`, `artist`, `alumni`

**Règles** : Isolation totale, voir UNIQUEMENT ses propres projets

---

## 🔒 Politiques RLS pour les Projets

### Policy 1 : Étudiants (`projects_select_students`)
```sql
CREATE POLICY "projects_select_students" ON projects
FOR SELECT TO authenticated
USING (
  -- Si l'utilisateur est un étudiant
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'student'
  )
  -- Alors il voit UNIQUEMENT ses propres projets
  AND owner_id = auth.uid()
);
```

**Résultat** : ✅ Un étudiant voit UNIQUEMENT ses projets

### Policy 2 : Autres Utilisateurs Externes (`projects_select_external`)
```sql
CREATE POLICY "projects_select_external" ON projects
FOR SELECT TO authenticated
USING (
  -- Si l'utilisateur N'est PAS un étudiant ET N'appartient PAS à SENEGEL
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.role = 'student' OR profiles.organization_id = '550e8400-e29b-41d4-a716-446655440000')
  )
  -- Alors il voit UNIQUEMENT ses propres projets
  AND (owner_id = auth.uid() OR auth.uid()::text = ANY(team_members))
);
```

**Résultat** : ✅ Les autres utilisateurs externes voient UNIQUEMENT leurs projets

### Policy 3 : Équipe SENEGEL (`projects_select_senegal`)
```sql
CREATE POLICY "projects_select_senegal" ON projects
FOR SELECT TO authenticated
USING (
  -- Si l'utilisateur appartient à SENEGEL
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  )
  -- Alors il voit tous les projets SENEGEL
  AND organization_id = '550e8400-e29b-41d4-a716-446655440000'
);
```

**Résultat** : ✅ L'équipe SENEGEL voit tous les projets de l'organisation

---

## 🔧 Modifications Frontend

### `services/authService.ts`

**Ligne 97-119** : Assignation automatique de l'organization_id au signup

```typescript
// Déterminer l'organization_id selon le rôle
const internalRoles = ['super_administrator', 'administrator', 'manager', 'supervisor', 'intern'];
let organizationId: string | null = null;

if (internalRoles.includes(data.role || 'student')) {
  organizationId = '550e8400-e29b-41d4-a716-446655440000';  // SENEGEL
} else if (data.role === 'student') {
  organizationId = '11111111-1111-1111-1111-111111111111';  // STUDENTS
}
// null pour les autres utilisateurs externes (isolation totale)

// Créer le profil utilisateur
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    user_id: authData.user.id,
    email: data.email,
    full_name: data.full_name,
    phone_number: data.phone_number,
    role: data.role || 'student',
    organization_id: organizationId
  });
```

---

## 📊 Tableau Récapitulatif

| Rôle | Organisation | Peut Créer des Projets | Voit ses Projets | Voit Autres Projets | Statut |
|------|--------------|------------------------|------------------|---------------------|--------|
| **Super Admin** | SENEGEL | ✅ | ✅ | ✅ (SENEGEL) | 🟢 |
| **Manager** | SENEGEL | ✅ | ✅ | ✅ (SENEGEL) | 🟢 |
| **Supervisor** | SENEGEL | ✅ | ✅ | ✅ (SENEGEL) | 🟢 |
| **Intern** | SENEGEL | ✅ | ✅ | ✅ (SENEGEL) | 🟢 |
| **Student** | STUDENTS | ✅ | ✅ | ❌ | 🟢 |
| **Entrepreneur** | NULL | ✅ | ✅ | ❌ | 🟢 |
| **Employer** | NULL | ✅ | ✅ | ❌ | 🟢 |
| **Etc.** | NULL | ✅ | ✅ | ❌ | 🟢 |

---

## ✅ Validation du Système

### Scénario 1 : Étudiant A crée un projet
1. ✅ Étudiant A crée "Mon Projet Perso"
2. ✅ `organization_id` = STUDENTS
3. ✅ SEUL l'Étudiant A le voit
4. ✅ L'Étudiant B ne le voit PAS
5. ✅ Le Super Admin ne le voit PAS

### Scénario 2 : Entrepreneur crée un projet
1. ✅ Entrepreneur crée "Ma Startup"
2. ✅ `organization_id` = NULL
3. ✅ SEUL l'Entrepreneur le voit
4. ✅ Personne d'autre ne le voit (sauf si assigné)

### Scénario 3 : Super Admin crée un projet
1. ✅ Super Admin crée "Projet Alpha"
2. ✅ `organization_id` = SENEGEL
3. ✅ Tous les utilisateurs SENEGEL le voient
4. ✅ Les étudiants ne le voient PAS
5. ✅ Les entrepreneurs ne le voient PAS

---

## 🔍 État Actuel de la Base de Données

### Profils Utilisateurs

```
Super Admin   → organization_id = SENEGEL
Intern        → organization_id = SENEGEL
Student 1     → organization_id = STUDENTS
Student 2     → organization_id = STUDENTS
Employer      → organization_id = NULL
Entrepreneur  → organization_id = NULL
```

### Politiques RLS Actives

```
✅ projects_select_senegal    (SENEGEL voit tous les projets SENEGEL)
✅ projects_select_students   (Étudiants voient UNIQUEMENT leurs projets)
✅ projects_select_external   (Autres externes voient UNIQUEMENT leurs projets)
✅ projects_insert_all        (Tous peuvent créer)
✅ projects_update_owner      (Seul le propriétaire peut modifier)
✅ projects_delete_owner      (Seul le propriétaire peut supprimer)
```

---

## 📝 Migrations Appliquées

1. ✅ `create_students_organization_and_rls` : Créer organisation STUDENTS + RLS
2. ✅ `fix_students_rls_policy` : Corriger politique étudiants (isolation totale)
3. ✅ `cleanup_duplicate_policies` : Nettoyer politiques obsolètes

---

## 🎯 Résultat Final

✅ **Étudiants** : Isolation totale, voient UNIQUEMENT leurs projets  
✅ **Autres Externes** : Isolation totale, voient UNIQUEMENT leurs projets  
✅ **Équipe SENEGEL** : Collaboration, voient tous les projets SENEGEL  
✅ **Création** : Tous les utilisateurs peuvent créer des projets  
✅ **Sécurité** : Row-Level Security garantit l'isolation automatiquement  

---

## 🔒 Sécurité Garantie

- ✅ **Pas de fuite** entre étudiants
- ✅ **Pas de fuite** entre utilisateurs externes
- ✅ **Collaboration** uniquement au sein de SENEGEL
- ✅ **Politiques granulaires** par type d'utilisateur
- ✅ **Isolation automatique** via RLS

---

## 📚 Références

- **Documentation isolation** : `SOLUTION-ISOLATION-DONNEES.md`
- **Documentation login/signup** : `ADAPTATION-LOGIN-SIGNUP.md`
- **Authentification** : `services/authService.ts`
- **Services** : `services/dataService.ts`

