// Mock Data für Testing ohne Backend
import {
  User,
  Store,
  Product,
  Order,
  Domain,
  Category,
  Media,
  StoreStatus,
  ProductStatus,
  OrderStatus,
  DomainType,
  MediaType
} from '../models';

export const MOCK_USER: User = {
  id: 1,
  email: 'demo@markt.ma',
  roles: ['ROLE_STORE_OWNER'],
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00'
};

export const MOCK_STORES: Store[] = [
  {
    id: 1,
    name: 'TechShop Demo',
    slug: 'techshop',
    status: StoreStatus.ACTIVE,
    createdAt: '2024-01-15T10:30:00',
    updatedAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    name: 'Fashion Store',
    slug: 'fashion',
    status: StoreStatus.ACTIVE,
    createdAt: '2024-02-01T14:20:00',
    updatedAt: '2024-02-01T14:20:00'
  },
  {
    id: 3,
    name: 'Food & Drinks',
    slug: 'fooddrinks',
    status: StoreStatus.PENDING_DOMAIN_VERIFICATION,
    createdAt: '2024-03-10T09:15:00',
    updatedAt: '2024-03-10T09:15:00'
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    title: 'Premium Laptop',
    description: 'High-performance laptop mit 16GB RAM und 512GB SSD',
    basePrice: 1299.99,
    status: ProductStatus.ACTIVE,
    createdAt: '2024-01-20T11:00:00',
    updatedAt: '2024-01-20T11:00:00',
    variants: [
      {
        id: 1,
        sku: 'LAPTOP-001-SILVER',
        price: 1299.99,
        stockQuantity: 15,
        attributesJson: JSON.stringify({ color: 'Silver', storage: '512GB' })
      },
      {
        id: 2,
        sku: 'LAPTOP-001-BLACK',
        price: 1299.99,
        stockQuantity: 8,
        attributesJson: JSON.stringify({ color: 'Black', storage: '512GB' })
      }
    ]
  },
  {
    id: 2,
    title: 'Wireless Mouse',
    description: 'Ergonomische kabellose Maus mit 5 Tasten',
    basePrice: 29.99,
    status: ProductStatus.ACTIVE,
    createdAt: '2024-01-22T14:30:00',
    updatedAt: '2024-01-22T14:30:00',
    variants: [
      {
        id: 3,
        sku: 'MOUSE-002-BLACK',
        price: 29.99,
        stockQuantity: 50,
        attributesJson: JSON.stringify({ color: 'Black' })
      }
    ]
  },
  {
    id: 3,
    title: 'USB-C Kabel',
    description: '2m langes USB-C zu USB-C Kabel, schnellladefähig',
    basePrice: 14.99,
    status: ProductStatus.DRAFT,
    createdAt: '2024-02-05T09:00:00',
    updatedAt: '2024-02-05T09:00:00',
    variants: []
  },
  {
    id: 4,
    title: 'Bluetooth Kopfhörer',
    description: 'Over-Ear Kopfhörer mit Active Noise Cancelling',
    basePrice: 199.99,
    status: ProductStatus.ACTIVE,
    createdAt: '2024-02-10T16:45:00',
    updatedAt: '2024-02-10T16:45:00',
    variants: [
      {
        id: 4,
        sku: 'HEADPHONE-004-WHITE',
        price: 199.99,
        stockQuantity: 20,
        attributesJson: JSON.stringify({ color: 'White' })
      },
      {
        id: 5,
        sku: 'HEADPHONE-004-BLACK',
        price: 199.99,
        stockQuantity: 25,
        attributesJson: JSON.stringify({ color: 'Black' })
      }
    ]
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    orderNumber: 'ORD-2024-0001',
    customerEmail: 'kunde1@example.com',
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
        quantity: 1,
        priceAtOrder: 1299.99,
        productTitle: 'Premium Laptop',
        variantSku: 'LAPTOP-001-SILVER'
      },
      {
        id: 2,
        variantId: 3,
        quantity: 1,
        priceAtOrder: 29.99,
        productTitle: 'Wireless Mouse',
        variantSku: 'MOUSE-002-BLACK'
      }
    ]
  },
  {
    id: 2,
    orderNumber: 'ORD-2024-0002',
    customerEmail: 'kunde2@example.com',
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
        quantity: 1,
        priceAtOrder: 199.99,
        productTitle: 'Bluetooth Kopfhörer',
        variantSku: 'HEADPHONE-004-WHITE'
      }
    ]
  },
  {
    id: 3,
    orderNumber: 'ORD-2024-0003',
    customerEmail: 'kunde3@example.com',
    status: OrderStatus.PENDING,
    totalAmount: 59.98,
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
        quantity: 2,
        priceAtOrder: 29.99,
        productTitle: 'Wireless Mouse',
        variantSku: 'MOUSE-002-BLACK'
      }
    ]
  }
];

export const MOCK_DOMAINS: Domain[] = [
  {
    id: 1,
    host: 'techshop.markt.ma',
    type: DomainType.SUBDOMAIN,
    isPrimary: true,
    isVerified: true,
    createdAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    host: 'shop.techexample.com',
    type: DomainType.CUSTOM,
    isPrimary: false,
    isVerified: false,
    verificationToken: 'markt-verify-abc123def456',
    createdAt: '2024-02-20T11:00:00'
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    name: 'Elektronik',
    slug: 'elektronik',
    description: 'Alle elektronischen Geräte',
    sortOrder: 1,
    createdAt: '2024-01-15T10:30:00',
    updatedAt: '2024-01-15T10:30:00'
  },
  {
    id: 2,
    name: 'Computer & Zubehör',
    slug: 'computer-zubehoer',
    description: 'Laptops, PCs und Zubehör',
    parentId: 1,
    sortOrder: 1,
    createdAt: '2024-01-15T10:31:00',
    updatedAt: '2024-01-15T10:31:00'
  },
  {
    id: 3,
    name: 'Audio',
    slug: 'audio',
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
    filename: 'laptop-silver.jpg',
    url: 'https://via.placeholder.com/800x600/silver/000000?text=Laptop+Silver',
    size: 245678,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-01-20T11:00:00'
  },
  {
    id: 2,
    filename: 'mouse-black.jpg',
    url: 'https://via.placeholder.com/800x600/black/ffffff?text=Wireless+Mouse',
    size: 189234,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-01-22T14:30:00'
  },
  {
    id: 3,
    filename: 'headphones-white.jpg',
    url: 'https://via.placeholder.com/800x600/white/000000?text=Headphones',
    size: 312456,
    mimeType: 'image/jpeg',
    type: MediaType.IMAGE,
    createdAt: '2024-02-10T16:45:00'
  }
];

