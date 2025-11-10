/**
 * Script pour créer le super administrateur dans Supabase
 * 
 * Ce script crée un utilisateur super_administrator avec accès complet à tous les modules.
 * 
 * Usage: node scripts/create-super-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
const envPath = join(__dirname, '../.env');
let envVars = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!key.startsWith('#')) {
        envVars[key.trim()] = value;
      }
    }
  });
} catch (error) {
  console.log('⚠️ Fichier .env non trouvé, utilisation des variables d\'environnement système');
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY est requis pour créer un utilisateur');
  console.log('💡 Veuillez définir SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  console.log('💡 Vous pouvez trouver cette clé dans Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Créer le client Supabase avec la clé de service (accès admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  console.log('🚀 Création du super administrateur...\n');

  // Informations du super admin
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
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();
    
    if (checkError) {
      throw checkError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === superAdminEmail);
    
    if (existingUser) {
      console.log('⚠️  Un utilisateur avec cet email existe déjà.');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      
      // Mettre à jour le profil pour s'assurer qu'il est super_administrator
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile) {
        // Mettre à jour le rôle si nécessaire
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

          if (updateError) {
            throw updateError;
          }
          console.log('✅ Profil mis à jour avec le rôle super_administrator');
        } else {
          console.log('✅ Le profil est déjà configuré comme super_administrator');
        }
      } else {
        // Créer le profil
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

        if (createProfileError) {
          throw createProfileError;
        }
        console.log('✅ Profil créé avec le rôle super_administrator');
      }

      console.log('\n✅ Super administrateur configuré avec succès !');
      console.log(`   Vous pouvez maintenant vous connecter avec: ${superAdminEmail}`);
      
      // Si le mot de passe n'a pas été défini, proposer de le réinitialiser
      if (superAdminPassword === 'Admin@EcosystIA2024!') {
        console.log('\n💡 Pour changer le mot de passe, utilisez la fonction de réinitialisation dans l\'application');
      }
      
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

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Aucun utilisateur retourné par Supabase');
    }

    console.log('✅ Utilisateur créé dans Supabase Auth');
    console.log(`   ID: ${authData.user.id}`);

    // Créer le profil dans la table profiles
    console.log('📝 Création du profil dans la table profiles...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email: superAdminEmail,
        full_name: superAdminName,
        phone_number: superAdminPhone || null,
        role: 'super_administrator',
        skills: ['Administration système', 'Gestion de projet', 'Leadership'],
        bio: 'Super administrateur avec accès complet à tous les modules',
        location: 'Sénégal',
        is_active: true
      });

    if (profileError) {
      console.error('❌ Erreur création profil:', profileError);
      // Ne pas faire échouer le script si le profil existe déjà
      if (profileError.code !== '23505') {
        throw profileError;
      }
      console.log('⚠️  Le profil existe déjà, mise à jour...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'super_administrator',
          full_name: superAdminName,
          phone_number: superAdminPhone || null,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authData.user.id);

      if (updateError) {
        throw updateError;
      }
    }

    console.log('✅ Profil créé avec le rôle super_administrator');

    console.log('\n✅ Super administrateur créé avec succès !');
    console.log('\n📋 Informations de connexion:');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Mot de passe: ${superAdminPassword}`);
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');
    console.log('\n🎯 Le super administrateur a accès à TOUS les modules:');
    console.log('   - Dashboard');
    console.log('   - Projects');
    console.log('   - Goals/OKRs');
    console.log('   - Time Tracking');
    console.log('   - Leave Management');
    console.log('   - Finance');
    console.log('   - Knowledge Base');
    console.log('   - Courses');
    console.log('   - Jobs');
    console.log('   - AI Coach');
    console.log('   - GenAI Lab');
    console.log('   - CRM/Sales');
    console.log('   - Course Management');
    console.log('   - Analytics');
    console.log('   - User Management');
    console.log('   - Talent Analytics');
    console.log('   - Settings');
    console.log('   - AI Agent');

  } catch (error) {
    console.error('\n❌ Erreur lors de la création du super administrateur:');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
createSuperAdmin();

