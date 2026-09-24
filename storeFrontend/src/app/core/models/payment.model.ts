/**
 * Payment Models - Provider-unabhängige Payment-Typen
 * Phase 1A: PayPal Sandbox MVP
 */

export enum PaymentProvider {
  PAYPAL = 'PAYPAL',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BANK_TRANSFER = 'BANK_TRANSFER'
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export interface PaymentMethodsResponse {
  paypal: {
    enabled: boolean;
    configured: boolean;
    mode: 'SANDBOX' | 'LIVE';
  };
}

export interface PaymentMethodDefinition {
  provider: PaymentProvider;
  enabled: boolean;
  configured: boolean;
  displayName: string;
  description: string;
  icon?: string;
  mode?: 'SANDBOX' | 'LIVE';
}

export interface PaymentCreateRequest {
  orderId: number;
  provider: PaymentProvider;
  returnUrl?: string;
  cancelUrl?: string;
  checkoutToken?: string;
}

export interface PaymentCreateResponse {
  paymentId: number;
  provider: PaymentProvider;
  providerOrderId: string;
  approvalUrl?: string;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentCaptureResponse {
  success: boolean;
  status: PaymentStatus;
  providerCaptureId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentStatusResponse {
  paymentId: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerOrderId?: string;
  providerCaptureId?: string;
  amount: number;
  currencyCode: string;
}
