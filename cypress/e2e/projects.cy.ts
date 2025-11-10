describe('Projects Module', () => {
  beforeEach(() => {
    // Login avant chaque test
    const testEmail = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const testPassword = Cypress.env('TEST_PASSWORD') || 'testpassword';
    cy.login(testEmail, testPassword);
    
    // Naviguer vers le module Projects
    cy.navigateToModule('Projets');
  });

  it('should display projects list', () => {
    cy.contains('Projets').should('be.visible');
    cy.get('[data-testid="projects-list"]').should('be.visible');
  });

  it('should allow creating a new project', () => {
    cy.contains('button', 'Nouveau Projet').click();
    
    // Remplir le formulaire
    cy.get('input[name="title"]').type('Test Project E2E');
    cy.get('textarea[name="description"]').type('Description du projet de test');
    cy.get('select[name="status"]').select('active');
    cy.get('select[name="priority"]').select('high');
    
    // Sauvegarder
    cy.contains('button', 'Créer').click();
    
    // Vérifier que le projet apparaît dans la liste
    cy.contains('Test Project E2E').should('be.visible');
  });

  it('should allow editing a project', () => {
    // Cliquer sur le premier projet (supposé existant)
    cy.get('[data-testid="project-item"]').first().click();
    
    // Cliquer sur Modifier
    cy.contains('button', 'Modifier').click();
    
    // Modifier le titre
    cy.get('input[name="title"]').clear().type('Projet Modifié E2E');
    
    // Sauvegarder
    cy.contains('button', 'Enregistrer').click();
    
    // Vérifier la modification
    cy.contains('Projet Modifié E2E').should('be.visible');
  });

  it('should search projects', () => {
    cy.get('input[placeholder*="Rechercher"]').type('Test');
    cy.wait(500);
    
    // Vérifier que les résultats sont filtrés
    cy.get('[data-testid="projects-list"]').should('contain', 'Test');
  });

  it('should filter by status', () => {
    cy.get('select[name="status-filter"]').select('active');
    cy.wait(500);
    
    // Vérifier que les projets filtrés s'affichent
    cy.get('[data-testid="projects-list"]').should('exist');
  });
});

