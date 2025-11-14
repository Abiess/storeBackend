describe('How to Register - Tutorial Video', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('records registration process walkthrough', () => {
    // Start from landing page
    cy.visit('/');
    cy.wait(2000);

    // Click register button
    cy.contains('button', 'Kostenlos starten').first().click();
    cy.wait(2000);

    // Show registration form
    cy.url().should('include', '/register');
    cy.wait(1000);

    // Fill in store name
    cy.get('input[name="storeName"], input[formControlName="storeName"]').first().should('be.visible');
    cy.wait(1000);
    cy.get('input[name="storeName"], input[formControlName="storeName"]').first().type('Demo Shop', { delay: 100 });
    cy.wait(1000);

    // Fill in email
    cy.get('input[type="email"], input[formControlName="email"]').first().type('demo@example.com', { delay: 100 });
    cy.wait(1000);

    // Fill in password
    cy.get('input[type="password"], input[formControlName="password"]').first().type('SecurePass123!', { delay: 100 });
    cy.wait(2000);

    // Show submit button
    cy.contains('button', 'Registrieren').should('be.visible');
    cy.wait(2000);
  });
});

