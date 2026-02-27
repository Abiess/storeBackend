/**
 * Dropshipping Models & Interfaces
 */

export enum FulfillmentStatus {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum SupplierType {
  MANUAL = 'MANUAL',
  CJ = 'CJ',
  ALIEXPRESS = 'ALIEXPRESS',
  ALIBABA = 'ALIBABA'
}

export interface DropshippingSource {
  id?: number;
  variantId: number;
  supplierType?: SupplierType;
  supplierUrl: string;
  supplierName?: string;
  purchasePrice: number;
  estimatedShippingDays?: number;
  supplierSku?: string;
  cjProductId?: string;
  cjVariantId?: string;
  notes?: string;

  // Calculated fields (from backend)
  salePrice?: number;
  marginPercentage?: number;
  profitAmount?: number;
}

export interface CJConnectionRequest {
  email: string;
  password: string;
}

export interface CJConnectionStatus {
  connected: boolean;
  message: string;
  errorCode?: string;
}

export interface CJOrderRequest {
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountryCode: string;
  shippingPhone: string;
}

export interface CJOrderResponse {
  success: boolean;
  cjOrderId?: string;
  message: string;
  errorCode?: string;
}

export interface FulfillmentUpdate {
  status: FulfillmentStatus;
  supplierOrderId?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

export interface OrderItemWithDropshipping {
  id: number;
  name: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  total: number;
  fulfillmentStatus: FulfillmentStatus;
  supplierOrderId?: string;
  trackingNumber?: string;
  carrier?: string;
  orderedFromSupplierAt?: string;
  fulfilledAt?: string;
  notes?: string;
  dropshippingSource?: DropshippingSource;
}

export interface MarginResponse {
  marginPercentage: number;
}

/**
 * Helper: Formatiert Marge als Prozent
 */
export function formatMargin(margin: number): string {
  return `${(margin * 100).toFixed(1)}%`;
}

/**
 * Helper: Prüft ob Marge profitabel ist
 */
export function isProfitable(purchasePrice: number, salePrice: number): boolean {
  return salePrice > purchasePrice;
}

/**
 * Helper: Berechnet Profit
 */
export function calculateProfit(purchasePrice: number, salePrice: number): number {
  return salePrice - purchasePrice;
}

/**
 * Helper: Berechnet Margin %
 */
export function calculateMargin(purchasePrice: number, salePrice: number): number {
  if (salePrice === 0) return 0;
  return (salePrice - purchasePrice) / salePrice;
}

/**
 * Helper: Status Badge Farbe
 */
export function getFulfillmentStatusColor(status: FulfillmentStatus): string {
  switch (status) {
    case FulfillmentStatus.PENDING:
      return 'warning';
    case FulfillmentStatus.ORDERED:
      return 'info';
    case FulfillmentStatus.SHIPPED:
      return 'primary';
    case FulfillmentStatus.DELIVERED:
      return 'success';
    case FulfillmentStatus.CANCELLED:
      return 'danger';
    default:
      return 'secondary';
  }
}

/**
 * Helper: Status Label (Deutsch)
 */
export function getFulfillmentStatusLabel(status: FulfillmentStatus): string {
  switch (status) {
    case FulfillmentStatus.PENDING:
      return 'Ausstehend';
    case FulfillmentStatus.ORDERED:
      return 'Bestellt';
    case FulfillmentStatus.SHIPPED:
      return 'Versendet';
    case FulfillmentStatus.DELIVERED:
      return 'Geliefert';
    case FulfillmentStatus.CANCELLED:
      return 'Storniert';
    default:
      return status;
  }
}

