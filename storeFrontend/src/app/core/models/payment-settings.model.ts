export interface PaymentSettingsDTO {
  id?: number;
  provider: 'PAYPAL' | 'STRIPE' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
  enabled: boolean;
  mode: 'SANDBOX' | 'LIVE';
  connectionStatus: 'NOT_CONNECTED' | 'PLATFORM_SANDBOX' | 'CONNECTED' | 'ERROR';
  merchantAccountId?: string;
  onboardingCompleted: boolean;
  permissionsGranted: boolean;
  emailConfirmed: boolean;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  displayMode?: string;
  displayStatus?: string;
}

export interface PaymentSettingsUpdateRequest {
  provider: 'PAYPAL' | 'STRIPE';
  enabled: boolean;
}
