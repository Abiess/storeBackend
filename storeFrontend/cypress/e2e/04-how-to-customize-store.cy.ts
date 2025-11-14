describe('How to Customize Your Store - Tutorial Video', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('records store customization walkthrough', () => {
    // Navigate to settings
    cy.visit('/settings');
    cy.wait(2000);

    // Show settings page
    cy.contains('Einstellungen').should('be.visible');
    cy.wait(2000);

    // Navigate to store settings tab
    cy.contains('Shop-Einstellungen').click({ force: true });
    cy.wait(1500);

    // Show customization options
    cy.get('input[formControlName="storeName"]').should('be.visible');
    cy.wait(1000);

    // Demonstrate changing store name
    cy.get('input[formControlName="storeName"]').clear().type('Mein Super Shop', { delay: 100 });
    cy.wait(1500);

    // Show color picker or theme options
    cy.contains('Theme').should('be.visible');
    cy.wait(2000);

    // Scroll to show more options
    cy.scrollTo('bottom', { duration: 1000 });
    cy.wait(2000);

    // Show save button
    cy.contains('button', 'Speichern').should('be.visible');
    cy.wait(2000);
  });
});

