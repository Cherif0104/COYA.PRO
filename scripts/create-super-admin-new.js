/**
 * Script pour créer un nouveau super administrateur dans Supabase
 * 
 * Usage: node scripts/create-super-admin-new.js
 * 
 * Le script créera un utilisateur avec les informations par défaut ou celles fournies en variables d'environnement
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement depuis .env
let envVars = {};
try {
  const envPath = join(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.trim().startsWith('#')) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  // Utiliser les variables d'environnement système
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY est requis');
  console.log('💡 Ajoutez SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  console.log('💡 Trouvez-la dans Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  console.log('🚀 Création d\'un nouveau super administrateur...\n');

  // Informations par défaut (modifiables via variables d'environnement)
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@ecosystia.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@EcosystIA2024!';
  const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Administrateur';
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE || '';

  console.log('📋 Informations du super admin:');
  console.log(`   Email: ${superAdminEmail}`);
  console.log(`   Nom: ${superAdminName}`);
  console.log(`   Téléphone: ${superAdminPhone || 'Non spécifié'}`);
  console.log(`   Mot de passe: ${'*'.repeat(superAdminPassword.length)}\n`);

  try {
    // Vérifier si l'utilisateur existe déjà
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    const existingUser = authUsers?.users?.find(u => u.email?.toLowerCase() === superAdminEmail.toLowerCase());
    
    if (existingUser) {
      console.log('⚠️  Un utilisateur avec cet email existe déjà.');
      console.log(`   ID: ${existingUser.id}`);
      
      // Vérifier et mettre à jour le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile) {
        if (profile.role !== 'super_administrator') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              role: 'super_administrator',
              full_name: superAdminName,
              phone_number: superAdminPhone || null,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', existingUser.id);

          if (updateError) throw updateError;
          console.log('✅ Profil mis à jour avec le rôle super_administrator');
        } else {
          console.log('✅ Le profil est déjà configuré comme super_administrator');
        }
      } else {
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: existingUser.id,
            email: superAdminEmail,
            full_name: superAdminName,
            phone_number: superAdminPhone || null,
            role: 'super_administrator',
            is_active: true
          });

        if (createProfileError) throw createProfileError;
        console.log('✅ Profil créé avec le rôle super_administrator');
      }

      console.log(`\n✅ ${superAdminEmail} est maintenant super_administrator !`);
      console.log('\n💡 Vous pouvez maintenant vous connecter avec cet email et le mot de passe.');
      return;
    }

    // Créer le nouvel utilisateur
    console.log('👤 Création de l\'utilisateur dans Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: superAdminEmail,
      password: superAdminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: superAdminName,
        phone_number: superAdminPhone
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Aucun utilisateur retourné');

    console.log('✅ Utilisateur créé dans Supabase Auth');
    console.log(`   ID: ${authData.user.id}`);

    // Créer le profil
    console.log('📝 Création du profil dans la table profiles...');
    const profileData = {
      user_id: authData.user.id,
      email: superAdminEmail,
      full_name: superAdminName,
      phone_number: superAdminPhone || null,
      role: 'super_administrator',
      skills: ['Administration système', 'Gestion de projet', 'Leadership'],
      bio: 'Super administrateur avec accès complet à tous les modules',
      location: 'Sénégal',
      is_active: true
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      if (profileError.code === '23505') {
        // Conflit unique, mettre à jour
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'super_administrator', is_active: true })
          .eq('email', superAdminEmail);
        if (updateError) throw updateError;
        console.log('✅ Profil mis à jour avec succès !');
      } else {
        throw profileError;
      }
    } else {
      console.log('✅ Profil créé avec succès !');
    }

    console.log('\n✅ Super administrateur créé avec succès !');
    console.log('\n📋 Informations de connexion:');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Mot de passe: ${superAdminPassword}`);
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');
    console.log('\n🎯 Accès complet aux 18 modules activé');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

createSuperAdmin();

