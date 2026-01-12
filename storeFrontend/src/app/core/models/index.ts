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
  logoUrl?: string;
  bannerUrl?: string;
  status: StoreStatus;
  userId: number;
  ownerId?: number;
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
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// Rollen und Berechtigungen für Shops und Domains
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',        // Kann alles
  STORE_OWNER = 'STORE_OWNER',        // Besitzer eines Shops
  STORE_ADMIN = 'STORE_ADMIN',        // Administrator eines Shops
  STORE_MANAGER = 'STORE_MANAGER',    // Manager eines Shops
  STORE_STAFF = 'STORE_STAFF',        // Mitarbeiter eines Shops
  CUSTOMER = 'CUSTOMER'                // Kunde
}

export enum Permission {
  // Store Berechtigungen
  STORE_CREATE = 'STORE_CREATE',
  STORE_READ = 'STORE_READ',
  STORE_UPDATE = 'STORE_UPDATE',
  STORE_DELETE = 'STORE_DELETE',
  STORE_MANAGE_SETTINGS = 'STORE_MANAGE_SETTINGS',

  // Domain Berechtigungen
  DOMAIN_CREATE = 'DOMAIN_CREATE',
  DOMAIN_READ = 'DOMAIN_READ',
  DOMAIN_UPDATE = 'DOMAIN_UPDATE',
  DOMAIN_DELETE = 'DOMAIN_DELETE',
  DOMAIN_VERIFY = 'DOMAIN_VERIFY',

  // Produkt Berechtigungen
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_READ = 'PRODUCT_READ',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',

  // Kategorie Berechtigungen
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_READ = 'CATEGORY_READ',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',

  // Bestellungen Berechtigungen
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_READ = 'ORDER_READ',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_DELETE = 'ORDER_DELETE',
  ORDER_MANAGE = 'ORDER_MANAGE',

  // Mitarbeiter Berechtigungen
  STAFF_CREATE = 'STAFF_CREATE',
  STAFF_READ = 'STAFF_READ',
  STAFF_UPDATE = 'STAFF_UPDATE',
  STAFF_DELETE = 'STAFF_DELETE',

  // Media Berechtigungen
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  MEDIA_READ = 'MEDIA_READ',
  MEDIA_DELETE = 'MEDIA_DELETE'
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface StoreRole {
  id: number;
  userId: number;
  storeId: number;
  role: UserRole;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface DomainAccess {
  id: number;
  userId: number;
  domainId: number;
  role: UserRole;
  canManage: boolean;
  canVerify: boolean;
  createdAt: string;
}

export interface StoreWithRoles extends Store {
  userRole?: UserRole;
  userPermissions?: Permission[];
  domains?: Domain[];
}

// Rollen-Mapping: Welche Rolle hat welche Berechtigungen
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // Alle Berechtigungen
    Permission.STORE_CREATE,
    Permission.STORE_READ,
    Permission.STORE_UPDATE,
    Permission.STORE_DELETE,
    Permission.STORE_MANAGE_SETTINGS,
    Permission.DOMAIN_CREATE,
    Permission.DOMAIN_READ,
    Permission.DOMAIN_UPDATE,
    Permission.DOMAIN_DELETE,
    Permission.DOMAIN_VERIFY,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_DELETE,
    Permission.ORDER_MANAGE,
    Permission.STAFF_CREATE,
    Permission.STAFF_READ,
    Permission.STAFF_UPDATE,
    Permission.STAFF_DELETE,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_READ,
    Permission.MEDIA_DELETE
  ],
  [UserRole.STORE_OWNER]: [
    // Volle Kontrolle über eigenen Shop
    Permission.STORE_READ,
    Permission.STORE_UPDATE,
    Permission.STORE_DELETE,
    Permission.STORE_MANAGE_SETTINGS,
    Permission.DOMAIN_CREATE,
    Permission.DOMAIN_READ,
    Permission.DOMAIN_UPDATE,
    Permission.DOMAIN_DELETE,
    Permission.DOMAIN_VERIFY,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_MANAGE,
    Permission.STAFF_CREATE,
    Permission.STAFF_READ,
    Permission.STAFF_UPDATE,
    Permission.STAFF_DELETE,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_READ,
    Permission.MEDIA_DELETE
  ],
  [UserRole.STORE_ADMIN]: [
    // Fast alle Berechtigungen außer Shop löschen
    Permission.STORE_READ,
    Permission.STORE_UPDATE,
    Permission.STORE_MANAGE_SETTINGS,
    Permission.DOMAIN_CREATE,
    Permission.DOMAIN_READ,
    Permission.DOMAIN_UPDATE,
    Permission.DOMAIN_VERIFY,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_MANAGE,
    Permission.STAFF_READ,
    Permission.STAFF_UPDATE,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_READ,
    Permission.MEDIA_DELETE
  ],
  [UserRole.STORE_MANAGER]: [
    // Produkt- und Bestellverwaltung
    Permission.STORE_READ,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_READ
  ],
  [UserRole.STORE_STAFF]: [
    // Nur Lesen und Bestellungen bearbeiten
    Permission.STORE_READ,
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.MEDIA_READ
  ],
  [UserRole.CUSTOMER]: [
    // Nur Lesen im Shop
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.ORDER_CREATE
  ]
};

// Theme System Types
export enum ThemeType {
  MODERN = 'MODERN',
  CLASSIC = 'CLASSIC',
  MINIMAL = 'MINIMAL',
  ELEGANT = 'ELEGANT',
  DARK = 'DARK'
}

export enum ShopTemplate {
  ELECTRONICS = 'ELECTRONICS',
  FASHION = 'FASHION',
  FOOD = 'FOOD',
  BEAUTY = 'BEAUTY',
  GENERAL = 'GENERAL'
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFontFamily: string;
  fontSize: {
    small: string;
    base: string;
    large: string;
    xl: string;
    xxl: string;
  };
}

export interface ThemeLayout {
  headerStyle: string;
  footerStyle: string;
  productGridColumns: number;
  borderRadius: string;
  spacing: string;
}

export interface StoreTheme {
  id: number;
  storeId: number;
  name: string;
  type: ThemeType;
  template: ShopTemplate;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  customCss?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThemePreset {
  type: ThemeType;
  name: string;
  description: string;
  preview: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

export interface CreateThemeRequest {
  storeId: number;
  name: string;
  type: ThemeType;
  template: ShopTemplate;
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  layout?: Partial<ThemeLayout>;
  customCss?: string;
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
