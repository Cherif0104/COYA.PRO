/**
 * Script pour créer le super administrateur dans Supabase
 * 
 * Ce script crée un utilisateur super_administrator avec accès complet à tous les modules.
 * 
 * Usage: node scripts/create-super-admin.js
 * 
 * Variables d'environnement requises:
 * - SUPABASE_SERVICE_ROLE_KEY (clé service_role de Supabase)
 * - SUPER_ADMIN_EMAIL (optionnel, défaut: admin@ecosystia.com)
 * - SUPER_ADMIN_PASSWORD (optionnel, défaut: Admin@EcosystIA2024!)
 * - SUPER_ADMIN_NAME (optionnel, défaut: Super Administrateur)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY est requis pour créer un utilisateur');
  console.log('💡 Veuillez définir SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  console.log('💡 Vous pouvez trouver cette clé dans Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  console.log('🚀 Création du super administrateur...\n');

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

      console.log('\n✅ Super administrateur configuré avec succès !');
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
      if (profileError.code !== '23505') throw profileError;
      
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

      if (updateError) throw updateError;
    }

    console.log('✅ Profil créé avec le rôle super_administrator');
    console.log('\n✅ Super administrateur créé avec succès !');
    console.log('\n📋 Informations de connexion:');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Mot de passe: ${superAdminPassword}`);
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

createSuperAdmin();

