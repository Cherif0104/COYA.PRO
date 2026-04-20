describe('Module Projets', () => {
  beforeEach(function () {
    if (!Cypress.env('TEST_EMAIL') || !Cypress.env('TEST_PASSWORD')) {
      this.skip();
    }
    cy.login(String(Cypress.env('TEST_EMAIL')), String(Cypress.env('TEST_PASSWORD')));
    cy.navigateToModule('Projets');
  });

  it('affiche la zone projets', () => {
    cy.get('[data-testid="projects-list"]', { timeout: 20000 }).should('be.visible');
    cy.contains('h1', /projets/i).should('be.visible');
  });

  it('permet de rechercher (champ présent)', () => {
    cy.get('[data-testid="projects-search"]', { timeout: 15000 }).should('be.visible').type('Test');
    cy.wait(300);
    cy.get('[data-testid="projects-list"]').should('be.visible');
  });

  it('filtre par statut (sélecteur présent)', () => {
    cy.get('[data-testid="projects-status-filter"]', { timeout: 15000 }).should('be.visible').select('In Progress');
    cy.wait(300);
    cy.get('[data-testid="projects-list"]').should('be.visible');
  });

  it('ouvre le formulaire de création si le bouton est disponible', () => {
    cy.get('body').then(($body) => {
      const btn = $body.find('[data-testid="projects-create-btn"]');
      if (!btn.length) {
        cy.log('Utilisateur sans droit de création — étape ignorée');
        return;
      }
      cy.wrap(btn).click({ force: true });
      cy.get('input[name="title"]', { timeout: 10000 }).should('be.visible');
      cy.contains('button', /annuler|cancel/i).click();
    });
  });

  it('ouvre l’édition depuis une carte projet si disponible', () => {
    cy.get('body').then(($body) => {
      const items = $body.find('[data-testid="project-item"]');
      if (!items.length) {
        cy.log('Aucun projet — test d’édition ignoré');
        return;
      }
      cy.get('[data-testid="project-item"]')
        .first()
        .find('button[title="Modifier"], button[title="Edit"]')
        .first()
        .click({ force: true });
      cy.get('input[name="title"]', { timeout: 10000 }).should('be.visible');
      cy.contains('button', /annuler|cancel/i).click();
    });
  });
});
