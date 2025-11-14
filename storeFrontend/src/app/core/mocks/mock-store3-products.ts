// Zusätzliche Mock-Produkte für Store 3 (Food & Drinks)
import { Product, ProductStatus } from '../models';

export const MOCK_STORE3_PRODUCTS: Product[] = [
  {
    id: 5,
    storeId: 3,
    name: 'Bio Kaffee Premium',
    title: 'Bio Kaffee Premium',
    description: 'Hochwertiger Bio-Kaffee aus fairem Handel, 100% Arabica Bohnen',
    price: 12.99,
    basePrice: 12.99,
    stock: 100,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T10:00:00',
    updatedAt: '2024-03-10T10:00:00',
    variants: [
      {
        id: 6,
        name: '250g',
        sku: 'COFFEE-001-250',
        productId: 5,
        price: 12.99,
        stock: 50,
        stockQuantity: 50,
        attributesJson: JSON.stringify({ weight: '250g' })
      },
      {
        id: 7,
        name: '500g',
        sku: 'COFFEE-001-500',
        productId: 5,
        price: 22.99,
        stock: 50,
        stockQuantity: 50,
        attributesJson: JSON.stringify({ weight: '500g' })
      }
    ]
  },
  {
    id: 6,
    storeId: 3,
    name: 'Craft Beer Sortiment',
    title: 'Craft Beer Sortiment',
    description: 'Auswahl an regionalen Craft-Bieren, 6er Pack',
    price: 18.99,
    basePrice: 18.99,
    stock: 45,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T10:30:00',
    updatedAt: '2024-03-10T10:30:00',
    variants: [
      {
        id: 8,
        name: '6x 0.33L',
        sku: 'BEER-002-6PACK',
        productId: 6,
        price: 18.99,
        stock: 45,
        stockQuantity: 45,
        attributesJson: JSON.stringify({ pack: '6x 0.33L' })
      }
    ]
  },
  {
    id: 7,
    storeId: 3,
    name: 'Bio Honig Regional',
    title: 'Bio Honig Regional',
    description: 'Naturbelassener Honig von lokalen Imkern',
    price: 8.49,
    basePrice: 8.49,
    stock: 80,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T11:00:00',
    updatedAt: '2024-03-10T11:00:00',
    variants: [
      {
        id: 9,
        name: '250g Glas',
        sku: 'HONEY-003-250',
        productId: 7,
        price: 8.49,
        stock: 80,
        stockQuantity: 80,
        attributesJson: JSON.stringify({ weight: '250g', container: 'Glas' })
      }
    ]
  },
  {
    id: 8,
    storeId: 3,
    name: 'Premium Olivenoel',
    title: 'Premium Olivenoel',
    description: 'Extra natives Olivenoel aus Italien, kaltgepresst',
    price: 15.99,
    basePrice: 15.99,
    stock: 60,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T11:30:00',
    updatedAt: '2024-03-10T11:30:00',
    variants: [
      {
        id: 10,
        name: '500ml',
        sku: 'OIL-004-500',
        productId: 8,
        price: 15.99,
        stock: 60,
        stockQuantity: 60,
        attributesJson: JSON.stringify({ volume: '500ml' })
      }
    ]
  },
  {
    id: 9,
    storeId: 3,
    name: 'Handgemachte Pasta',
    title: 'Handgemachte Pasta',
    description: 'Frische Pasta nach traditionellem Rezept',
    price: 6.99,
    basePrice: 6.99,
    stock: 120,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T12:00:00',
    updatedAt: '2024-03-10T12:00:00',
    variants: [
      {
        id: 11,
        name: 'Tagliatelle 400g',
        sku: 'PASTA-005-TAG',
        productId: 9,
        price: 6.99,
        stock: 60,
        stockQuantity: 60,
        attributesJson: JSON.stringify({ type: 'Tagliatelle', weight: '400g' })
      },
      {
        id: 12,
        name: 'Penne 400g',
        sku: 'PASTA-005-PEN',
        productId: 9,
        price: 6.99,
        stock: 60,
        stockQuantity: 60,
        attributesJson: JSON.stringify({ type: 'Penne', weight: '400g' })
      }
    ]
  },
  {
    id: 10,
    storeId: 3,
    name: 'Bio Schokolade',
    title: 'Bio Schokolade',
    description: 'Feinste Schokolade aus nachhaltigem Kakaoanbau',
    price: 4.99,
    basePrice: 4.99,
    stock: 150,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-03-10T12:30:00',
    updatedAt: '2024-03-10T12:30:00',
    variants: [
      {
        id: 13,
        name: 'Zartbitter 70%',
        sku: 'CHOCO-006-DARK',
        productId: 10,
        price: 4.99,
        stock: 75,
        stockQuantity: 75,
        attributesJson: JSON.stringify({ type: 'Zartbitter', cocoa: '70%' })
      },
      {
        id: 14,
        name: 'Vollmilch',
        sku: 'CHOCO-006-MILK',
        productId: 10,
        price: 4.99,
        stock: 75,
        stockQuantity: 75,
        attributesJson: JSON.stringify({ type: 'Vollmilch' })
      }
    ]
  }
];

