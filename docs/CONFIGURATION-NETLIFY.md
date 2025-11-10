# Configuration Netlify pour COYA

## Variables d'environnement à configurer sur Netlify

Pour que l'application fonctionne correctement sur Netlify, vous devez configurer les variables d'environnement suivantes dans les paramètres Netlify :

### 🔐 Variables Supabase (OBLIGATOIRES)

1. **VITE_SUPABASE_URL**
   - URL de votre projet Supabase
   - Exemple : `https://tdwbqgyubigaurnjzbfv.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Clé anonyme de votre projet Supabase
   - Trouvable dans : Supabase Dashboard → Settings → API → Project API keys → anon/public

### 🤖 Variables IA (OPTIONNELLES mais recommandées)

3. **VITE_GEMINI_API_KEY** (optionnel)
   - Clé API Google Gemini
   - Si non configurée, le système utilisera automatiquement Groq en fallback
   - Obtenir sur : https://makersuite.google.com/app/apikey

4. **VITE_GROQ_API_KEY** (optionnel)
   - Clé API Groq (déjà intégrée dans le code par défaut)
   - Si vous voulez la changer : https://console.groq.com/
   - **Note** : Une clé par défaut est déjà dans le code, mais vous pouvez la remplacer

5. **VITE_GEMINI_MODEL** (optionnel)
   - Modèle Gemini à utiliser
   - Par défaut : `gemini-1.5-flash`
   - Autres options : `gemini-1.5-pro`, `gemini-pro`

6. **VITE_GROQ_MODEL** (optionnel)
   - Modèle Groq à utiliser
   - Par défaut : `llama-3.3-70b-versatile`

### 🎨 Variables pour la génération d'images (OPTIONNELLES)

7. **VITE_REPLICATE_API_TOKEN** (optionnel)
   - Token API Replicate pour la génération d'images
   - Obtenir sur : https://replicate.com
   - **Note** : Sans cette clé, la génération d'images ne fonctionnera pas

8. **VITE_STABILITY_AI_API_KEY** (optionnel)
   - Clé API Stability AI (alternative à Replicate)
   - Obtenir sur : https://platform.stability.ai
   - **Note** : Alternative à Replicate pour la génération d'images

9. **VITE_IMAGE_API_PROVIDER** (optionnel)
   - Provider d'images à utiliser
   - Valeurs possibles : `replicate` (défaut) ou `stability`

## 📝 Comment configurer sur Netlify

1. Allez sur votre dashboard Netlify
2. Sélectionnez votre site
3. Allez dans **Site settings** → **Environment variables**
4. Cliquez sur **Add a variable**
5. Ajoutez chaque variable avec son nom et sa valeur
6. Cliquez sur **Save**
7. Redéployez votre site (ou Netlify le fera automatiquement si Git est connecté)

## ✅ Checklist de déploiement

- [ ] Variables Supabase configurées (OBLIGATOIRE)
- [ ] Variables IA configurées (recommandé pour meilleures performances)
- [ ] Variables images configurées (si vous voulez la génération d'images)
- [ ] Site déployé et testé
- [ ] Vérification que toutes les fonctionnalités marchent

## 🔍 Vérification après déploiement

1. **Authentification** : Testez la connexion/inscription
2. **IA Textuelle** : Testez le chatbot Coya et les modules IA
3. **Génération d'images** : Si configurée, testez dans GenAILab
4. **Modules principaux** : Vérifiez que tous les modules se chargent correctement

## 🚨 Note importante

- Les variables d'environnement sont publiques côté client (variables `VITE_*`)
- Ne mettez jamais de clés secrètes sensibles dans ces variables
- La clé API Groq est déjà intégrée dans le code par défaut (comme demandé)

## 📚 Documentation

- [Documentation Netlify - Environment variables](https://docs.netlify.com/environment-variables/overview/)
- [Documentation Vite - Environment variables](https://vitejs.dev/guide/env-and-mode.html)

