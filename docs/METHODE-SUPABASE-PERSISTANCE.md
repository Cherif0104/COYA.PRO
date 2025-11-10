# Méthode de Persistance Supabase - Guide Réutilisable

## Vue d'ensemble

Cette méthode permet de rendre rapidement n'importe quel module persistant avec Supabase en suivant le même pattern que celui utilisé pour le module **Projets**.

## Architecture Générale

### 1. **ApiHelper** - Service centralisé d'authentification
Le fichier `services/apiHelper.ts` gère automatiquement l'authentification JWT pour tous les appels API.

**Caractéristiques clés :**
- Récupère automatiquement le token de session Supabase
- Inclut le token dans l'en-tête `Authorization`
- Permet aux politiques RLS de fonctionner correctement

```typescript
// Headers avec authentification automatique
private static async getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || this.apiKey;
  
  return {
    'apikey': this.apiKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}
```

### 2. **DataService** - Service de données Supabase
Le fichier `services/dataService.ts` contient les méthodes CRUD pour chaque entité.

**Pattern à suivre :**
```typescript
static async createEntity(entity: Partial<Entity>) {
  // Formatage des données si nécessaire
  // Récupération de l'utilisateur actuel pour owner_id
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  return await ApiHelper.post('table_name', {
    // Mapping des champs
    name: entity.name || '',
    owner_id: currentUser?.id || null,
    // ... autres champs
  });
}

static async getEntities() {
  return await ApiHelper.get('table_name', { 
    select: '*', 
    order: 'created_at.desc' 
  });
}

static async updateEntity(id: string, updates: Partial<Entity>) {
  return await ApiHelper.put('table_name', id, {
    // Mapping des champs
    updated_at: new Date().toISOString()
  });
}

static async deleteEntity(id: string) {
  return await ApiHelper.delete('table_name', id);
}
```

### 3. **DataAdapter** - Couche d'adaptation
Le fichier `services/dataAdapter.ts` convertit les données entre le format Supabase et le format application.

**Pattern à suivre :**
```typescript
static async createEntity(entity: Partial<Entity>): Promise<Entity | null> {
  if (this.useSupabase) {
    try {
      const { data, error } = await DataService.createEntity(entity);
      if (error) throw error;
      if (data) {
        // Conversion des données Supabase vers format application
        return {
          id: data.id,
          name: data.name,
          // ... autres champs
          createdAt: data.created_at || new Date().toISOString(),
        };
      }
      return null;
    } catch (error) {
      console.warn('Erreur Supabase création entité:', error);
      return null;
    }
  }
  // Fallback mock si nécessaire (optionnel)
}
```

## Étapes pour Rendre un Module Persistant

### Étape 1 : Créer/Mettre à jour la table Supabase

```sql
-- Exemple pour une table "courses"
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY courses_insert_all_authenticated
ON public.courses FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY courses_select_user_courses
ON public.courses FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR owner_id = auth.uid()
  OR auth.uid()::text = ANY(team_members)
);

CREATE POLICY courses_update_user_courses
ON public.courses FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR organization_id IS NULL);

CREATE POLICY courses_delete_owner_only
ON public.courses FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR organization_id IS NULL);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_courses_updated_at_trigger
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();
```

### Étape 2 : Ajouter les méthodes dans DataService

```typescript
// Dans services/dataService.ts

// GET
static async getCourses() {
  return await ApiHelper.get('courses', { 
    select: '*', 
    order: 'created_at.desc' 
  });
}

// CREATE
static async createCourse(course: Partial<Course>) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString();
  };

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  return await ApiHelper.post('courses', {
    name: course.title || '',
    description: course.description || '',
    status: course.status || 'active',
    start_date: formatDate(course.startDate),
    end_date: formatDate(course.endDate),
    owner_id: currentUser?.id || null,
  });
}

// UPDATE
static async updateCourse(id: string, updates: Partial<Course>) {
  return await ApiHelper.put('courses', id, {
    name: updates.title,
    description: updates.description,
    status: updates.status,
    updated_at: new Date().toISOString()
  });
}

// DELETE
static async deleteCourse(id: string) {
  return await ApiHelper.delete('courses', id);
}
```

### Étape 3 : Ajouter les méthodes dans DataAdapter

```typescript
// Dans services/dataAdapter.ts

static async getCourses(): Promise<Course[]> {
  if (this.useSupabase) {
    try {
      const { data, error } = await DataService.getCourses();
      if (error) throw error;
      
      return (data || []).map(course => ({
        id: course.id,
        title: course.name,
        description: course.description || '',
        status: course.status || 'not_started',
        startDate: course.start_date,
        endDate: course.end_date,
        createdAt: course.created_at || new Date().toISOString(),
        updatedAt: course.updated_at || new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Erreur Supabase getCourses:', error);
      return [];
    }
  }
  return [];
}

static async createCourse(course: Partial<Course>): Promise<Course | null> {
  if (this.useSupabase) {
    try {
      const { data, error } = await DataService.createCourse(course);
      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          title: data.name,
          description: data.description || '',
          status: data.status || 'not_started',
          startDate: data.start_date,
          endDate: data.end_date,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      console.warn('Erreur Supabase création cours:', error);
      return null;
    }
  }
  return null;
}
```

### Étape 4 : Utiliser dans App.tsx ou le composant

```typescript
// Charger les données
useEffect(() => {
  if (user) {
    const loadData = async () => {
      const coursesData = await DataAdapter.getCourses();
      setCourses(coursesData);
    };
    loadData();
  }
}, [user]);

// Créer une entité
const handleAddCourse = async (courseData: Omit<Course, 'id'>) => {
  try {
    const newCourse = await DataAdapter.createCourse(courseData);
    if (newCourse) {
      setCourses(prev => [newCourse, ...prev]);
    }
  } catch (error) {
    console.error('Erreur création cours:', error);
    alert('Erreur lors de la création du cours.');
  }
};
```

## Points Importants

### Format des Dates

Toujours formater les dates pour les champs `input[type="date"]` :

```typescript
// Fonction utilitaire réutilisable
const formatDateForInput = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString; // Déjà au bon format
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Utilisation dans les formulaires
<input 
  type="date" 
  value={formatDateForInput(project.startDate)} 
  onChange={(e) => handleChange('startDate', e.target.value)} 
/>
```

### Politiques RLS Recommandées

Pour la plupart des modules, utilisez ces politiques :

1. **INSERT** : Tous les utilisateurs authentifiés peuvent créer
2. **SELECT** : Voir leurs propres entités ou celles sans organisation
3. **UPDATE** : Modifier leurs propres entités
4. **DELETE** : Supprimer uniquement leurs propres entités

### Vérification de Fonctionnement

Après implémentation, vérifier :
- ✅ Création d'une entité fonctionne
- ✅ Après refresh, les données persistent
- ✅ Modification fonctionne
- ✅ Suppression fonctionne
- ✅ Les dates s'affichent correctement dans les formulaires
- ✅ Pas d'erreurs RLS dans la console

## Avantages de cette Méthode

1. **Rapidité** : Pattern réutilisable pour tous les modules
2. **Sécurité** : RLS intégré automatiquement via ApiHelper
3. **Cohérence** : Même structure pour tous les modules
4. **Maintenabilité** : Code centralisé et clair

## Modules Déjà Implémentés

- ✅ **Projets** : Complètement fonctionnel avec CRUD complet
- ✅ **Authentification** : Login/Signup avec Supabase
- ✅ **Dashboard** : Métriques et insights intelligents

## Modules à Implémenter

- ⏳ Courses
- ⏳ Jobs
- ⏳ Goals/OKRs
- ⏳ Time Tracking
- ⏳ Leave Management
- ⏳ Finance (Invoices, Expenses)
- ⏳ Knowledge Base
- ⏳ CRM/Sales
- ⏳ Analytics
- ⏳ User Management
- ... et autres

## Support

Pour toute question ou problème, référez-vous à l'implémentation du module **Projets** comme exemple de référence.


