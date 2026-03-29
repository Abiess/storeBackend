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
  name?: string;
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
  // Store
  STORE_CREATE = 'STORE_CREATE',
  STORE_READ = 'STORE_READ',
  STORE_UPDATE = 'STORE_UPDATE',
  STORE_DELETE = 'STORE_DELETE',
  STORE_MANAGE = 'STORE_MANAGE',
  STORE_MANAGE_SETTINGS = 'STORE_MANAGE_SETTINGS',
  // Domain
  DOMAIN_CREATE = 'DOMAIN_CREATE',
  DOMAIN_READ = 'DOMAIN_READ',
  DOMAIN_UPDATE = 'DOMAIN_UPDATE',
  DOMAIN_DELETE = 'DOMAIN_DELETE',
  DOMAIN_VERIFY = 'DOMAIN_VERIFY',
  DOMAIN_MANAGE = 'DOMAIN_MANAGE',
  // Product
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_READ = 'PRODUCT_READ',
  PRODUCT_EDIT = 'PRODUCT_EDIT',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  // Category
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_READ = 'CATEGORY_READ',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  // Order
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_READ = 'ORDER_READ',
  ORDER_VIEW = 'ORDER_VIEW',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_DELETE = 'ORDER_DELETE',
  ORDER_MANAGE = 'ORDER_MANAGE',
  // Staff
  STAFF_CREATE = 'STAFF_CREATE',
  STAFF_READ = 'STAFF_READ',
  STAFF_UPDATE = 'STAFF_UPDATE',
  STAFF_DELETE = 'STAFF_DELETE',
  // Customer
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  CUSTOMER_MANAGE = 'CUSTOMER_MANAGE',
  // Settings / Reports
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_EDIT = 'SETTINGS_EDIT',
  REPORTS_VIEW = 'REPORTS_VIEW',
  // Media
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  MEDIA_READ = 'MEDIA_READ',
  MEDIA_DELETE = 'MEDIA_DELETE'
}

export interface UserRoleInterface {
  userId: number;
  role: string;
}

export type PermissionType = string;

export interface StoreRole {
  id?: number;
  userId: number;
  storeId: number;
  role: string;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainRole {
  userId: number;
  domainId: number;
  role: string;
  permissions: string[];
}

export interface DomainAccess {
  id?: number;
  userId: number;
  domainId: number;
  role: string;
  canManage: boolean;
  canVerify: boolean;
  createdAt?: string;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.STORE_OWNER]: [
    Permission.STORE_READ, Permission.STORE_UPDATE, Permission.STORE_MANAGE, Permission.STORE_MANAGE_SETTINGS,
    Permission.DOMAIN_CREATE, Permission.DOMAIN_READ, Permission.DOMAIN_UPDATE, Permission.DOMAIN_DELETE, Permission.DOMAIN_VERIFY,
    Permission.PRODUCT_CREATE, Permission.PRODUCT_READ, Permission.PRODUCT_EDIT, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE, Permission.PRODUCT_VIEW,
    Permission.CATEGORY_CREATE, Permission.CATEGORY_READ, Permission.CATEGORY_UPDATE, Permission.CATEGORY_DELETE,
    Permission.ORDER_CREATE, Permission.ORDER_READ, Permission.ORDER_VIEW, Permission.ORDER_UPDATE, Permission.ORDER_MANAGE,
    Permission.STAFF_CREATE, Permission.STAFF_READ, Permission.STAFF_UPDATE, Permission.STAFF_DELETE,
    Permission.CUSTOMER_VIEW, Permission.CUSTOMER_MANAGE,
    Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT, Permission.REPORTS_VIEW,
    Permission.MEDIA_UPLOAD, Permission.MEDIA_READ, Permission.MEDIA_DELETE
  ],
  [UserRole.STORE_ADMIN]: [
    Permission.STORE_READ, Permission.STORE_UPDATE, Permission.STORE_MANAGE_SETTINGS,
    Permission.DOMAIN_READ, Permission.DOMAIN_VERIFY,
    Permission.PRODUCT_CREATE, Permission.PRODUCT_READ, Permission.PRODUCT_EDIT, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE, Permission.PRODUCT_VIEW,
    Permission.CATEGORY_CREATE, Permission.CATEGORY_READ, Permission.CATEGORY_UPDATE, Permission.CATEGORY_DELETE,
    Permission.ORDER_READ, Permission.ORDER_VIEW, Permission.ORDER_UPDATE, Permission.ORDER_MANAGE,
    Permission.STAFF_READ, Permission.CUSTOMER_VIEW, Permission.CUSTOMER_MANAGE,
    Permission.SETTINGS_VIEW, Permission.REPORTS_VIEW,
    Permission.MEDIA_UPLOAD, Permission.MEDIA_READ, Permission.MEDIA_DELETE
  ],
  [UserRole.STORE_MANAGER]: [
    Permission.STORE_READ,
    Permission.PRODUCT_CREATE, Permission.PRODUCT_READ, Permission.PRODUCT_EDIT, Permission.PRODUCT_UPDATE, Permission.PRODUCT_VIEW,
    Permission.CATEGORY_READ, Permission.CATEGORY_UPDATE,
    Permission.ORDER_READ, Permission.ORDER_VIEW, Permission.ORDER_UPDATE,
    Permission.CUSTOMER_VIEW, Permission.SETTINGS_VIEW, Permission.REPORTS_VIEW,
    Permission.MEDIA_UPLOAD, Permission.MEDIA_READ
  ],
  [UserRole.STORE_STAFF]: [
    Permission.PRODUCT_READ, Permission.PRODUCT_VIEW,
    Permission.ORDER_READ, Permission.ORDER_VIEW,
    Permission.CUSTOMER_VIEW, Permission.MEDIA_READ
  ],
  [UserRole.STORE_EMPLOYEE]: [
    Permission.PRODUCT_READ, Permission.PRODUCT_VIEW,
    Permission.ORDER_READ, Permission.ORDER_VIEW,
    Permission.MEDIA_READ
  ],
  [UserRole.CUSTOMER]: [
    Permission.PRODUCT_READ, Permission.PRODUCT_VIEW,
    Permission.ORDER_CREATE, Permission.ORDER_READ, Permission.ORDER_VIEW
  ]
};

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
  productCount?: number;
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
  discountPercentage?: number; // Rabatt in Prozent
  originalPrice?: number;     // Originalpreis vor Rabatt

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
  ACTIVE = 'PUBLISHED', // Alias für PUBLISHED – rückwärtskompatibel
  ARCHIVED = 'ARCHIVED'
}

export interface ProductVariant {
  id: number;
  productId: number;
  name?: string;
  sku: string;
  barcode?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stock: number;
  stockQuantity: number; // Required for inventory management
  quantity?: number;
  weight?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  attributesJson?: string;
  attributes?: { [key: string]: string }; // Parsed attributes for UI
  options?: ProductOption[];
  imageUrl?: string; // Main variant image
  images?: string[]; // Multiple variant images
  mediaUrls?: string[]; // Alternative field name for images
  isActive?: boolean;
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
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  paymentMethod?: string; // CASH_ON_DELIVERY, BANK_TRANSFER, CREDIT_CARD, PAYPAL
  phoneVerificationId?: number;
  phoneVerified?: boolean;
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
  productName?: string;
  name?: string;
  variantSku?: string;
  sku?: string;
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

// ============================================
// DELIVERY OPTIONS
// ============================================
export enum DeliveryType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY'
}

export enum DeliveryMode {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS'
}

export interface DeliveryOption {
  deliveryType: DeliveryType;
  deliveryMode?: DeliveryMode | null;
  fee: number;
  etaMinutes?: number | null;
  available: boolean;
  zoneId?: number | null;
  zoneName?: string | null;
  reason?: string | null;
}

export interface DeliveryOptionsRequest {
  postalCode: string;
  city?: string;
  country?: string;
}

export interface DeliveryOptionsResponse {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  expressEnabled: boolean;
  currency: string;
  options: DeliveryOption[];
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
  logoUrl?: string;
  bannerImageUrl?: string;
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
  logoUrl?: string;  // ✅ Matches backend PublicStoreDTO
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
  logoUrl?: string;
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
  logoUrl?: string;
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
// HOMEPAGE SECTIONS - Homepage Builder
// ============================================
export type SectionType =
  | 'HERO'
  | 'FEATURED_PRODUCTS'
  | 'CATEGORIES'
  | 'BEST_SELLERS'
  | 'BANNER'
  | 'NEWSLETTER';

export interface HomepageSection {
  id: number;
  storeId: number;
  sectionType: SectionType;
  sortOrder: number;
  isActive: boolean;
  settings: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomepageSectionRequest {
  storeId: number;
  sectionType: SectionType;
  sortOrder: number;
  isActive?: boolean;
  settings?: string;
}

export interface HeroSectionSettings {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: string;
}

export interface FeaturedProductsSettings {
  categoryId?: number;
  limit?: number;
  title?: string;
}

export interface CategoriesSettings {
  limit?: number;
  title?: string;
}

export interface BannerSettings {
  imageUrl?: string;
  link?: string;
  title?: string;
  subtitle?: string;
}

export interface NewsletterSettings {
  title?: string;
  description?: string;
  placeholderText?: string;
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
