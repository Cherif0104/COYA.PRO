/**
 * Script pour lister les utilisateurs existants dans Supabase
 * 
 * Usage: node scripts/list-users-simple.js
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
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2JxZ3l1YmlnYXVybmp6YmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODA2NzEsImV4cCI6MjA3NjU1NjY3MX0.bmGr3gY0GFeJelVIq8xwZJ6xaZhb-L-SAhn6ypg6zzU';

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : createClient(supabaseUrl, supabaseAnonKey);

async function listUsers() {
  console.log('🔍 Liste des utilisateurs dans Supabase...\n');

  try {
    // Récupérer les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Erreur lors de la récupération des profils:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`✅ ${profiles.length} profil(s) trouvé(s):\n`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name || 'Sans nom'}`);
        console.log(`   Email: ${profile.email}`);
        console.log(`   Rôle: ${profile.role}`);
        console.log(`   Actif: ${profile.is_active ? 'Oui' : 'Non'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Aucun profil trouvé dans la table profiles');
    }

    // Essayer de récupérer depuis auth.users si on a la clé service_role
    if (supabaseServiceKey) {
      console.log('\n🔍 Récupération depuis auth.users...');
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Erreur:', authError.message);
        return;
      }

      if (authUsers?.users && authUsers.users.length > 0) {
        console.log(`\n✅ ${authUsers.users.length} utilisateur(s) dans auth.users:\n`);
        authUsers.users.forEach((user, index) => {
          console.log(`${index + 1}. Email: ${user.email}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Créé le: ${user.created_at}`);
          console.log(`   Email confirmé: ${user.email_confirmed_at ? 'Oui' : 'Non'}`);
          
          // Vérifier si un profil existe
          const hasProfile = profiles?.some(p => p.user_id === user.id);
          console.log(`   Profil: ${hasProfile ? '✅ Existe' : '❌ Manquant'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  Aucun utilisateur trouvé dans auth.users');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message || error);
  }
}

listUsers();

