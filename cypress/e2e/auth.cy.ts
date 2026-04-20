describe('Flux authentification', () => {
  beforeEach(() => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit('/');
  });

  it('affiche le formulaire de connexion', () => {
    cy.get('[data-testid="login-email"]', { timeout: 20000 }).should('be.visible');
    cy.get('[data-testid="login-password"]').should('be.visible');
    cy.get('[data-testid="login-submit"]').should('be.visible');
  });

  it('affiche une erreur avec des identifiants invalides', () => {
    cy.get('[data-testid="login-email"]', { timeout: 20000 }).should('be.visible');
    cy.get('[data-testid="login-email"]').type('invalid@example.com');
    cy.get('[data-testid="login-password"]').type('wrongpassword');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="login-error"]', { timeout: 15000 }).should('be.visible');
  });

  it('connecte avec des identifiants valides (variables d’env)', function () {
    if (!Cypress.env('TEST_EMAIL') || !Cypress.env('TEST_PASSWORD')) {
      this.skip();
    }
    cy.login(String(Cypress.env('TEST_EMAIL')), String(Cypress.env('TEST_PASSWORD')));
    cy.get('[data-testid="dashboard"]', { timeout: 30000 }).should('be.visible');
  });

  it('persiste la session après rechargement', function () {
    if (!Cypress.env('TEST_EMAIL') || !Cypress.env('TEST_PASSWORD')) {
      this.skip();
    }
    cy.login(String(Cypress.env('TEST_EMAIL')), String(Cypress.env('TEST_PASSWORD')));
    cy.reload();
    cy.get('[data-testid="dashboard"]', { timeout: 30000 }).should('exist');
    cy.get('[data-testid="login-email"]').should('not.exist');
  });
});
