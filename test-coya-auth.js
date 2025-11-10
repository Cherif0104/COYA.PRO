// Script de test pour vérifier l'authentification SENEGEL
import { SenegelAuthService } from './services/senegelAuthService';

// Test de l'authentification SENEGEL
async function testSenegelAuth() {
  console.log('🧪 Test de l\'authentification SENEGEL...');
  
  // Test avec un utilisateur SENEGEL valide
  const testEmail = 'rokhaya@senegel.org';
  const testPassword = 'Senegel2024!';
  
  try {
    const result = await SenegelAuthService.signInSenegelUser(testEmail, testPassword);
    
    if (result.user) {
      console.log('✅ Authentification réussie !');
      console.log('👤 Utilisateur:', result.user.full_name);
      console.log('📧 Email:', result.user.email);
      console.log('🎭 Rôle:', result.user.role);
      console.log('📞 Téléphone:', result.user.phone_number);
    } else {
      console.log('❌ Authentification échouée:', result.error?.message);
    }
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
  }
}

// Test de la liste des utilisateurs
function testSenegelUsersList() {
  console.log('👥 Test de la liste des utilisateurs SENEGEL...');
  
  const users = SenegelAuthService.getSenegelUsersList();
  console.log(`📊 Nombre d'utilisateurs: ${users.length}`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.fullName} (${user.email}) - ${user.role}`);
  });
}

// Exécuter les tests
if (typeof window !== 'undefined') {
  // Dans le navigateur
  window.testSenegelAuth = testSenegelAuth;
  window.testSenegelUsersList = testSenegelUsersList;
  
  console.log('🔧 Tests disponibles dans la console:');
  console.log('- testSenegelAuth()');
  console.log('- testSenegelUsersList()');
} else {
  // Dans Node.js
  testSenegelAuth();
  testSenegelUsersList();
}
