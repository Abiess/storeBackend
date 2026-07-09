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
