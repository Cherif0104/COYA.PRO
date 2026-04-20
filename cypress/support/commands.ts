/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      waitForAppLoad(): Chainable<void>;
      navigateToModule(moduleName: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
    },
  });
  cy.get('[data-testid="login-email"]', { timeout: 20000 }).should('be.visible');
  cy.get('[data-testid="login-email"]').clear().type(email);
  cy.get('[data-testid="login-password"]').clear().type(password, { log: false });
  cy.get('[data-testid="login-submit"]').click();
  cy.waitForAppLoad();
});

Cypress.Commands.add('waitForAppLoad', () => {
  cy.get('[data-testid="login-email"]', { timeout: 5000 }).should('not.exist');
  cy.get('[data-testid="dashboard"]', { timeout: 30000 }).should('exist');
});

/** Navigation SPA (pas de changement d’URL) : clic sur un lien de la sidebar identifié par data-testid. */
Cypress.Commands.add('navigateToModule', (moduleName: string) => {
  const key = moduleName.trim().toLowerCase();
  const testId =
    key.includes('projet') ? 'nav-projects' :
    key.includes('tableau') || key.includes('dashboard') ? 'nav-dashboard' :
    null;

  if (testId) {
    cy.get(`[data-testid="${testId}"]`, { timeout: 15000 }).should('be.visible').click();
    return;
  }
  cy.contains('a', moduleName, { timeout: 15000 }).should('be.visible').click();
});

export {};
