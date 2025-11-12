// User Model
export interface User {
  id: number;
  email: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// Auth Models
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Plan Model
export interface Plan {
  id: number;
  name: string;
  maxStores: number;
  maxCustomDomains: number;
  maxSubdomains: number;
  maxStorageMb: number;
  maxProducts: number;
  maxImageCount?: number;
}

// Store Models
export interface Store {
  id: number;
  name: string;
  slug: string;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_DOMAIN_VERIFICATION = 'PENDING_DOMAIN_VERIFICATION'
}

export interface CreateStoreRequest {
  name: string;
  slug: string;
}

// Domain Models
export interface Domain {
  id: number;
  host: string;
  type: DomainType;
  isPrimary: boolean;
  isVerified: boolean;
  verificationToken?: string;
  createdAt: string;
}

export enum DomainType {
  SUBDOMAIN = 'SUBDOMAIN',
  CUSTOM = 'CUSTOM'
}

export interface CreateDomainRequest {
  host: string;
  type: DomainType;
  isPrimary?: boolean;
}

// Product Models
export interface Product {
  id: number;
  title: string;
  description: string;
  basePrice: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  categories?: Category[];
  media?: ProductMedia[];
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface ProductVariant {
  id: number;
  sku: string;
  price: number;
  stockQuantity: number;
  attributesJson: string;
}

export interface CreateProductRequest {
  title: string;
  description: string;
  basePrice: number;
  status?: ProductStatus;
}

// Category Models
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}

// Media Models
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

export interface ProductMedia {
  id: number;
  mediaId: number;
  isPrimary: boolean;
  sortOrder: number;
  media?: Media;
}

// Order Models
export interface Order {
  id: number;
  orderNumber: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  id: number;
  variantId: number;
  quantity: number;
  priceAtOrder: number;
  productTitle: string;
  variantSku: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutRequest {
  sessionId: string;
  storeId: number;
  customerEmail: string;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
}

// Cart Models
export interface Cart {
  id: number;
  sessionId: string;
  storeId: number;
  items: CartItem[];
  totalAmount: number;
}

export interface CartItem {
  id: number;
  variantId: number;
  quantity: number;
  price: number;
  productTitle: string;
  variantSku: string;
}

export interface AddToCartRequest {
  sessionId: string;
  storeId: number;
  variantId: number;
  quantity: number;
}

// Public Store Models
export interface PublicStore {
  storeId: number;
  name: string;
  slug: string;
  primaryDomain: string;
  status: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

