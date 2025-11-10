// Test des variables d'environnement
console.log('🔧 Test des variables d\'environnement:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Présent' : '❌ Manquant');
console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? '✅ Présent' : '❌ Manquant');

// Test de connexion Supabase
import { supabase } from './services/supabaseService';

async function testSupabaseConnection() {
  try {
    console.log('🔗 Test de connexion Supabase...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Erreur Supabase:', error);
    } else {
      console.log('✅ Connexion Supabase réussie !');
    }
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
  }
}

// Exécuter le test
testSupabaseConnection();
