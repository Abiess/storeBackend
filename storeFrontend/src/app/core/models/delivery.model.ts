// Delivery Models
export interface DeliverySettings {
  id: number;
  storeId: number;
  enabled: boolean;
  defaultProvider?: string;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  freeShippingThreshold?: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliverySettingsRequest {
  enabled: boolean;
  defaultProvider?: string;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  freeShippingThreshold?: number;
  currency?: string;
}

export interface DeliveryProvider {
  id: number;
  storeId: number;
  name: string;
  code: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  trackingUrlTemplate?: string;
  config?: Record<string, any>;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryProviderRequest {
  name: string;
  code: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  trackingUrlTemplate?: string;
  config?: Record<string, any>;
  priority: number;
}

export interface DeliveryZone {
  id: number;
  storeId: number;
  name: string;
  countries: string[];
  postalCodeRanges?: string[];
  shippingCost: number;
  freeShippingThreshold?: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryZoneRequest {
  name: string;
  countries: string[];
  postalCodeRanges?: string[];
  shippingCost: number;
  freeShippingThreshold?: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  enabled: boolean;
  priority: number;
}

export interface DeliveryRate {
  zoneId: number;
  zoneName: string;
  cost: number;
  estimatedDays: string;
  provider?: string;
}

