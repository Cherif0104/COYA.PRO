/// <reference types="cypress" />

// Aide personnalisée pour les commandes Cypress

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Se connecter avec un utilisateur test
       * @example cy.login('admin@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Attendre que l'application soit chargée
       */
      waitForAppLoad(): Chainable<void>;

      /**
       * Naviguer vers un module spécifique
       */
      navigateToModule(moduleName: string): Chainable<void>;
    }
  }
}

// Commande login personnalisée
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button', 'Connexion').click();
  cy.waitForAppLoad();
});

// Attendre le chargement de l'app
Cypress.Commands.add('waitForAppLoad', () => {
  cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('exist');
});

// Naviguer vers un module
Cypress.Commands.add('navigateToModule', (moduleName: string) => {
  cy.contains('a', moduleName).click();
  cy.url().should('include', moduleName.toLowerCase().replace(/\s+/g, '-'));
});

export {};

