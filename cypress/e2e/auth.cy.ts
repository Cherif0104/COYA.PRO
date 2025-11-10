describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.contains('button', 'Connexion').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.contains('button', 'Connexion').click();
    
    // Attendre un message d'erreur
    cy.get('body', { timeout: 5000 }).should('contain', 'Erreur').or('contain', 'incorrect');
  });

  it('should successfully login with valid credentials', () => {
    // Remplacer par des identifiants de test réels
    const testEmail = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const testPassword = Cypress.env('TEST_PASSWORD') || 'testpassword';
    
    cy.login(testEmail, testPassword);
    
    // Vérifier redirection vers dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to signup page', () => {
    cy.contains('a', 'Sign up').should('be.visible').click();
    cy.url().should('include', '/signup');
  });

  it('should persist session after refresh', () => {
    const testEmail = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const testPassword = Cypress.env('TEST_PASSWORD') || 'testpassword';
    
    cy.login(testEmail, testPassword);
    cy.reload();
    
    // Vérifier que l'utilisateur reste connecté
    cy.url().should('not.include', '/login');
  });
});

