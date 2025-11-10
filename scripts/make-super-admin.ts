/**
 * Script pour convertir un utilisateur existant en super_administrator
 * 
 * Usage: npx tsx scripts/make-super-admin.ts <email>
 * Exemple: npx tsx scripts/make-super-admin.ts admin@ecosystia.com
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY est requis');
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

async function makeSuperAdmin(email: string) {
  console.log(`🚀 Conversion de ${email} en super_administrator...\n`);

  try {
    // Trouver l'utilisateur par email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const user = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      console.log('\n💡 Utilisateurs disponibles:');
      authUsers?.users?.forEach(u => {
        console.log(`   - ${u.email}`);
      });
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.email}`);
    console.log(`   ID: ${user.id}\n`);

    // Vérifier si le profil existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (profile) {
      console.log('📝 Profil existant trouvé:');
      console.log(`   Nom: ${profile.full_name}`);
      console.log(`   Rôle actuel: ${profile.role}`);
      
      if (profile.role === 'super_administrator') {
        console.log('\n✅ L\'utilisateur est déjà super_administrator !');
        return;
      }

      // Mettre à jour le profil
      console.log('\n🔄 Mise à jour du profil...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'super_administrator',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Profil mis à jour avec succès !');
      console.log('\n🎯 L\'utilisateur a maintenant accès à TOUS les modules:');
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

    } else {
      // Créer le profil s'il n'existe pas
      console.log('⚠️  Aucun profil trouvé, création du profil...');
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email || 'Super Administrateur',
          phone_number: user.user_metadata?.phone_number || null,
          role: 'super_administrator',
          skills: ['Administration système', 'Gestion de projet', 'Leadership'],
          bio: 'Super administrateur avec accès complet à tous les modules',
          location: 'Sénégal',
          is_active: true
        });

      if (createError) {
        throw createError;
      }

      console.log('✅ Profil créé avec le rôle super_administrator !');
      console.log('\n🎯 L\'utilisateur peut maintenant se connecter et accéder à tous les modules.');
    }

    console.log(`\n✅ ${email} est maintenant super_administrator !`);
    console.log('💡 Déconnectez-vous et reconnectez-vous pour voir les changements.');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

// Récupérer l'email depuis les arguments de la ligne de commande
const email = process.argv[2];

if (!email) {
  console.error('❌ Erreur: Email requis');
  console.log('\nUsage: npx tsx scripts/make-super-admin.ts <email>');
  console.log('Exemple: npx tsx scripts/make-super-admin.ts admin@ecosystia.com');
  process.exit(1);
}

makeSuperAdmin(email);

