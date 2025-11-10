/**
 * Script pour vérifier les utilisateurs existants dans Supabase
 * et convertir un utilisateur existant en super administrateur
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2JxZ3l1YmlnYXVybmp6YmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODA2NzEsImV4cCI6MjA3NjU1NjY3MX0.bmGr3gY0GFeJelVIq8xwZJ6xaZhb-L-SAhn6ypg6zzU';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY est requis');
  console.log('💡 Utilisation de la clé anon pour la lecture seule...');
}

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(supabaseUrl, supabaseAnonKey);

async function listUsers() {
  console.log('🔍 Liste des utilisateurs dans Supabase...\n');

  try {
    // Récupérer tous les profils depuis la table profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Erreur lors de la récupération des profils:', profilesError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  Aucun profil trouvé dans la table profiles');
      
      // Essayer de récupérer les utilisateurs depuis auth.users
      if (supabaseServiceKey) {
        console.log('\n🔍 Tentative de récupération depuis auth.users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Erreur:', authError);
          return;
        }

        if (authUsers?.users && authUsers.users.length > 0) {
          console.log(`\n✅ ${authUsers.users.length} utilisateur(s) trouvé(s) dans auth.users:\n`);
          authUsers.users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Créé le: ${user.created_at}`);
            console.log(`   Métadonnées:`, user.user_metadata || 'Aucune');
            console.log('');
          });
        } else {
          console.log('⚠️  Aucun utilisateur trouvé dans auth.users');
        }
      }
      return;
    }

    console.log(`✅ ${profiles.length} profil(s) trouvé(s):\n`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name || 'Sans nom'}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Rôle: ${profile.role}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   Actif: ${profile.is_active ? 'Oui' : 'Non'}`);
      console.log(`   Créé le: ${profile.created_at || 'Non spécifié'}`);
      console.log('');
    });

    // Si on a la clé service_role, proposer de convertir en super admin
    if (supabaseServiceKey && profiles.length > 0) {
      console.log('\n💡 Pour convertir un utilisateur en super_administrator:');
      console.log('   Utilisez le script: npm run make-super-admin <email>');
      console.log('   Ou modifiez manuellement le rôle dans Supabase Dashboard');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

listUsers();

