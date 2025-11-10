# Guide pour créer le Super Administrateur

## ✅ Solution Rapide - Créer via l'interface Signup

**La méthode la plus simple :**

1. **Créez un compte normal** :
   - Allez sur `http://localhost:5173`
   - Cliquez sur "S'inscrire" ou allez directement sur `http://localhost:5173/signup`
   - Remplissez le formulaire :
     - Nom : Votre nom complet
     - Email : admin@ecosystia.com (ou un autre email)
     - Téléphone : (optionnel)
     - Rôle : Choisissez n'importe quel rôle (vous pourrez le changer après)
     - Mot de passe : Choisissez un mot de passe fort
   - Cliquez sur "S'inscrire"

2. **Convertissez-le en super admin** :
   - Une fois le compte créé, vous pouvez vous connecter
   - Pour le convertir en super admin, utilisez le script :
   ```bash
   node scripts/make-super-admin-simple.js admin@ecosystia.com
   ```
   (Note : nécessite SUPABASE_SERVICE_ROLE_KEY dans .env)

## 🔧 Autres méthodes

### Méthode 1 : Via Supabase Dashboard (Recommandé si vous avez accès)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Authentication > Users**
4. Cliquez sur **"Add user"** ou **"Invite user"**
5. Remplissez :
   - Email: `admin@ecosystia.com`
   - Password: `Admin@EcosystIA2024!`
   - **Auto Confirm User**: ✅ (cocher cette case)
6. Cliquez sur **"Create user"**
7. Une fois créé, notez l'**User ID**
8. Allez dans **Table Editor > profiles**
9. Créez un profil avec :
   - `user_id`: (l'ID de l'utilisateur créé)
   - `email`: `admin@ecosystia.com`
   - `full_name`: `Super Administrateur`
   - `role`: `super_administrator`
   - `is_active`: `true`

### Méthode 2 : Via Script (Nécessite SUPABASE_SERVICE_ROLE_KEY)

1. **Ajoutez la clé service_role dans .env** :
   ```env
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_ici
   ```
   
   Vous trouvez cette clé dans :
   - Supabase Dashboard > Settings > API > service_role key

2. **Exécutez le script** :
   ```bash
   node scripts/create-super-admin-new.js
   ```

   Ou avec des valeurs personnalisées :
   ```bash
   SUPER_ADMIN_EMAIL=admin@ecosystia.com SUPER_ADMIN_PASSWORD=VotreMotDePasse123! node scripts/create-super-admin-new.js
   ```

## 📝 Informations par défaut du script

- **Email** : `admin@ecosystia.com`
- **Mot de passe** : `Admin@EcosystIA2024!`
- **Nom** : `Super Administrateur`

## 🔑 Accès après création

Le super administrateur aura accès à **TOUS les 18 modules** :
- Dashboard, Projects, Goals/OKRs, Time Tracking
- Leave Management, Finance, Knowledge Base
- Courses, Jobs, AI Coach, GenAI Lab
- CRM/Sales, Course Management, Analytics
- User Management, Talent Analytics, Settings, AI Agent

## ⚠️ Important

- Changez le mot de passe après la première connexion
- Gardez la clé `SUPABASE_SERVICE_ROLE_KEY` sécurisée et ne la partagez jamais
