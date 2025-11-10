# Guide de Style pour les Modules EcosystIA

Ce guide définit les standards de design et de structure pour tous les modules de l'application EcosystIA. Il sert de référence pour maintenir une cohérence visuelle et fonctionnelle à travers toute l'application.

## Vue d'ensemble

Tous les modules doivent suivre le même pattern de design moderne et professionnel, inspiré des meilleures pratiques UX/UI et du style Power BI pour les visualisations de données.

---

## Structure Standard d'un Module

### 1. Container Principal

```tsx
<div className="min-h-screen bg-gray-50">
    {/* Contenu du module */}
</div>
```

### 2. Header avec Gradient

**Obligatoire** pour tous les modules. Le header doit inclure :
- Un gradient de couleur (emerald-600 vers blue-600 par défaut)
- Le titre du module
- Une description courte
- Les actions principales (boutons)

```tsx
<div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{t('module_name')}</h1>
                <p className="text-emerald-50 text-sm">
                    Description courte du module
                </p>
            </div>
            <div className="flex items-center gap-4">
                {/* Actions principales */}
            </div>
        </div>
    </div>
</div>
```

### 3. Section Métriques (Style Power BI)

**Recommandé** pour les modules avec des données quantifiables. Affichage en grille de 2-4 cartes.

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Section Métriques - Style Power BI */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Carte Métrique */}
        <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Label</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-4">
                    <i className="fas fa-icon-name text-blue-600 text-2xl"></i>
                </div>
            </div>
        </div>
    </div>
</div>
```

**Couleurs disponibles pour les bordures gauches :**
- `border-blue-500` (bleu)
- `border-emerald-500` (vert)
- `border-purple-500` (violet)
- `border-orange-500` (orange)
- `border-red-500` (rouge)
- `border-yellow-500` (jaune)

### 4. Liste/Grid de Contenu

**Obligatoire** pour afficher les éléments principaux du module.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map(item => (
        <div 
            key={item.id} 
            className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
        >
            {/* Header de la carte avec gradient */}
            <div className={`bg-gradient-to-r ${
                // Gradient selon le statut ou le type
                status === 'completed' ? 'from-emerald-500 to-teal-500' :
                status === 'active' ? 'from-blue-500 to-cyan-500' :
                'from-gray-400 to-gray-500'
            } p-4 text-white`}>
                {/* Contenu du header */}
            </div>
            
            {/* Corps de la carte */}
            <div className="p-6">
                {/* Contenu principal */}
            </div>
        </div>
    ))}
</div>
```

### 5. État Vide (Empty State)

**Obligatoire** pour tous les modules.

```tsx
<div className="text-center py-20 px-4 bg-white rounded-xl shadow-lg mt-8">
    <div className="mb-6">
        <i className="fas fa-icon-name fa-5x text-gray-300"></i>
    </div>
    <h3 className="text-2xl font-semibold text-gray-800 mb-2">Titre de l'état vide</h3>
    <p className="text-gray-600 mb-6">Description de l'action à entreprendre</p>
    {canManage && (
        <button 
            onClick={handleCreate}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-md hover:shadow-lg"
        >
            <i className="fas fa-plus mr-2"></i>
            Action principale
        </button>
    )}
</div>
```

---

## Composants Réutilisables

### Carte de Métrique

```tsx
interface MetricCardProps {
    label: string;
    value: string | number;
    icon: string;
    borderColor: 'blue' | 'emerald' | 'purple' | 'orange' | 'red' | 'yellow';
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, borderColor }) => {
    const colorClasses = {
        blue: 'border-blue-500 bg-blue-100 text-blue-600',
        emerald: 'border-emerald-500 bg-emerald-100 text-emerald-600',
        purple: 'border-purple-500 bg-purple-100 text-purple-600',
        orange: 'border-orange-500 bg-orange-100 text-orange-600',
        red: 'border-red-500 bg-red-100 text-red-600',
        yellow: 'border-yellow-500 bg-yellow-100 text-yellow-600',
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-l-4 ${colorClasses[borderColor].split(' ')[0]} p-6 hover:shadow-xl transition-shadow`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`rounded-full p-4 ${colorClasses[borderColor].split(' ')[1]}`}>
                    <i className={`fas ${icon} ${colorClasses[borderColor].split(' ')[2]} text-2xl`}></i>
                </div>
            </div>
        </div>
    );
};
```

---

## Palette de Couleurs

### Gradients Principaux

- **Primaire (Actions principales)** : `from-emerald-600 to-blue-600`
- **Succès (Terminé)** : `from-emerald-500 to-teal-500`
- **Actif (En cours)** : `from-blue-500 to-cyan-500`
- **Inactif** : `from-gray-400 to-gray-500`
- **Alerte** : `from-orange-500 to-red-500`

### Couleurs de Texte

- **Titre principal** : `text-gray-900` ou `text-white` (sur gradient)
- **Sous-titre** : `text-gray-600`
- **Texte secondaire** : `text-gray-500`
- **Texte sur gradient** : `text-emerald-50` ou `text-white`

### Couleurs de Boutons

- **Action principale** : `bg-emerald-600 hover:bg-emerald-700 text-white`
- **Action secondaire** : `bg-white text-emerald-600 hover:bg-emerald-50`
- **Modifier** : `text-blue-600 hover:text-blue-700 hover:bg-blue-50`
- **Supprimer** : `text-red-600 hover:text-red-700 hover:bg-red-50`
- **Voir détails** : `text-emerald-600 hover:text-emerald-700`

---

## Typographie

### Titres

- **H1 (Module)** : `text-4xl font-bold`
- **H2 (Section)** : `text-2xl font-semibold`
- **H3 (Carte)** : `text-xl font-bold`
- **H4 (Sous-section)** : `text-lg font-semibold`

### Textes

- **Corps principal** : `text-sm` ou `text-base`
- **Petit texte** : `text-xs`
- **Labels** : `text-sm font-medium`

---

## Espacements

### Padding

- **Container principal** : `px-4 sm:px-6 lg:px-8 py-8`
- **Header** : `py-8`
- **Cartes** : `p-6`
- **Boutons** : `px-6 py-3` (grand) ou `px-4 py-2` (moyen)

### Marges

- **Sections** : `mb-8`
- **Cartes** : `gap-6`
- **Éléments** : `space-y-2` ou `space-y-4`

---

## Ombres et Bordures

### Ombres

- **Cartes** : `shadow-lg hover:shadow-xl`
- **Boutons** : `shadow-md hover:shadow-lg`
- **Header** : `shadow-lg`

### Bordures

- **Cartes** : `border border-gray-200`
- **Bordures colorées** : `border-l-4 border-{color}-500`
- **Bordures séparatrices** : `border-t border-gray-100`

### Rayons

- **Cartes** : `rounded-xl`
- **Boutons** : `rounded-lg`
- **Icônes** : `rounded-full`

---

## Interactions et Animations

### Transitions

- **Cartes** : `transition-all duration-300`
- **Ombres** : `transition-shadow`
- **Couleurs** : `transition-colors`

### États de Hover

- **Cartes** : `hover:shadow-xl`
- **Boutons** : `hover:bg-{color}-700` ou `hover:bg-{color}-50`
- **Icônes** : `hover:text-{color}-700`

---

## Icônes FontAwesome

### Standardisation

Utiliser FontAwesome pour toutes les icônes. Voici les icônes recommandées :

- **Projets** : `fa-folder-open`, `fa-project-diagram`
- **Tâches** : `fa-tasks`, `fa-check-circle`
- **Utilisateurs** : `fa-users`, `fa-user`
- **Calendrier** : `fa-calendar-alt`, `fa-clock`
- **Actions** : `fa-plus`, `fa-edit`, `fa-trash`, `fa-eye`
- **Statuts** : `fa-play-circle`, `fa-check`, `fa-times`
- **Métriques** : `fa-chart-bar`, `fa-chart-line`, `fa-chart-pie`

---

## Responsive Design

### Breakpoints Tailwind

- **Mobile** : `< 768px` (pas de préfixe)
- **Tablet** : `md:` (≥ 768px)
- **Desktop** : `lg:` (≥ 1024px)

### Grilles Responsives

```tsx
// Métriques : 1 colonne mobile, 2 tablet, 4 desktop
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4

// Liste : 1 colonne mobile, 2 tablet, 3 desktop
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

---

## Gestion des États

### Loading States

```tsx
{isLoading && (
    <div className="flex items-center text-white">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        <span className="text-sm">Chargement...</span>
    </div>
)}
```

### États Vides

Toujours inclure un état vide attrayant avec un appel à l'action.

### États d'Erreur

```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-center">
        <i className="fas fa-exclamation-circle text-red-600 mr-2"></i>
        <span className="text-red-800">Message d'erreur</span>
    </div>
</div>
```

---

## Accessibilité

### Contraste

- Respecter un ratio de contraste minimum de 4.5:1 pour le texte normal
- 3:1 pour les grands textes

### Navigation au Clavier

- Tous les éléments interactifs doivent être accessibles au clavier
- Utiliser `tabindex` si nécessaire

### ARIA Labels

```tsx
<button
    aria-label="Description de l'action"
    title="Description de l'action"
>
    <i className="fas fa-icon"></i>
</button>
```

---

## Exemple Complet

Voir `components/Projects.tsx` pour un exemple complet d'implémentation de ce guide de style.

---

## Checklist pour Nouveaux Modules

- [ ] Header avec gradient appliqué
- [ ] Section métriques (si applicable)
- [ ] Liste/Grid avec cartes modernes
- [ ] État vide avec appel à l'action
- [ ] Transitions et animations appropriées
- [ ] Design responsive (mobile, tablet, desktop)
- [ ] États de chargement
- [ ] Gestion des erreurs
- [ ] Accessibilité (contraste, navigation clavier)
- [ ] Cohérence avec la palette de couleurs
- [ ] Utilisation des icônes FontAwesome standardisées

---

## Notes Importantes

1. **Cohérence** : Tous les modules doivent suivre ce guide pour maintenir une expérience utilisateur cohérente.
2. **Flexibilité** : Ce guide est un standard, mais peut être adapté selon les besoins spécifiques d'un module.
3. **Évolution** : Ce guide sera mis à jour au fur et à mesure des améliorations de l'application.

---

**Dernière mise à jour** : 2025-01-26
**Version** : 1.0


