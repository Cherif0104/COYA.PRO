/**
 * Script pour convertir un utilisateur existant en super_administrator
 * 
 * Usage: node scripts/make-super-admin-simple.js <email>
 * 
 * Note: Ce script nécessite SUPABASE_SERVICE_ROLE_KEY dans .env
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

async function makeSuperAdmin(email) {
  console.log(`🚀 Conversion de ${email} en super_administrator...\n`);

  try {
    // Lister tous les utilisateurs
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    if (!authUsers?.users || authUsers.users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé dans Supabase Auth');
      process.exit(1);
    }

    console.log(`📋 ${authUsers.users.length} utilisateur(s) trouvé(s) dans Supabase:\n`);
    authUsers.users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email}`);
    });
    console.log('');

    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.email}`);
    console.log(`   ID: ${user.id}\n`);

    // Vérifier le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (profile) {
      console.log(`📝 Profil existant trouvé:`);
      console.log(`   Nom: ${profile.full_name}`);
      console.log(`   Rôle actuel: ${profile.role}`);
      
      if (profile.role === 'super_administrator') {
        console.log('\n✅ L\'utilisateur est déjà super_administrator !');
        return;
      }

      // Mettre à jour
      console.log('\n🔄 Mise à jour du profil...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'super_administrator',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      console.log('✅ Profil mis à jour avec succès !');
    } else {
      // Créer le profil
      console.log('📝 Création du profil...');
      const profileData = {
        user_id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || 'Super Administrateur',
        phone_number: user.user_metadata?.phone_number || null,
        role: 'super_administrator',
        skills: ['Administration système', 'Gestion de projet', 'Leadership'],
        bio: 'Super administrateur avec accès complet à tous les modules',
        location: 'Sénégal',
        is_active: true
      };

      const { error: createError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (createError) {
        if (createError.code === '23505') {
          // Conflit unique, mettre à jour
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'super_administrator', is_active: true })
            .eq('email', user.email);
          if (updateError) throw updateError;
          console.log('✅ Profil mis à jour avec succès !');
        } else {
          throw createError;
        }
      } else {
        console.log('✅ Profil créé avec succès !');
      }
    }

    console.log(`\n✅ ${email} est maintenant super_administrator !`);
    console.log('\n🎯 Accès complet aux 18 modules activé:');
    console.log('   - Dashboard, Projects, Goals/OKRs, Time Tracking');
    console.log('   - Leave Management, Finance, Knowledge Base');
    console.log('   - Courses, Jobs, AI Coach, GenAI Lab');
    console.log('   - CRM/Sales, Course Management, Analytics');
    console.log('   - User Management, Talent Analytics, Settings, AI Agent');
    console.log('\n💡 Déconnectez-vous et reconnectez-vous pour voir les changements.');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Erreur: Email requis');
  console.log('\nUsage: node scripts/make-super-admin-simple.js <email>');
  console.log('Exemple: node scripts/make-super-admin-simple.js admin@ecosystia.com');
  console.log('\n💡 Pour voir la liste des utilisateurs, utilisez: node scripts/list-users-simple.js');
  process.exit(1);
}

makeSuperAdmin(email);
