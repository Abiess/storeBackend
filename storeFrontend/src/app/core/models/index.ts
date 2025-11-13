export interface Cart {
  items: any[];
  total: number;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

export interface CheckoutRequest {
  sessionId: string;
  address: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  customerEmail: string;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items?: any[];
}

export interface PublicStore {
  id: number;
  name: string;
  domain: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  title: string;
  description: string;
  price: number;
  basePrice: number;
  imageUrl?: string;
  stock: number;
  status: string;
  categoryId?: number;
  categories?: Category[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: number;
  name: string;
  price: number;
  stock: number;
  stockQuantity?: number;
  sku?: string;
  attributesJson?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Domain {
  id: number;
  domain: string;
  host: string;
  type: DomainType;
  verified: boolean;
  isVerified: boolean;
  isPrimary: boolean;
  storeId: number;
  createdAt: string;
  verificationToken?: string;
}

export enum DomainType {
  SUBDOMAIN = 'SUBDOMAIN',
  CUSTOM = 'CUSTOM'
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status: StoreStatus;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface CreateStoreRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateProductRequest {
  name: string;
  title: string;
  description: string;
  price: number;
  basePrice: number;
  stock: number;
  categoryId?: number;
  imageUrl?: string;
  status?: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}

export interface CreateDomainRequest {
  domain: string;
  host?: string;
  type: DomainType;
  storeId: number;
  isPrimary?: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Media {
  id: number;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  type: MediaType;
  createdAt: string;
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT'
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
