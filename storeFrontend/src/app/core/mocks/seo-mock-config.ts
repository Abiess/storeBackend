/**
 * Mock Mode Configuration for SEO Module
 *
 * Enables testing of SEO features without a running backend.
 * All API calls are intercepted and served from in-memory mock data.
 */

export const SEO_MOCK_CONFIG = {
  enabled: true, // Set to false to use real backend
  delay: 500, // Simulated network delay in milliseconds

  // Mock stores
  stores: [
    {
      id: 1,
      name: 'Demo Shop',
      domain: 'demo-shop.markt.ma',
      slug: 'demo-shop'
    },
    {
      id: 2,
      name: 'Test Store',
      domain: 'test-store.markt.ma',
      slug: 'test-store'
    }
  ],

  // Mock products for testing structured data
  products: [
    {
      id: 1,
      title: 'Premium Hoodie',
      description: 'Ein super bequemer Hoodie aus Bio-Baumwolle',
      sku: 'HOO-001',
      price: 49.99,
      currency: 'EUR',
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      availability: 'InStock',
      slug: 'premium-hoodie'
    },
    {
      id: 2,
      title: 'Designer T-Shirt',
      description: 'Stylisches T-Shirt mit einzigartigem Design',
      sku: 'TSH-002',
      price: 29.99,
      currency: 'EUR',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      availability: 'InStock',
      slug: 'designer-tshirt'
    }
  ],

  // Sample context data for template rendering
  sampleContexts: {
    PRODUCT: {
      product: {
        title: 'Cool Hoodie',
        description: 'Ein super bequemer Hoodie',
        sku: 'HOO-001',
        imageUrl: 'https://example.com/hoodie.jpg'
      },
      price: '49.99',
      currency: 'EUR',
      availability: 'InStock',
      absoluteUrl: 'https://demo-shop.markt.ma/products/cool-hoodie',
      store: {
        siteName: 'Demo Shop'
      }
    },
    ORGANIZATION: {
      store: {
        siteName: 'Demo Shop',
        url: 'https://demo-shop.markt.ma',
        logoUrl: 'https://demo-shop.markt.ma/logo.png'
      },
      social: {
        facebook: 'https://facebook.com/demoshop',
        instagram: 'https://instagram.com/demoshop',
        twitter: 'https://twitter.com/demoshop'
      }
    },
    BREADCRUMB: {
      breadcrumbs: [
        { position: 1, name: 'Home', url: 'https://demo-shop.markt.ma', last: false },
        { position: 2, name: 'Kategorie', url: 'https://demo-shop.markt.ma/category', last: false },
        { position: 3, name: 'Produkt', url: 'https://demo-shop.markt.ma/product', last: true }
      ]
    },
    ARTICLE: {
      article: {
        title: 'Blogpost Titel',
        description: 'Eine spannende Geschichte',
        author: 'Max Mustermann',
        publishedDate: '2025-01-14',
        imageUrl: 'https://example.com/blog-post.jpg'
      },
      absoluteUrl: 'https://demo-shop.markt.ma/blog/post'
    },
    COLLECTION: {
      collection: {
        title: 'Sommer Kollektion',
        description: 'Unsere besten Sommerprodukte',
        imageUrl: 'https://example.com/collection.jpg'
      },
      absoluteUrl: 'https://demo-shop.markt.ma/collections/summer'
    }
  },

  // Mock error scenarios for testing
  errorScenarios: {
    uploadFailed: false,
    importFailed: false,
    networkError: false
  }
};

/**
 * Helper function to check if mock mode is enabled.
 */
export function isMockMode(): boolean {
  return SEO_MOCK_CONFIG.enabled;
}

/**
 * Helper function to get mock delay.
 */
export function getMockDelay(): number {
  return SEO_MOCK_CONFIG.delay;
}

