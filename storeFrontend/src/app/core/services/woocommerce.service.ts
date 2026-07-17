import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * WooCommerce Import Service.
 * 
 * Endpoints:
 * - GET  /api/stores/{storeId}/woocommerce/config
 * - PUT  /api/stores/{storeId}/woocommerce/config
 * - POST /api/stores/{storeId}/woocommerce/test
 * - POST /api/stores/{storeId}/woocommerce/preview
 */
@Injectable({
  providedIn: 'root'
})
export class WooCommerceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Lädt WooCommerce Config für einen Store.
   */
  getConfig(storeId: number): Observable<WooCommerceConfig> {
    return this.http.get<WooCommerceConfig>(
      `${this.apiUrl}/stores/${storeId}/woocommerce/config`
    );
  }

  /**
   * Speichert WooCommerce Config.
   */
  saveConfig(storeId: number, config: WooCommerceConfigRequest): Observable<SaveConfigResponse> {
    return this.http.put<SaveConfigResponse>(
      `${this.apiUrl}/stores/${storeId}/woocommerce/config`,
      config
    );
  }

  /**
   * Testet WooCommerce Verbindung.
   */
  testConnection(storeId: number): Observable<WooCommerceTestResponse> {
    return this.http.post<WooCommerceTestResponse>(
      `${this.apiUrl}/stores/${storeId}/woocommerce/test`,
      {}
    );
  }

  /**
   * Lädt Produkt-Vorschau (erste 20 Produkte).
   */
  loadPreview(storeId: number): Observable<WooCommercePreviewResponse> {
    return this.http.post<WooCommercePreviewResponse>(
      `${this.apiUrl}/stores/${storeId}/woocommerce/preview`,
      {}
    );
  }

  /**
   * Startet WooCommerce Import.
   */
  startImport(storeId: number, request?: WooCommerceImportRequest): Observable<WooCommerceImportResponse> {
    const body = request || {
      importImages: true,
      skipExisting: true
    };
    
    return this.http.post<WooCommerceImportResponse>(
      `${this.apiUrl}/stores/${storeId}/woocommerce/import`,
      body
    );
  }

  /**
   * Bereinigt WooCommerce-Produktbeschreibungen (HTML → Klartext).
   */
  cleanDescriptions(storeId: number, dryRun: boolean = true): Observable<CleanDescriptionsResponse> {
    return this.http.post<CleanDescriptionsResponse>(
      `${this.apiUrl}/admin/products/woocommerce/clean-descriptions`,
      {
        storeId: storeId,
        dryRun: dryRun
      }
    );
  }

  /** Send activation email to imported customer */
  sendActivationEmail(storeId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/stores/${storeId}/customers/activation/${userId}`, {});
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DTOs / Interfaces
// ─────────────────────────────────────────────────────────────────────────

export interface WooCommerceConfig {
  id?: number;
  shopUrl: string;
  consumerKey: string;
  consumerSecretConfigured: boolean;  // NIEMALS das echte Secret!
  enabled: boolean;
  connected?: boolean;
  wcVersion?: string;
  lastTestSuccessAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WooCommerceConfigRequest {
  shopUrl: string;
  consumerKey: string;
  consumerSecret: string;  // leer = behalten, wenn keepExistingSecret=true
  enabled: boolean;
  keepExistingSecret?: boolean;
}

export interface SaveConfigResponse {
  success: boolean;
  messageKey: string;
  consumerSecretConfigured: boolean;
}

export interface WooCommerceTestResponse {
  success: boolean;
  messageKey: string;
  detail?: string;
  wcVersion?: string;
  wpVersion?: string;
  productCount?: number;
  categoryCount?: number;
}

export interface WooCommercePreviewResponse {
  totalProducts: number;
  products: WooCommerceProductPreview[];
  categoriesCount: number;
  alreadyImportedCount: number;
  productsWithVariantWarning: number;
}

export interface WooCommerceProductPreview {
  wooCommerceId: number;
  name: string;
  sku?: string;
  price?: string;
  status: string;
  imageUrl?: string;
  categoryNames: string[];
  variationCount: number;
  alreadyImported: boolean;
  hasVariantLimitWarning: boolean;
  skipReason?: string;
}

export interface WooCommerceImportRequest {
  productIds?: number[];
  importImages?: boolean;
  skipExisting?: boolean;
  limit?: number;
  importCustomers?: boolean;
  importOnlyCustomersWithOrders?: boolean;
  customerPage?: number;
  customerPageSize?: number;
}

export interface WooCommerceImportResponse {
  jobId: number;
  status: string; // IN_PROGRESS | COMPLETED | FAILED
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  customersImported?: number;       // Neu erstellt
  customersLinked?: number;         // Existierender User → neuem Store zugeordnet
  customersSkipped?: number;        // Bereits im Store vorhanden
  customersFailed?: number;         // Fehler
  customerCurrentPage?: number;
  customerNextPage?: number;
  customerPageSize?: number;
  hasMoreCustomers?: boolean;
  importedCustomers?: ImportedCustomerDto[];  // Für Aktivierungsversand
  warnings?: string[];
  messageKey: string;
  // Backwards compatibility
  totalProducts?: number;
  estimatedTime?: number;
  message?: string;
}

export interface ImportedCustomerDto {
  userId: number;
  email: string;
  name: string;
  emailVerified: boolean;
  activationEmailSentAt?: string;
}

/**
 * Request für WooCommerce-Beschreibungsbereinigung.
 */
export interface CleanDescriptionsRequest {
  storeId: number;
  dryRun: boolean;
}

/**
 * Response für WooCommerce-Beschreibungsbereinigung.
 */
export interface CleanDescriptionsResponse {
  checked: number;         // Anzahl geprüfter Produkte
  affected: number;        // Anzahl Produkte mit HTML
  updated: number;         // Anzahl aktualisierter Produkte
  dryRun: boolean;
  products: ProductCleanupPreview[];
  errors: string[];
}

export interface ProductCleanupPreview {
  id: number;
  title: string;
  before: string;   // Max 300 Zeichen
  after: string;    // Max 300 Zeichen
  wouldChange: boolean;
}
