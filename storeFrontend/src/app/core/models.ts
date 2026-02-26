// ============================================
// USER & AUTH
// ============================================
export interface User {
  id: number;
  email: string;
  name?: string;
  roles: Role[];
  plan?: PlanDetails; // FIXED: Changed from Plan enum to PlanDetails interface
  createdAt: string;
  updatedAt: string;
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
}

// ============================================
// ADDRESS
// ============================================
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

// ============================================
// ROLES & PERMISSIONS
// ============================================
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
  STORE_MANAGER = 'STORE_MANAGER',
  STORE_EMPLOYEE = 'STORE_EMPLOYEE',
  CUSTOMER = 'CUSTOMER'
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
  STORE_ADMIN = 'STORE_ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  STORE_STAFF = 'STORE_STAFF',
  STORE_EMPLOYEE = 'STORE_EMPLOYEE',
  CUSTOMER = 'CUSTOMER'
}

export enum Permission {
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_EDIT = 'PRODUCT_EDIT',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  ORDER_VIEW = 'ORDER_VIEW',
  ORDER_MANAGE = 'ORDER_MANAGE',
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  CUSTOMER_MANAGE = 'CUSTOMER_MANAGE',
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_EDIT = 'SETTINGS_EDIT',
  REPORTS_VIEW = 'REPORTS_VIEW',
  DOMAIN_MANAGE = 'DOMAIN_MANAGE',
  DOMAIN_VERIFY = 'DOMAIN_VERIFY',
  STORE_MANAGE = 'STORE_MANAGE',
  STORE_DELETE = 'STORE_DELETE'
}

export interface UserRoleInterface {
  userId: number;
  role: string;
}

export type PermissionType = string;

export interface StoreRole {
  userId: number;
  storeId: number;
  role: string;
  permissions: string[];
}

export interface DomainRole {
  userId: number;
  domainId: number;
  role: string;
  permissions: string[];
}

// ============================================
// DOMAIN
// ============================================
export interface Domain {
  id: number;
  storeId: number;
  domain?: string;
  host: string;
  type: DomainType;
  isPrimary: boolean;
  isVerified: boolean;
  verified?: boolean;
  verificationToken?: string;
  createdAt: string;
}

export enum DomainType {
  SUBDOMAIN = 'SUBDOMAIN',
  CUSTOM = 'CUSTOM'
}

export interface CreateDomainRequest {
  storeId: number;
  domain?: string;
  host?: string;
  type: DomainType;
  isPrimary?: boolean;
}

// ============================================
// CATEGORY
// ============================================
export interface Category {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  storeId: number;
  name: string;
  slug?: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}

// ============================================
// PRODUCT
// ============================================
export interface Product {
  id: number;
  storeId: number;
  name?: string;
  title: string;
  sku?: string;
  description?: string;
  price?: number;
  basePrice: number;
  stock?: number;
  status: ProductStatus;
  categoryId?: number;
  categoryName?: string;
  category?: Category;
  categories?: Category[];
  variants?: ProductVariant[];
  media?: ProductMedia[];
  imageUrl?: string;
  primaryImageUrl?: string; // Haupt-Bild URL

  // Featured/Top Product Felder
  isFeatured?: boolean;
  featuredOrder?: number;
  viewCount?: number;
  salesCount?: number;

  createdAt: string;
  updatedAt: string;
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface ProductVariant {
  id: number;
  productId: number;
  name?: string;
  sku: string;
  price: number;
  stock: number;
  stockQuantity: number; // Required for inventory management
  attributesJson?: string;
  attributes?: { [key: string]: string }; // Parsed attributes for UI
  options?: ProductOption[];
}

export interface CreateProductRequest {
  storeId: number;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  stock?: number;
  status?: ProductStatus;
  categoryId?: number;
  isFeatured?: boolean;
  featuredOrder?: number;
}

// ============================================
// ORDER
// ============================================
export interface Order {
  id: number;
  orderNumber?: string;
  storeId: number;
  customerId?: number;
  customer?: User;
  status: OrderStatus;
  totalAmount: number;
  customerEmail: string;
  customerName: string;
  shippingAddress?: Address | string;
  billingAddress?: Address | string;
  notes?: string;
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product?: Product;
  variantId?: number;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  priceAtOrder?: number;
  totalPrice: number;
  productTitle?: string;
  variantSku?: string;
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

// ============================================
// CART
// ============================================
export interface Cart {
  id: number;
  storeId: number;
  sessionId: string;
  customerId?: number;
  items?: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  product?: Product;
  variantId?: number;
  variant?: ProductVariant;
  quantity: number;
}

// ============================================
// MEDIA
// ============================================
export interface Media {
  id: number;
  storeId: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  type?: string;
  createdAt: string;
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO'
}

// ============================================
// PLAN
// ============================================
export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export interface PlanDetails {
  plan: Plan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeatures;
  popular?: boolean;
}

export interface PlanFeatures {
  maxStores: number;
  maxProducts: number;
  maxOrders: number;
  customDomain: boolean;
  analytics: boolean;
  priority_support: boolean;
  api_access: boolean;
  multiLanguage: boolean;
  customBranding: boolean;
}

// ============================================
// SUBSCRIPTION
// ============================================
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  TRIAL = 'TRIAL'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE'
}

export interface Subscription {
  id: number;
  userId: number;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  paymentMethod?: PaymentMethod;
  amount: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeRequest {
  userId: number;
  targetPlan: Plan;
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod: PaymentMethod;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: PaymentMethod;
  bankTransferDetails?: BankTransferDetails;
  createdAt: string;
}

export interface BankTransferDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  reference: string;
  amount: number;
  currency: string;
}

// ============================================
// INVENTORY
// ============================================
export interface InventoryLog {
  id: number;
  variantId: number;
  change: number;
  reason: string;
  userId?: number;
  createdAt: string;
}

// ============================================
// STORE
// ============================================
export interface Store {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId: number;
  owner?: User;
  userId?: number;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicStore {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: StoreStatus;
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

export interface StoreUsage {
  id: number;
  storeId: number;
  productCount: number;
  orderCount: number;
  storageUsed: number;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  slug?: string;
  description?: string;
  storeType?: string; // NEW: "OWN" or "RESELLER"
}

// ============================================
// PRODUCT OPTION & MEDIA
// ============================================
export interface ProductOption {
  id: number;
  variantId: number;
  name: string;
  value: string;
}

export interface ProductMedia {
  id: number;
  productId: number;
  mediaId: number;
  media?: Media;
  sortOrder: number;
  isPrimary?: boolean; // Ist dies das Hauptbild?
  url?: string; // URL zum Bild
  filename?: string; // Dateiname
}

// ============================================
// THEMES & CUSTOMIZATION
// ============================================
export enum ThemeType {
  MODERN = 'MODERN',
  CLASSIC = 'CLASSIC',
  MINIMAL = 'MINIMAL',
  ELEGANT = 'ELEGANT',
  DARK = 'DARK'
}

export enum ShopTemplate {
  FASHION = 'FASHION',
  ELECTRONICS = 'ELECTRONICS',
  FOOD = 'FOOD',
  JEWELRY = 'JEWELRY',
  BOOKS = 'BOOKS',
  CUSTOM = 'CUSTOM'
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
  headingFontFamily?: string;
  fontSize: {
    small: string;
    base: string;
    large: string;
    xl: string;
    xxl: string;
  };
}

export interface ThemeLayout {
  headerStyle: 'fixed' | 'static' | 'transparent';
  footerStyle: 'minimal' | 'full' | 'hidden';
  productGridColumns: 2 | 3 | 4;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'spacious';
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

export interface ThemePreset {
  type: ThemeType;
  name: string;
  description: string;
  preview: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

// ============================================
// AUDIT LOG - Änderungsprotokoll
// ============================================
export interface AuditLog {
  id: number;
  storeId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: Role;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
  entityName?: string;
  changes?: AuditChange[];
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  PUBLISH = 'PUBLISH',
  UNPUBLISH = 'UNPUBLISH',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT'
}

export enum AuditEntityType {
  STORE = 'STORE',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  ORDER = 'ORDER',
  USER = 'USER',
  SETTINGS = 'SETTINGS',
  THEME = 'THEME',
  DOMAIN = 'DOMAIN',
  MEDIA = 'MEDIA',
  SUBSCRIPTION = 'SUBSCRIPTION'
}

export interface AuditLogFilter {
  storeId?: number;
  userId?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

// ============================================
// CUSTOMER ADDRESS BOOK
// ============================================
export interface CustomerAddress {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  addressType: 'SHIPPING' | 'BILLING' | 'BOTH';
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  addressType: 'SHIPPING' | 'BILLING' | 'BOTH';
}

// ============================================
// WISHLIST / FAVORITES
// ============================================
export interface Wishlist {
  id: number;
  customerId: number;
  storeId: number;
  name: string;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  items?: WishlistItem[];
}

export interface WishlistItem {
  id: number;
  wishlistId: number;
  productId: number;
  product?: Product;
  variantId?: number;
  variant?: ProductVariant;
  note?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  addedAt: string;
}

export interface CreateWishlistRequest {
  storeId: number;
  name: string;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface AddToWishlistRequest {
  wishlistId: number;
  productId: number;
  variantId?: number;
  note?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================
// SAVED CARTS
// ============================================
export interface SavedCart {
  id: number;
  customerId: number;
  storeId: number;
  name: string;
  description?: string;
  items?: SavedCartItem[];
  totalItems: number;
  estimatedTotal: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface SavedCartItem {
  id: number;
  savedCartId: number;
  productId: number;
  product?: Product;
  variantId?: number;
  variant?: ProductVariant;
  quantity: number;
  priceAtSave: number;
}

export interface CreateSavedCartRequest {
  storeId: number;
  name: string;
  description?: string;
  cartId?: number; // Optional: Save existing cart
}

export interface SavedCartToCartRequest {
  savedCartId: number;
  mergeWithCurrent?: boolean;
}

// ============================================
// CUSTOMER ORDER HISTORY (Enhanced)
// ============================================
export interface OrderHistoryFilter {
  storeId?: number;
  customerId?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  size?: number;
  sortBy?: 'date' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderHistoryResponse {
  orders: Order[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  totalSpent: number;
  orderCount: number;
}

export interface OrderDetail extends Order {
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  canCancel: boolean;
  canReturn: boolean;
  canReorder: boolean;
}
