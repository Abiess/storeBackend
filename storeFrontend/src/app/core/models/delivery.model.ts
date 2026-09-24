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
  
  // ════════════════════════════════════════════════════════════
  // DHL INTEGRATION SETTINGS
  // ════════════════════════════════════════════════════════════
  dhlEnabled?: boolean;
  dhlEnvironment?: string; // SANDBOX | PRODUCTION
  
  // Credentials (masked in Response)
  dhlClientId?: string;
  dhlClientSecret?: string; // Masked as "********"
  dhlUsername?: string;
  dhlPassword?: string; // Masked as "********"
  dhlBillingNumber?: string;
  
  // Shipper Address (DHL Absenderadresse)
  dhlShipperName?: string;
  dhlShipperStreet?: string;
  dhlShipperHouseNumber?: string;
  dhlShipperPostalCode?: string;
  dhlShipperCity?: string;
  dhlShipperCountry?: string;
  dhlShipperEmail?: string;
  dhlShipperPhone?: string;
  
  // Default Package Dimensions
  dhlDefaultWeightGrams?: number;
  dhlDefaultLengthMm?: number;
  dhlDefaultWidthMm?: number;
  dhlDefaultHeightMm?: number;
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

// ============================================
// DELIVERY PARTNER MARKETPLACE
// ============================================

/** Typ des Delivery-Partners */
export type DeliveryPartnerType = 'COMPANY' | 'INDIVIDUAL';

/** Regionen in Marokko */
export type MoroccoRegion =
  | 'CASABLANCA_SETTAT' | 'RABAT_SALE_KENITRA' | 'MARRAKECH_SAFI'
  | 'FES_MEKNES' | 'TANGER_TETOUAN_AL_HOCEIMA' | 'ORIENTAL'
  | 'BENI_MELLAL_KHENIFRA' | 'DRAA_TAFILALET' | 'SOUSS_MASSA'
  | 'GUELMIM_OUED_NOUN' | 'LAAYOUNE_SAKIA_EL_HAMRA' | 'DAKHLA_OUED_ED_DAHAB';

/** Abdeckungsgebiet (Marokko oder international) */
export interface CoverageArea {
  morocco: boolean;
  moroccoRegions: MoroccoRegion[];
  international: boolean;
  internationalCountries: string[];    // ISO-Codes: FR, ES, DE, ...
}

/** Portfolio eines Delivery-Partners */
export interface DeliveryPartnerProfile {
  id: number;
  userId: number;
  type: DeliveryPartnerType;

  // Firma / Person
  companyName?: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  logoUrl?: string;

  // Social Media Links
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;

  // Geschäftsdaten
  ice?: string;                 // Identifiant Commun de l'Entreprise (Marokko)
  rc?: string;                  // Registre de Commerce
  taxId?: string;               // für internationale Partner

  // Beschreibung & Services
  description: string;
  services: string[];           // z.B. ['EXPRESS','STANDARD','COD','COLD_CHAIN','FRAGILE']
  vehicleTypes?: string[];      // z.B. ['MOTORCYCLE','VAN','TRUCK','BICYCLE']

  // Abdeckung
  coverage: CoverageArea;

  // Preise
  basePriceLocal?: number;      // MAD – Standardpreis lokal
  basePriceNational?: number;   // MAD – Standardpreis national
  basePriceInternational?: number;
  currency: string;             // MAD | EUR
  codFeePercent?: number;       // Cash-on-Delivery-Gebühr in %

  // SLAs
  estimatedLocalHours?: number;       // Innerhalb der Stadt
  estimatedNationalDays?: number;     // Landesweit
  estimatedInternationalDays?: number;
  maxWeightKg?: number;

  // Bewertungen (berechnet)
  averageRating: number;
  totalReviews: number;
  completedDeliveries: number;

  // Status
  verified: boolean;
  active: boolean;
  featured: boolean;

  createdAt: string;
  updatedAt: string;
}

/** Request zum Anlegen / Bearbeiten eines Profils */
export interface CreateDeliveryPartnerRequest {
  type: DeliveryPartnerType;
  companyName?: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;

  // Social Media Links (optional)
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;

  ice?: string;
  rc?: string;
  taxId?: string;
  description: string;
  services: string[];
  vehicleTypes?: string[];
  coverage: CoverageArea;
  basePriceLocal?: number;
  basePriceNational?: number;
  basePriceInternational?: number;
  currency: string;
  codFeePercent?: number;
  estimatedLocalHours?: number;
  estimatedNationalDays?: number;
  estimatedInternationalDays?: number;
  maxWeightKg?: number;
}

/** Bewertung eines Delivery-Partners durch einen Store-Besitzer */
export interface DeliveryPartnerReview {
  id: number;
  partnerId: number;
  reviewerUserId: number;
  reviewerStoreName: string;
  rating: number;             // 1-5
  comment: string;
  reliability: number;        // 1-5 Zuverlässigkeit
  speed: number;              // 1-5 Geschwindigkeit
  communication: number;      // 1-5 Kommunikation
  priceQuality: number;       // 1-5 Preis-Leistung
  createdAt: string;
}

/** Review-Statistiken eines Partners */
export interface DeliveryPartnerStats {
  partnerId: number;
  averageRating: number;
  totalReviews: number;
  avgReliability: number;
  avgSpeed: number;
  avgCommunication: number;
  avgPriceQuality: number;
  completedDeliveries: number;
}

/** Filter für Marketplace-Suche */
export interface DeliveryPartnerFilter {
  region?: MoroccoRegion;
  type?: DeliveryPartnerType;
  service?: string;
  international?: boolean;
  minRating?: number;
  verified?: boolean;
  search?: string;
}
