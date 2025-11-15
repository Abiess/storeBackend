// Mock Backend Response for Brand Kit Generator Cypress Test
export const mockBrandKitResponse = {
  assets: {
    'logo-svg': 'https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=TS',
    'logo-png': 'https://via.placeholder.com/512x512/3B82F6/FFFFFF?text=TS',
    'logo-icon-png': 'https://via.placeholder.com/512x512/3B82F6/FFFFFF?text=TS',
    'hero-1920x1080': 'https://via.placeholder.com/1920x1080/3B82F6/1E3A8A?text=Hero+Banner',
    'favicon-16': 'https://via.placeholder.com/16x16/3B82F6/FFFFFF?text=TS',
    'favicon-32': 'https://via.placeholder.com/32x32/3B82F6/FFFFFF?text=TS',
    'favicon-180': 'https://via.placeholder.com/180x180/3B82F6/FFFFFF?text=TS',
    'favicon-192': 'https://via.placeholder.com/192x192/3B82F6/FFFFFF?text=TS',
    'favicon-512': 'https://via.placeholder.com/512x512/3B82F6/FFFFFF?text=TS',
    'og-1200x630': 'https://via.placeholder.com/1200x630/3B82F6/FFFFFF?text=TechStore+Pro',
    'palette-json': 'data:application/json;base64,eyAicGFsZXR0ZSI6ICJ0cnVlIiB9'
  },
  paletteTokens: {
    '--color-primary': '#3B82F6',
    '--color-secondary': '#1E40AF',
    '--color-accent': '#60A5FA',
    '--color-background': '#FAFAFA',
    '--color-surface': '#FFFFFF',
    '--color-text': '#212121',
    '--color-text-secondary': '#757575'
  },
  initials: 'TS'
};

// Intercept for Cypress
export function interceptBrandKitAPI() {
  cy.intercept('POST', '**/api/stores/*/brand/generate', {
    statusCode: 200,
    body: mockBrandKitResponse,
    delay: 2000 // Simulate server processing
  }).as('generateBrandKit');

  cy.intercept('PUT', '**/api/stores/*/brand/palette', {
    statusCode: 200,
    body: mockBrandKitResponse.paletteTokens
  }).as('savePalette');

  cy.intercept('GET', '**/api/stores/*/brand/assets', {
    statusCode: 200,
    body: {
      assets: mockBrandKitResponse.assets,
      paletteTokens: mockBrandKitResponse.paletteTokens
    }
  }).as('getBrandAssets');
}

