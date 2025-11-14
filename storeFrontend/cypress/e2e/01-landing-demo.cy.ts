describe('Landing Page Demo Video', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('records landing page walkthrough', () => {
    // Visit landing page
    cy.visit('/');
    cy.wait(2000);

    // Scroll through hero section
    cy.get('.hero-title').should('be.visible');
    cy.wait(3000);

    // Show hero stats
    cy.get('.hero-stats').scrollIntoView({ duration: 1000 });
    cy.wait(2000);

    // Navigate to features
    cy.get('.features-section').scrollIntoView({ duration: 1500 });
    cy.wait(3000);

    // Highlight each feature card
    cy.get('.feature-card').each(($el, index) => {
      cy.wrap($el).scrollIntoView({ duration: 500 });
      cy.wait(1000);
    });

    // Navigate to pricing
    cy.get('.pricing-section').scrollIntoView({ duration: 1500 });
    cy.wait(3000);

    // Highlight pricing cards
    cy.get('.pricing-card').each(($el, index) => {
      cy.wrap($el).scrollIntoView({ duration: 500 });
      cy.wait(1000);
    });

    // Scroll to CTA
    cy.get('.cta-section').scrollIntoView({ duration: 1500 });
    cy.wait(3000);

    // Scroll back to top
    cy.scrollTo('top', { duration: 2000 });
    cy.wait(2000);
  });
});

