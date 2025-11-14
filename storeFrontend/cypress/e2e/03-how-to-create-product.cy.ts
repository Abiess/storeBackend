describe('How to Create Your First Product - Tutorial Video', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('records product creation walkthrough', () => {
    // Login first (assuming we're logged in)
    cy.visit('/products');
    cy.wait(2000);

    // Show products page
    cy.contains('Produkte').should('be.visible');
    cy.wait(2000);

    // Click add product button
    cy.contains('button', 'Neues Produkt').click({ force: true });
    cy.wait(2000);

    // Fill product details
    cy.get('input[formControlName="name"]').type('Mein erstes Produkt', { delay: 100 });
    cy.wait(1000);

    cy.get('textarea[formControlName="description"]').type('Eine tolle Produktbeschreibung', { delay: 80 });
    cy.wait(1000);

    cy.get('input[formControlName="price"]').type('29.99', { delay: 100 });
    cy.wait(1000);

    cy.get('input[formControlName="stock"]').type('100', { delay: 100 });
    cy.wait(2000);

    // Show save button
    cy.contains('button', 'Speichern').should('be.visible');
    cy.wait(2000);
  });
});

