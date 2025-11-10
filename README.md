# 🌍 EcosystIA - Plateforme de Gestion Écosystémique

<div align="center">
<img width="1200" height="475" alt="EcosystIA Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 📖 Description

EcosystIA est une plateforme complète de gestion écosystémique offrant une suite d'outils pour la gestion de projets, la gestion du temps, les demandes de congés, les finances, les cours, les offres d'emploi, le CRM, et bien plus. La plateforme est construite avec React, TypeScript, Vite, et Supabase pour une expérience moderne et sécurisée.

## ✨ Fonctionnalités

### 🔐 Authentification et Gestion des Utilisateurs
- Authentification sécurisée via Supabase
- Gestion des rôles et permissions
- Modules d'accès personnalisables
- Activation/désactivation d'utilisateurs

### 📊 Modules Principaux
- **Dashboard** : Vue d'ensemble des activités
- **Projets** : Gestion complète de projets
- **Goals (OKRs)** : Objectifs et résultats clés
- **Time Tracking** : Suivi du temps de travail
- **Leave Management** : Gestion des demandes de congés
- **Finance** : Factures, dépenses, budgets
- **Knowledge Base** : Base de connaissances
- **Courses** : Modules de formation
- **Jobs** : Offres d'emploi
- **CRM & Sales** : Gestion client et ventes
- **Analytics** : Statistiques et analyses

### 🤖 IA Intégrée
- **AI Coach** : Assistant intelligent pour le coaching
- **Gen AI Lab** : Laboratoire d'IA pour expérimentations

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+
- npm ou yarn
- Un compte Supabase
- Une clé API Gemini (optionnel, pour les fonctionnalités IA)

### Installation Locale

1. **Cloner le repository**
   ```bash
   git clone https://github.com/Cherif0104/EcosystIA.git
   cd EcosystIA
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

### Configurer les variables d'environnement
   
   Créez un fichier `.env.local` à la racine du projet en vous basant sur le fichier `.env.example`. Ce dernier documente toutes les clés nécessaires :
   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=

   VITE_GEMINI_API_KEY=
   VITE_GEMINI_MODEL=gemini-1.5-flash
   VITE_GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta

   VITE_GROQ_API_KEY=
   VITE_GROQ_MODEL=llama-3.3-70b-versatile

   VITE_IMAGE_API_PROVIDER=replicate
   VITE_REPLICATE_API_TOKEN=
   VITE_STABILITY_AI_API_KEY=
   ```
   **Note sur la génération d'images** : Cette fonctionnalité nécessite une clé API pour `Replicate` ou `Stability AI`. Si aucune clé n'est fournie, le système générera une image placeholder.

### Migrations Supabase nécessaires

Certaines fonctionnalités (gestion avancée des cours, validation séquentielle, ressources attachées) nécessitent des colonnes supplémentaires côté Supabase. Après avoir synchronisé le code, exécutez le script suivant dans votre projet Supabase :

```
scripts/20251108_add_course_extensions.sql
```

Depuis le dashboard Supabase : SQL Editor → coller le contenu → Run. Les clauses `IF NOT EXISTS` garantissent que le script reste idempotent.

4. **Lancer l'application**
   ```bash
   npm run dev
   ```

5. **Ouvrir dans le navigateur**
   ```
   http://localhost:5173
   ```

## 📦 Build pour Production

```bash
npm run build
npm run preview
```

## 🌐 Déploiement

### Déploiement sur Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Cherif0104/EcosystIA.git)

1. Cliquez sur le bouton ci-dessus ou importez le projet sur [Vercel](https://vercel.com)
2. Ajoutez les variables d'environnement requises
3. Déployez !

### Déploiement sur Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Cherif0104/EcosystIA.git)

1. Cliquez sur le bouton ci-dessus ou importez le projet sur [Netlify](https://netlify.com)
2. Configurez les variables d'environnement
3. Déployez !

### Documentation Complète

Pour plus de détails sur le déploiement, consultez [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🛠️ Technologies Utilisées

- **Frontend** : React 18, TypeScript
- **Build Tool** : Vite
- **Styling** : Tailwind CSS
- **Backend** : Supabase (PostgreSQL, Auth, Realtime)
- **IA** : Google Gemini Pro API
- **Icons** : Font Awesome

## 📁 Structure du Projet

```
EcosystIA/
├── components/          # Composants React
│   ├── common/         # Composants communs
│   ├── icons/          # Icônes personnalisées
│   └── ...             # Autres composants
├── contexts/           # Contextes React (Auth, Localization)
├── services/           # Services (API, Supabase, Gemini)
├── constants/          # Constantes et données
├── types.ts            # Types TypeScript
├── vite.config.ts      # Configuration Vite
└── package.json        # Dépendances et scripts
```

## 🔐 Sécurité

- Authentification sécurisée via Supabase
- Row Level Security (RLS) sur toutes les tables
- Isolation multi‑organisation
  - Rôles internes (SENEGEL): super_administrator, administrator, manager, supervisor, intern
  - Rôles externes (incl. STUDENTS): student, entrepreneur, employer, trainer, coach, mentor, facilitator, implementer, funder, publisher, editor, producer, artist, alumni
  - Les EXTERNES (incl. STUDENTS) n'ont pas accès au Management Panel et ne voient que leurs propres entités
- Validation des données côté client et serveur
- Gestion sécurisée des clés API

## 📝 Scripts Disponibles

- `npm run dev` : Lancer le serveur de développement
- `npm run build` : Construire pour la production
- `npm run preview` : Prévisualiser le build de production
- `npm run lint` : Lancer le linter (si configuré)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou soumettre une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

## 🔗 Liens Utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Netlify](https://docs.netlify.com)
- [Google Gemini API](https://ai.google.dev)

## 👨‍💻 Auteur

**Cherif** - [GitHub](https://github.com/Cherif0104)

## 🙏 Remerciements

- Supabase pour la plateforme backend
- Vercel et Netlify pour l'hébergement
- Google pour l'API Gemini
- La communauté open-source
