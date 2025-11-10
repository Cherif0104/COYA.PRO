# Modèle de Développement pour les Modules EcosystIA

> **Basé sur le module Projets validé et verrouillé** ✅

Ce document définit le modèle de développement standardisé pour tous les modules de l'application EcosystIA, en respectant les principes du MVP client.

---

## 📋 Table des Matières

1. [Principe MVP Client](#principe-mvp-client)
2. [Architecture du Module](#architecture-du-module)
3. [Structure des Fichiers](#structure-des-fichiers)
4. [Patterns de Code](#patterns-de-code)
5. [Interface Utilisateur](#interface-utilisateur)
6. [Persistance Supabase](#persistance-supabase)
7. [Checklist de Développement](#checklist-de-développement)

---

## 🎯 Principe MVP Client

### Définition
Le MVP (Minimum Viable Product) doit inclure uniquement les fonctionnalités essentielles pour démontrer la valeur du produit aux utilisateurs.

### Règles à Respecter
- ✅ **Fonctionnalités essentielles uniquement** : Pas de features complexes au départ
- ✅ **Persistance réelle** : Toutes les données doivent être persistées dans Supabase
- ✅ **Authentification Supabase** : Pas de mock, uniquement Supabase Auth
- ✅ **RLS (Row Level Security)** : Toutes les tables doivent avoir des politiques RLS
- ✅ **Validation module par module** : Un module est verrouillé après validation
- ✅ **Pas de modifications sur modules verrouillés** : Un module validé ne doit plus être modifié

---

## 🏗️ Architecture du Module

### Structure Standardisée

Chaque module doit suivre cette architecture :

```
modules/
├── [ModuleName]/
│   ├── components/
│   │   ├── [ModuleName]List.tsx        # Liste principale avec recherche/filtres/vues
│   │   ├── [ModuleName]DetailPage.tsx  # Page de détails (full-screen)
│   │   ├── [ModuleName]CreatePage.tsx  # Page de création/modification (full-screen)
│   │   └── [ModuleName]Card.tsx        # Composant de carte (optionnel)
│   ├── services/
│   │   ├── [moduleName]Service.ts      # Service Supabase spécifique
│   │   └── [moduleName]Adapter.ts      # Adapter pour conversion données
│   └── types/
│       └── [moduleName]Types.ts        # Types TypeScript spécifiques
```

### Exemple : Module Projets (Référence Validée)

```
components/
├── Projects.tsx              ✅ Liste principale
├── ProjectDetailPage.tsx     ✅ Détails avec onglets
└── ProjectCreatePage.tsx     ✅ Création/Modification

services/
├── dataService.ts            ✅ Methods: createProject, updateProject, deleteProject
└── dataAdapter.ts            ✅ Methods: createProject, updateProject, getProjects
```

---

## 📁 Structure des Fichiers

### 1. Composant Principal (Liste)

**Fichier** : `components/[ModuleName].tsx`

**Structure obligatoire** :

```typescript
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { [Type] } from '../types';

interface [ModuleName]Props {
    [items]: [Type][];
    users: User[];
    onUpdate[Item]: (item: [Type]) => Promise<void>;
    onAdd[Item]: (item: Omit<[Type], 'id'>) => Promise<void>;
    onDelete[Item]: (id: number) => Promise<void>;
    isLoading?: boolean;
    loadingOperation?: string | null;
}

const [ModuleName]: React.FC<[ModuleName]Props> = ({
    [items],
    users,
    onUpdate[Item],
    onAdd[Item],
    onDelete[Item],
    isLoading = false,
    loadingOperation = null
}) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    
    // États obligatoires
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
    const [editing[Item], setEditing[Item]] = useState<[Type] | null>(null);
    const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);
    
    // Filtrage et tri
    const filtered[Items] = useMemo(() => {
        // Logique de filtrage et tri
    }, [[items], searchQuery, statusFilter, sortBy, sortOrder]);
    
    // Calcul métriques
    const total[Items] = useMemo(() => {
        // Calcul des métriques globales
    }, [[items]]);
    
    // Gestion CRUD
    const handleSave[Item] = async (itemData: [Type] | Omit<[Type], 'id'>) => {
        const isEditMode = editing[Item] !== null;
        if (isEditMode) {
            await onUpdate[Item]({ ...editing[Item]!, ...itemData, id: editing[Item]!.id });
        } else {
            await onAdd[Item](itemData as Omit<[Type], 'id'>);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header avec gradient */}
            {/* Métriques Power BI */}
            {/* Barre recherche/filtres/vues */}
            {/* Liste avec 3 modes d'affichage */}
            {/* Pages modales */}
        </div>
    );
};
```

**Éléments obligatoires** :
- ✅ Header avec gradient
- ✅ Section métriques (4 cartes minimum)
- ✅ Barre de recherche avec icône
- ✅ Filtres (statut, tri, ordre)
- ✅ Sélecteur de vue (grid/list/compact)
- ✅ 3 modes d'affichage implémentés
- ✅ État vide avec message contextuel
- ✅ Compteur de résultats

### 2. Page de Détails

**Fichier** : `components/[ModuleName]DetailPage.tsx`

**Structure obligatoire** :

```typescript
const [ModuleName]DetailPage: React.FC<[ModuleName]DetailPageProps> = ({
    [item],
    onClose,
    onUpdate[Item],
    onDelete[Item]
}) => {
    return (
        <>
            <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
                {/* Header avec gradient et actions */}
                {/* Section métriques (4 cartes grandes) */}
                {/* Contenu principal avec onglets */}
                {/* Sidebar informations */}
            </div>
            {/* Modals */}
        </>
    );
};
```

**Éléments obligatoires** :
- ✅ Header gradient avec informations principales
- ✅ 4 cartes métriques (style Power BI)
- ✅ Navigation par onglets (si applicable)
- ✅ Sidebar avec informations et actions rapides
- ✅ Boutons de suppression sur chaque élément
- ✅ Modals de confirmation

### 3. Page de Création/Modification

**Fichier** : `components/[ModuleName]CreatePage.tsx`

**Structure obligatoire** :

```typescript
const [ModuleName]CreatePage: React.FC<[ModuleName]CreatePageProps> = ({
    onClose,
    onSave,
    users,
    editing[Item] = null
}) => {
    const [formData, setFormData] = useState({...});
    
    useEffect(() => {
        if (editing[Item]) {
            setFormData({...editing[Item]});
        }
    }, [editing[Item]]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const itemToSave = editing[Item] 
            ? { ...formData, id: editing[Item].id }
            : formData;
        await onSave(itemToSave);
    };
    
    return (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
            {/* Header sticky */}
            {/* Formulaire */}
        </div>
    );
};
```

**Éléments obligatoires** :
- ✅ Header sticky avec bouton retour
- ✅ Formulaire avec validation
- ✅ Gestion mode édition vs création
- ✅ Inclusion de l'ID en mode édition
- ✅ Gestion des erreurs

---

## 💻 Patterns de Code

### 1. Gestion des États

```typescript
// États de recherche et filtres (OBLIGATOIRE)
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('all');
const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
```

### 2. Filtrage et Tri

```typescript
const filtered[Items] = useMemo(() => {
    let filtered = [items].filter(item => {
        // Filtre recherche
        const matchesSearch = searchQuery === '' || 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtre statut
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Tri
    filtered.sort((a, b) => {
        let compareValue = 0;
        switch (sortBy) {
            case 'title':
                compareValue = a.title.localeCompare(b.title);
                break;
            case 'status':
                compareValue = a.status.localeCompare(b.status);
                break;
            case 'date':
            default:
                compareValue = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                break;
        }
        return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
}, [[items], searchQuery, statusFilter, sortBy, sortOrder]);
```

### 3. Gestion CRUD

```typescript
// CRÉATION
const handleAdd[Item] = async (itemData: Omit<[Type], 'id'>) => {
    await DataAdapter.create[Item](itemData);
    // Recharger les données
};

// MODIFICATION
const handleUpdate[Item] = async (item: [Type]) => {
    const isEditMode = editing[Item] !== null;
    if (!isEditMode || !item.id) {
        console.error('Erreur: ID manquant pour la mise à jour');
        return;
    }
    await DataAdapter.update[Item](item);
    // Recharger les données
};

// SUPPRESSION
const handleDelete[Item] = async (id: number) => {
    await DataAdapter.delete[Item](id);
    // Recharger les données
};
```

### 4. Prévention de la Duplication

**Pattern obligatoire** pour éviter les duplications :

```typescript
const handleSave[Item] = async (itemData: [Type] | Omit<[Type], 'id'>) => {
    const isEditMode = editing[Item] !== null || ('id' in itemData && itemData.id !== undefined);
    
    if (isEditMode) {
        const itemId = editing[Item]?.id || (itemData as [Type]).id;
        if (!itemId) {
            alert('Erreur: Impossible de mettre à jour. ID manquant.');
            return;
        }
        const itemToUpdate: [Type] = {
            ...editing[Item]!,
            ...itemData,
            id: itemId
        };
        await onUpdate[Item](itemToUpdate);
    } else {
        await onAdd[Item](itemData as Omit<[Type], 'id'>);
    }
};
```

---

## 🎨 Interface Utilisateur

### 1. Header avec Gradient

```tsx
<div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{t('[module_name]')}</h1>
                <p className="text-emerald-50 text-sm">
                    Description courte du module
                </p>
            </div>
            <div className="flex items-center gap-4">
                {/* Actions principales */}
                <button className="bg-white text-emerald-600 px-6 py-3 rounded-lg">
                    <i className="fas fa-plus mr-2"></i>
                    Créer
                </button>
            </div>
        </div>
    </div>
</div>
```

### 2. Métriques Power BI

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 p-6">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Label</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
                <i className="fas fa-icon text-blue-600 text-2xl"></i>
            </div>
        </div>
    </div>
    {/* Répéter pour 4 cartes */}
</div>
```

### 3. Barre de Recherche et Filtres

```tsx
<div className="bg-white rounded-xl shadow-lg p-6 mb-8">
    <div className="flex flex-col lg:flex-row gap-4">
        {/* Recherche */}
        <div className="flex-1">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            </div>
        </div>
        
        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={...}>
                <option value="all">Tous les statuts</option>
                {/* Options */}
            </select>
            {/* Autres filtres */}
        </div>
    </div>
    
    {/* Sélecteur de vue */}
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
            {filtered[Items].length} résultat(s)
        </div>
        <div className="flex items-center gap-2">
            {/* Boutons de vue */}
        </div>
    </div>
</div>
```

### 4. Trois Modes d'Affichage

**Vue Grille** : Cartes avec header gradient
**Vue Liste** : Liste verticale avec barre de couleur
**Vue Compacte** : Tableau format table

Voir `components/Projects.tsx` pour les implémentations complètes.

---

## 💾 Persistance Supabase

### 1. Service Supabase

**Fichier** : `services/dataService.ts`

```typescript
static async create[Item](item: Partial<[Type]>) {
    return await ApiHelper.post('[items]', {
        // Mapping des champs
        name: item.title,
        description: item.description,
        status: item.status,
        // ... autres champs
    });
}

static async update[Item](id: string, updates: Partial<[Type]>) {
    return await ApiHelper.put('[items]', id, {
        // Mapping des champs
        name: updates.title,
        description: updates.description,
        // ... autres champs
        updated_at: new Date().toISOString()
    });
}

static async delete[Item](id: string) {
    return await ApiHelper.delete('[items]', id);
}
```

### 2. Adapter

**Fichier** : `services/dataAdapter.ts`

```typescript
static async create[Item](item: Partial<[Type]>): Promise<[Type] | null> {
    if (this.useSupabase) {
        const result = await DataService.create[Item](item);
        if (result.error) return null;
        // Convertir depuis Supabase vers Type
        return this.mapSupabaseTo[Type](result.data);
    }
}

static async update[Item](item: [Type]): Promise<boolean> {
    if (this.useSupabase) {
        const result = await DataService.update[Item](item.id.toString(), item);
        return !result.error;
    }
}
```

### 3. RLS Policies

**Obligatoire** : Toutes les tables doivent avoir des politiques RLS :

```sql
-- Lecture : Utilisateurs peuvent voir leurs propres items ou ceux de leur équipe
CREATE POLICY "[items]_select_policy" ON "[items]"
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        owner_id IN (SELECT user_id FROM team_members WHERE project_id = id)
    );

-- Insertion : Utilisateurs authentifiés peuvent créer
CREATE POLICY "[items]_insert_policy" ON "[items]"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour : Propriétaire ou admin
CREATE POLICY "[items]_update_policy" ON "[items]"
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('administrator', 'super_administrator'))
    );

-- Suppression : Propriétaire ou admin
CREATE POLICY "[items]_delete_policy" ON "[items]"
    FOR DELETE USING (
        auth.uid() = owner_id OR 
        auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('administrator', 'super_administrator'))
    );
```

---

## ✅ Checklist de Développement

### Phase 1 : Préparation
- [ ] Créer la table Supabase avec RLS policies
- [ ] Définir les types TypeScript
- [ ] Créer les méthodes dans `dataService.ts`
- [ ] Créer les méthodes dans `dataAdapter.ts`

### Phase 2 : Composants
- [ ] Créer le composant principal (Liste)
- [ ] Créer la page de détails
- [ ] Créer la page de création/modification
- [ ] Implémenter les 3 modes d'affichage

### Phase 3 : Fonctionnalités
- [ ] Recherche en temps réel
- [ ] Filtres (statut, tri, ordre)
- [ ] CRUD complet (Create, Read, Update, Delete)
- [ ] Validation des formulaires
- [ ] Gestion des erreurs

### Phase 4 : Interface
- [ ] Header avec gradient
- [ ] Métriques Power BI (4 cartes minimum)
- [ ] Barre de recherche avec icône
- [ ] Filtres visuels
- [ ] Sélecteur de vue
- [ ] État vide contextuel
- [ ] Compteur de résultats

### Phase 5 : Persistance
- [ ] Toutes les données persistent dans Supabase
- [ ] RLS policies testées
- [ ] Pas de duplication lors des modifications
- [ ] Statuts synchronisés entre formulaire et filtres

### Phase 6 : Validation
- [ ] Tests fonctionnels complets
- [ ] Validation avec le client
- [ ] Module verrouillé après validation
- [ ] Documentation créée

---

## 🔒 Module Verrouillé

### Module Projets ✅ VALIDÉ ET VERROUILLÉ

**Date de validation** : 2025-01-26
**Statut** : ✅ Production
**Autorisation de modification** : ❌ AUCUNE

**Note** : Ce module sert de référence pour tous les autres modules. Ne pas modifier sans autorisation explicite.

---

## 📚 Références

- **Guide de Style** : `docs/GUIDE-STYLE-MODULES.md`
- **Module Projets** : `components/Projects.tsx` (Référence)
- **Méthode Supabase** : `docs/METHODE-SUPABASE-PERSISTANCE.md`

---

**Dernière mise à jour** : 2025-01-26
**Version** : 1.0


