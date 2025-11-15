import { interceptBrandKitAPI } from '../support/brand-kit-mock';

describe('Brand Kit Generator Demo', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
    interceptBrandKitAPI(); // Mock backend responses
  });

  it('demonstrates brand kit generation workflow', () => {
    // Navigate to Brand Kit Generator
    cy.visit('/admin/store/1/brand');
    cy.wait(2000);

    // Show the empty state
    cy.get('.empty-state').should('be.visible');
    cy.get('.empty-state mat-icon').should('contain', 'palette');
    cy.wait(2000);

    // Fill in shop name
    cy.get('[data-testid="shop-name-input"]').clear().type('TechStore Pro', { delay: 100 });
    cy.wait(1000);

    // Fill in slogan
    cy.get('[data-testid="slogan-input"]').clear().type('Innovation at your fingertips', { delay: 80 });
    cy.wait(1000);

    // Fill in industry
    cy.get('[data-testid="industry-input"]').clear().type('Electronics', { delay: 100 });
    cy.wait(1000);

    // Select brand style
    cy.get('[data-testid="style-select"]').click();
    cy.wait(500);
    cy.contains('mat-option', 'Geometric').click();
    cy.wait(1500);

    // Add preferred color
    cy.get('[data-testid="preferred-color-input"]').clear().type('#3B82F6');
    cy.wait(500);
    cy.get('[data-testid="add-preferred-color-btn"]').click();
    cy.wait(1000);

    // Show the color chip
    cy.get('.color-swatch').should('be.visible');
    cy.wait(1500);

    // Add forbidden color
    cy.get('[data-testid="forbidden-color-input"]').clear().type('#FF0000');
    cy.wait(500);
    cy.get('[data-testid="add-forbidden-color-btn"]').click();
    cy.wait(1000);

    // Scroll to show form is complete
    cy.get('.form-section').scrollIntoView({ duration: 500 });
    cy.wait(2000);

    // Click Generate button
    cy.get('[data-testid="generate-btn"]').should('not.be.disabled').click();
    cy.wait(1000);

    // Show loading state
    cy.get('.loading-container').should('be.visible');
    cy.get('mat-spinner').should('be.visible');
    cy.wait(3000);

    // Wait for generation to complete (mock or real backend)
    cy.get('.brand-preview', { timeout: 15000 }).should('be.visible');
    cy.wait(2000);

    // Show color palette
    cy.get('.palette-display').scrollIntoView({ duration: 1000 });
    cy.wait(2000);

    // Highlight each color box
    cy.get('.color-box').each(($el, index) => {
      cy.wrap($el).scrollIntoView({ duration: 300 });
      cy.wait(500);
    });
    cy.wait(1500);

    // Show brand initials
    cy.get('.initials-display').scrollIntoView({ duration: 1000 });
    cy.wait(2000);
    cy.get('.initials-box').should('be.visible');
    cy.wait(1500);

    // Show generated assets
    cy.get('.assets-display').scrollIntoView({ duration: 1000 });
    cy.wait(2000);

    // Show asset items
    cy.get('.asset-item').each(($el, index) => {
      if (index < 3) { // Show first 3 assets
        cy.wrap($el).scrollIntoView({ duration: 500 });
        cy.wait(800);
      }
    });
    cy.wait(1500);

    // Show action buttons
    cy.get('.preview-actions').scrollIntoView({ duration: 1000 });
    cy.wait(1500);

    // Highlight Save Palette button
    cy.get('[data-testid="save-palette-btn"]').should('be.visible');
    cy.wait(1000);

    // Highlight Download ZIP button
    cy.get('[data-testid="download-zip-btn"]').should('be.visible');
    cy.wait(1500);

    // Test Regenerate functionality
    cy.get('.form-section').scrollIntoView({ duration: 1000 });
    cy.wait(1000);

    cy.get('[data-testid="regenerate-btn"]').should('not.be.disabled').click();
    cy.wait(1000);

    // Show loading again
    cy.get('.loading-container').should('be.visible');
    cy.wait(2000);

    // Show new brand preview
    cy.get('.brand-preview', { timeout: 15000 }).should('be.visible');
    cy.wait(2000);

    // Scroll through the new results
    cy.get('.palette-display').scrollIntoView({ duration: 1000 });
    cy.wait(1500);

    // Final scroll to top
    cy.scrollTo('top', { duration: 2000 });
    cy.wait(2000);
  });
});
