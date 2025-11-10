# Guide de Déploiement - EcosystIA

Ce guide vous explique comment déployer EcosystIA sur différentes plateformes.

## 📋 Prérequis

- Un compte GitHub (où votre code est hébergé)
- Un compte Supabase pour la base de données
- Un compte sur la plateforme de déploiement choisie (Vercel ou Netlify)

## 🔐 Variables d'Environnement

Avant de déployer, vous devez configurer les variables d'environnement suivantes :

### Variables Requises

```env
VITE_SUPABASE_URL=https://tdwbqgyubigaurnjzbfv.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
VITE_GEMINI_API_KEY=votre_cle_api_gemini
```

### Où trouver ces variables ?

1. **VITE_SUPABASE_URL** : URL de votre projet Supabase (Dashboard > Settings > API)
2. **VITE_SUPABASE_ANON_KEY** : Clé anonyme publique de Supabase (Dashboard > Settings > API)
3. **VITE_GEMINI_API_KEY** : Clé API Google Gemini (Google AI Studio)

## 🚀 Déploiement sur Vercel

### Option 1 : Déploiement depuis GitHub (Recommandé)

1. **Connecter votre repository GitHub**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "New Project"
   - Importez votre repository `EcosystIA`

2. **Configurer le projet**
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (par défaut)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`

3. **Ajouter les variables d'environnement**
   - Cliquez sur "Environment Variables"
   - Ajoutez les variables suivantes :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_GEMINI_API_KEY`

4. **Déployer**
   - Cliquez sur "Deploy"
   - Attendez la fin du déploiement
   - Votre application sera disponible à l'URL fournie par Vercel

### Option 2 : Déploiement via CLI Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter à Vercel
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

## 🌐 Déploiement sur Netlify

### Option 1 : Déploiement depuis GitHub (Recommandé)

1. **Connecter votre repository GitHub**
   - Allez sur [netlify.com](https://netlify.com)
   - Cliquez sur "Add new site" > "Import an existing project"
   - Choisissez votre repository `EcosystIA`

2. **Configurer le projet**
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
   - **Node version** : `20` (configuré dans netlify.toml)

3. **Ajouter les variables d'environnement**
   - Allez dans "Site settings" > "Environment variables"
   - Ajoutez les variables suivantes :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_GEMINI_API_KEY`

4. **Déployer**
   - Cliquez sur "Deploy site"
   - Attendez la fin du déploiement
   - Votre application sera disponible à l'URL fournie par Netlify

### Option 2 : Déploiement via CLI Netlify

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter à Netlify
netlify login

# Déployer
netlify deploy

# Déployer en production
netlify deploy --prod
```

## 🔧 Configuration de la Base de Données Supabase

Assurez-vous que votre base de données Supabase est correctement configurée :

1. **Tables requises**
   - profiles
   - projects
   - objectives
   - time_logs
   - meetings
   - leave_requests
   - invoices
   - expenses
   - documents
   - courses
   - jobs
   - contacts
   - user_module_permissions

2. **Row Level Security (RLS)**
   - Activez RLS sur toutes les tables
   - Configurez les politiques d'accès selon vos besoins

3. **Authentification**
   - Configurez l'authentification email/password dans Supabase
   - Créez un utilisateur super admin

## 📦 Build Locale (Test avant déploiement)

Pour tester le build localement :

```bash
# Installer les dépendances
npm install

# Créer un fichier .env.local avec vos variables d'environnement
echo "VITE_SUPABASE_URL=https://tdwbqgyubigaurnjzbfv.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=votre_cle" >> .env.local
echo "VITE_GEMINI_API_KEY=votre_cle" >> .env.local

# Construire l'application
npm run build

# Prévisualiser le build
npm run preview
```

## 🔄 Déploiement Automatique

Les deux plateformes supportent le déploiement automatique :

- **Chaque push sur `main`** → déploiement en production
- **Chaque pull request** → déploiement de prévisualisation

## 🐛 Dépannage

### Erreur de build

- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez que Node.js version 20 est utilisée
- Consultez les logs de build pour plus de détails

### Problèmes de connexion à Supabase

- Vérifiez que les URLs et clés API sont correctes
- Vérifiez que RLS est correctement configuré
- Consultez les logs de la console du navigateur

### Problèmes avec Gemini API

- Vérifiez que la clé API est valide
- Vérifiez les quotas de l'API

## 📞 Support

Pour toute question ou problème, consultez :
- Documentation Vercel : https://vercel.com/docs
- Documentation Netlify : https://docs.netlify.com
- Documentation Supabase : https://supabase.com/docs

## 🔗 Liens Utiles

- Repository GitHub : https://github.com/Cherif0104/EcosystIA.git
- Supabase Dashboard : https://supabase.com/dashboard
- Google AI Studio : https://makersuite.google.com/app/apikey

