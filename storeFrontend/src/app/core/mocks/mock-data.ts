// Mock Data für Testing ohne Backend
import {
  User,
  Store,
  Product,
  Order,
  Category,
  Media,
  ProductStatus,
  OrderStatus,
  StoreStatus,
  DomainType,
  Domain,
  Role,
  MediaType
} from '../models';
import { MOCK_STORE3_PRODUCTS } from './mock-store3-products';

export const MOCK_USER: User = {
  id: 1,
  email: 'demo@markt.ma',
  name: 'Demo User',
  roles: [Role.STORE_OWNER],
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00'
};

export const MOCK_STORES: Store[] = [
  {
    id: 1,
    name: 'TechShop Demo',
    slug: 'techshop',
    status: StoreStatus.ACTIVE,
    ownerId: 1,
    userId: 1,
    createdAt: '2024-01-15T10:30:00',
    updatedAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    name: 'Fashion Store',
    slug: 'fashion',
    status: StoreStatus.ACTIVE,
    ownerId: 1, userId: 1,
    createdAt: '2024-02-01T14:20:00',
    updatedAt: '2024-02-01T14:20:00'
  },
  {
    id: 3,
    name: 'Food & Drinks',
    slug: 'fooddrinks',
    status: StoreStatus.INACTIVE,
    ownerId: 1, userId: 1,
    createdAt: '2024-03-10T09:15:00',
    updatedAt: '2024-03-10T09:15:00'
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    storeId: 1,
    name: 'Premium Laptop',
    title: 'Premium Laptop',
    description: 'High-performance laptop mit 16GB RAM und 512GB SSD',
    price: 1299.99,
    basePrice: 1299.99,
    stock: 23,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-01-20T11:00:00',
    updatedAt: '2024-01-20T11:00:00',
    variants: [
      {
        id: 1,
        name: 'Silver 512GB',
        sku: 'LAPTOP-001-SILVER', productId: 1,
        price: 1299.99,
        stock: 15,
        stockQuantity: 15,
        attributesJson: JSON.stringify({ color: 'Silver', storage: '512GB' })
      },
      {
        id: 2,
        name: 'Black 512GB',
        sku: 'LAPTOP-001-BLACK', productId: 1,
        price: 1299.99,
        stock: 8,
        stockQuantity: 8,
        attributesJson: JSON.stringify({ color: 'Black', storage: '512GB' })
      }
    ]
  },
  {
    id: 2,
    storeId: 1,
    name: 'Wireless Mouse',
    title: 'Wireless Mouse',
    description: 'Ergonomische kabellose Maus mit 5 Tasten',
    price: 29.99,
    basePrice: 29.99,
    stock: 50,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-01-22T14:30:00',
    updatedAt: '2024-01-22T14:30:00',
    variants: [
      {
        id: 3,
        name: 'Black',
        sku: 'MOUSE-002-BLACK', productId: 2,
        price: 29.99,
        stock: 50,
        stockQuantity: 50,
        attributesJson: JSON.stringify({ color: 'Black' })
      }
    ]
  },
  {
    id: 3,
    storeId: 1,
    name: 'Draft Product',
    title: 'Draft Product',
    description: '2m langes USB-C zu USB-C Kabel, schnellladefähig',
    price: 14.99,
    basePrice: 14.99,
    stock: 0,
    status: ProductStatus.DRAFT,
    createdAt: '2024-02-05T09:00:00',
    updatedAt: '2024-02-05T09:00:00',
    variants: []
  },
  {
    id: 4,
    storeId: 1,
    name: 'Bluetooth Headphones',
    title: 'Bluetooth Headphones',
    description: 'Over-Ear Kopfhörer mit Active Noise Cancelling',
    price: 199.99,
    basePrice: 199.99,
    stock: 45,
    status: ProductStatus.PUBLISHED,
    createdAt: '2024-02-10T16:45:00',
    updatedAt: '2024-02-10T16:45:00',
    variants: [
      {
        id: 4,
        name: 'White',
        sku: 'HEADPHONE-004-WHITE', productId: 4,
        price: 199.99,
        stock: 20,
        stockQuantity: 20,
        attributesJson: JSON.stringify({ color: 'White' })
      },
      {
        id: 5,
        name: 'Black',
        sku: 'HEADPHONE-004-BLACK', productId: 4,
        price: 199.99,
        stock: 25,
        stockQuantity: 25,
        attributesJson: JSON.stringify({ color: 'Black' })
      }
    ]
  },
  // Produkte für Store 3 (Food & Drinks) hinzufügen
  ...MOCK_STORE3_PRODUCTS
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    orderNumber: 'ORD-2025-01000',
    storeId: 1,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: OrderStatus.CONFIRMED,
    totalAmount: 1329.98,
    shippingAddress: {
      firstName: 'Max',
      lastName: 'Mustermann',
      address1: 'Musterstraße 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Deutschland',
      phone: '+49 30 12345678'
    },
    billingAddress: {
      firstName: 'Max',
      lastName: 'Mustermann',
      address1: 'Musterstraße 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Deutschland'
    },
    notes: 'Bitte vor der Tür abstellen',
    createdAt: '2024-03-01T10:30:00',
    updatedAt: '2024-03-01T10:30:00',
    items: [
      {
        id: 1,
        variantId: 1,
        quantity: 1, orderId: 1, productId: 1, price: 29.99, totalPrice: 29.99,
        priceAtOrder: 1299.99,
        productTitle: 'Premium Laptop',
        variantSku: 'LAPTOP-001-SILVER'
      },
      {
        id: 2,
        variantId: 3,
        quantity: 1, orderId: 1, productId: 1, price: 29.99, totalPrice: 29.99,
        priceAtOrder: 29.99,
        productTitle: 'Wireless Mouse',
        variantSku: 'MOUSE-002-BLACK'
      }
    ]
  },
  {
    id: 2,
    orderNumber: 'ORD-2025-01001',
    storeId: 1,
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: OrderStatus.SHIPPED,
    totalAmount: 199.99,
    shippingAddress: {
      firstName: 'Anna',
      lastName: 'Schmidt',
      address1: 'Hauptstraße 45',
      city: 'München',
      postalCode: '80331',
      country: 'Deutschland',
      phone: '+49 89 98765432'
    },
    billingAddress: {
      firstName: 'Anna',
      lastName: 'Schmidt',
      address1: 'Hauptstraße 45',
      city: 'München',
      postalCode: '80331',
      country: 'Deutschland'
    },
    createdAt: '2024-03-05T14:15:00',
    updatedAt: '2024-03-06T09:20:00',
    items: [
      {
        id: 3,
        variantId: 4,
        quantity: 1, orderId: 1, productId: 1, price: 29.99, totalPrice: 29.99,
        priceAtOrder: 199.99,
        productTitle: 'Bluetooth Kopfhörer',
        variantSku: 'HEADPHONE-004-WHITE'
      }
    ]
  },
  {
    id: 3,
    orderNumber: 'ORD-2025-01002',
    storeId: 1,
    customerName: 'Bob Wilson',
    customerEmail: 'bob@example.com',
    status: OrderStatus.PENDING,
    totalAmount: 29.99,
    shippingAddress: {
      firstName: 'Thomas',
      lastName: 'Weber',
      address1: 'Gartenweg 7',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'Deutschland'
    },
    billingAddress: {
      firstName: 'Thomas',
      lastName: 'Weber',
      address1: 'Gartenweg 7',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'Deutschland'
    },
    createdAt: '2024-03-11T16:00:00',
    updatedAt: '2024-03-11T16:00:00',
    items: [
      {
        id: 4,
        variantId: 3,
        quantity: 2, orderId: 1, productId: 1, price: 29.99, totalPrice: 29.99,
        priceAtOrder: 29.99,
        productTitle: 'Wireless Mouse',
        variantSku: 'MOUSE-002-BLACK'
      }
    ]
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    storeId: 1,
    name: 'إلكترونيات',
    slug: 'electronics',
    description: 'Alle elektronischen Geräte',
    sortOrder: 1,
    createdAt: '2024-01-15T10:30:00',
    updatedAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    storeId: 1,
    name: 'أجهزة الكمبيوتر',
    slug: 'computers',
    description: 'Laptops, PCs und Zubehör',
    parentId: 1,
    sortOrder: 1,
    createdAt: '2024-01-15T10:31:00',
    updatedAt: '2024-01-15T10:31:00'
  },
  {
    id: 3,
    storeId: 1,
    name: 'الملحقات',
    slug: 'accessories',
    description: 'Kopfhörer, Lautsprecher und mehr',
    parentId: 1,
    sortOrder: 2,
    createdAt: '2024-01-15T10:32:00',
    updatedAt: '2024-01-15T10:32:00'
  }
];

export const MOCK_MEDIA: Media[] = [
  {
    id: 1,
    storeId: 1,
    filename: 'laptop-image.jpg',
    originalFilename: 'laptop-image.jpg',
    url: '/assets/images/laptop.jpg',
    size: 150000,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-01-20T11:00:00'
  },
  {
    id: 2,
    storeId: 1,
    filename: 'mouse-image.jpg',
    originalFilename: 'mouse-image.jpg',
    url: '/assets/images/mouse.jpg',
    size: 85000,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-01-22T14:30:00'
  },
  {
    id: 3,
    storeId: 1,
    filename: 'headphones-image.jpg',
    originalFilename: 'headphones-image.jpg',
    url: '/assets/images/headphones.jpg',
    size: 120000,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-02-10T16:45:00'
  }
];

export const MOCK_DOMAINS: Domain[] = [
  {
    id: 1,
    storeId: 1,
    domain: 'demo-store.markt.ma',
    host: 'demo-store.markt.ma',
    type: DomainType.SUBDOMAIN,
    isPrimary: true,
    isVerified: true,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    storeId: 1,
    domain: 'my-custom-store.com',
    host: 'my-custom-store.com',
    type: DomainType.CUSTOM,
    isPrimary: false,
    isVerified: false,
    createdAt: '2024-01-16T14:30:00Z'
  }
];
