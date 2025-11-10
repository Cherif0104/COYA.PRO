/**
 * Script pour supprimer les utilisateurs dans Supabase Auth
 * 
 * Ce script supprime les utilisateurs depuis auth.users (nécessite SUPABASE_SERVICE_ROLE_KEY)
 * 
 * Usage: node scripts/delete-users.js
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

async function deleteUsers() {
  console.log('🗑️  Suppression des utilisateurs sauf contact.cherif.pro@gmail.com...\n');

  try {
    // Lister tous les utilisateurs
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    if (!authUsers?.users || authUsers.users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé');
      return;
    }

    console.log(`📋 ${authUsers.users.length} utilisateur(s) trouvé(s):\n`);
    
    const usersToDelete = authUsers.users.filter(u => u.email !== 'contact.cherif.pro@gmail.com');
    
    if (usersToDelete.length === 0) {
      console.log('✅ Aucun utilisateur à supprimer. Seul contact.cherif.pro@gmail.com existe.');
      return;
    }

    console.log(`⚠️  ${usersToDelete.length} utilisateur(s) seront supprimé(s):\n`);
    usersToDelete.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} (ID: ${u.id})`);
    });
    console.log('\n');

    // Supprimer chaque utilisateur
    for (const user of usersToDelete) {
      console.log(`🗑️  Suppression de ${user.email}...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`❌ Erreur lors de la suppression de ${user.email}:`, deleteError.message);
      } else {
        console.log(`✅ ${user.email} supprimé avec succès`);
      }
    }

    console.log('\n✅ Suppression terminée !');
    console.log('\n📋 Utilisateurs restants:');
    const { data: remainingUsers } = await supabase.auth.admin.listUsers();
    remainingUsers?.users?.forEach(u => {
      console.log(`   - ${u.email} (${u.id})`);
    });

  } catch (error) {
    console.error('\n❌ Erreur:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

deleteUsers();

