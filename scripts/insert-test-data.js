// Script pour insérer les données de test via l'API Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://tdwbqgyubigaurnjzbfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkd2JxZ3l1YmlnYXVybmp6YmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzY5NDQsImV4cCI6MjA1MDU1Mjk0NH0.9vHxJg8QyKzLmNpRqStUvWxYzAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestObjective() {
  console.log('🔄 Insertion des données de test...');
  
  try {
    // Données de l'objectif de test
    const objectiveData = {
      title: 'Lancer avec succès la campagne du quatrième trimestre et obtenir une adoption rapide',
      project_id: '1',
      key_results: [
        {
          id: 'kr1-1',
          title: 'Atteindre 10 000 inscriptions d\'utilisateurs au cours du premier mois suivant le lancement',
          current: 3500,
          target: 10000,
          unit: 'utilisateurs'
        },
        {
          id: 'kr1-2',
          title: 'Sécuriser 50 partenaires B2B pour intégrer le nouveau produit',
          current: 5,
          target: 50,
          unit: 'partenaires'
        },
        {
          id: 'kr1-3',
          title: 'Atteindre un score de satisfaction utilisateur de 8,5/10',
          current: 0,
          target: 8.5,
          unit: '/10'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('objectives')
      .insert([objectiveData])
      .select();

    if (error) {
      console.error('❌ Erreur insertion:', error);
      return;
    }

    console.log('✅ Objectif inséré avec succès:', data);
    
    // Vérifier les données
    const { data: objectives, error: fetchError } = await supabase
      .from('objectives')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Erreur récupération:', fetchError);
      return;
    }

    console.log('📊 Objectifs dans la base:', objectives);
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  insertTestObjective();
}

export { insertTestObjective };
