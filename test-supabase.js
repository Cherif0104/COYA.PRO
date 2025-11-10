// Script de test pour vérifier la connexion Supabase
import { supabase, testSupabaseConnection } from './services/supabaseService';

// Test de connexion Supabase
async function testSupabase() {
  console.log('🔗 Test de connexion Supabase...');
  
  try {
    const isConnected = await testSupabaseConnection();
    if (isConnected) {
      console.log('✅ Connexion Supabase réussie !');
      
      // Test de récupération des profils
      console.log('👥 Test de récupération des profils...');
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, full_name, role')
        .limit(5);
      
      if (error) {
        console.error('❌ Erreur récupération profils:', error);
      } else {
        console.log('📊 Profils trouvés:', profiles);
      }
      
      // Test spécifique pour rokhaya@senegel.org
      console.log('🔍 Test spécifique pour rokhaya@senegel.org...');
      const { data: rokhayaProfile, error: rokhayaError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'rokhaya@senegel.org')
        .single();
      
      if (rokhayaError) {
        console.error('❌ Erreur profil Rokhaya:', rokhayaError);
      } else {
        console.log('👤 Profil Rokhaya:', rokhayaProfile);
      }
      
    } else {
      console.log('❌ Connexion Supabase échouée !');
    }
  } catch (error) {
    console.error('💥 Erreur lors du test Supabase:', error);
  }
}

// Exécuter le test
if (typeof window !== 'undefined') {
  // Dans le navigateur
  window.testSupabase = testSupabase;
  console.log('🔧 Test disponible dans la console: testSupabase()');
} else {
  // Dans Node.js
  testSupabase();
}
