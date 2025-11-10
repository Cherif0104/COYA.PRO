// Script de test pour vérifier la persistance des objectifs
import { DataAdapter } from './services/dataAdapter.js';

async function testObjectivesPersistence() {
  console.log('🧪 Test de persistance des objectifs...');
  
  try {
    // Test 1: Récupérer les objectifs existants
    console.log('1. Récupération des objectifs...');
    const objectives = await DataAdapter.getObjectives();
    console.log('✅ Objectifs récupérés:', objectives.length);
    
    // Test 2: Créer un nouvel objectif
    console.log('2. Création d\'un nouvel objectif...');
    const newObjective = {
      title: "Test OKR - Module Goals",
      projectId: "1",
      keyResults: [
        {
          id: 'test-kr-1',
          title: "Test Key Result 1",
          current: 0,
          target: 100,
          unit: "%"
        }
      ]
    };
    
    const created = await DataAdapter.createObjective(newObjective);
    if (created) {
      console.log('✅ Objectif créé:', created.id);
      
      // Test 3: Mettre à jour l'objectif
      console.log('3. Mise à jour de l\'objectif...');
      const updated = await DataAdapter.updateObjective(created.id, {
        ...created,
        title: "Test OKR - Module Goals (Modifié)"
      });
      
      if (updated) {
        console.log('✅ Objectif mis à jour:', updated.id);
        
        // Test 4: Supprimer l'objectif
        console.log('4. Suppression de l\'objectif...');
        const deleted = await DataAdapter.deleteObjective(created.id);
        
        if (deleted) {
          console.log('✅ Objectif supprimé avec succès');
        }
      }
    }
    
    console.log('🎉 Tous les tests de persistance ont réussi !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testObjectivesPersistence();
}

export { testObjectivesPersistence };
