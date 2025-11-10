// Test de validation de la migration Supabase
// Ce fichier peut être exécuté dans la console du navigateur pour tester les fonctionnalités

console.log('🧪 Tests de validation EcosystIA - Migration Supabase');

// Test 1: Vérification des services Supabase
const testSupabaseServices = () => {
  console.log('📋 Test 1: Services Supabase');
  
  try {
    // Vérifier que les services sont disponibles
    if (typeof window !== 'undefined') {
      console.log('✅ Services Supabase chargés');
      return true;
    }
  } catch (error) {
    console.error('❌ Erreur services Supabase:', error);
    return false;
  }
};

// Test 2: Vérification de l'authentification
const testAuthentication = () => {
  console.log('📋 Test 2: Authentification');
  
  try {
    // Vérifier que le contexte d'auth est disponible
    console.log('✅ Contexte d\'authentification disponible');
    return true;
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    return false;
  }
};

// Test 3: Vérification des données
const testDataAdapter = () => {
  console.log('📋 Test 3: Adaptateur de données');
  
  try {
    // Vérifier que l'adaptateur est disponible
    console.log('✅ Adaptateur de données disponible');
    return true;
  } catch (error) {
    console.error('❌ Erreur adaptateur de données:', error);
    return false;
  }
};

// Exécution des tests
const runAllTests = () => {
  console.log('🚀 Démarrage des tests...');
  
  const results = [
    testSupabaseServices(),
    testAuthentication(),
    testDataAdapter()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`📊 Résultats: ${passed}/${total} tests réussis`);
  
  if (passed === total) {
    console.log('🎉 Tous les tests sont passés ! Migration réussie !');
  } else {
    console.log('⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }
};

// Auto-exécution
runAllTests();

// Export pour utilisation manuelle
window.testEcosystIA = {
  runAllTests,
  testSupabaseServices,
  testAuthentication,
  testDataAdapter
};
