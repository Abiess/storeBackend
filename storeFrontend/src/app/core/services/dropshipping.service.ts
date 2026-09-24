import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  DropshippingSource,
  FulfillmentUpdate,
  OrderItemWithDropshipping,
  MarginResponse
} from '../models/dropshipping.model';

/**
 * Service für Dropshipping-Funktionen (nur ROLE_RESELLER)
 */
@Injectable({
  providedIn: 'root'
})
export class DropshippingService {

  constructor(private http: HttpClient) {}

  // ==================================================================================
  // SUPPLIER LINKS (pro Variant)
  // ==================================================================================

  /**
   * Speichert Supplier-Link für eine Variant
   */
  saveSupplierLink(variantId: number, data: Partial<DropshippingSource>): Observable<DropshippingSource> {
    return this.http.post<DropshippingSource>(
      `${environment.apiUrl}/dropshipping/variants/${variantId}/source`,
      data
    );
  }

  /**
   * Lädt Supplier-Link für eine Variant
   */
  getSupplierLink(variantId: number): Observable<DropshippingSource> {
    return this.http.get<DropshippingSource>(
      `${environment.apiUrl}/dropshipping/variants/${variantId}/source`
    );
  }

  /**
   * Aktualisiert Supplier-Link
   */
  updateSupplierLink(variantId: number, data: Partial<DropshippingSource>): Observable<DropshippingSource> {
    return this.http.put<DropshippingSource>(
      `${environment.apiUrl}/dropshipping/variants/${variantId}/source`,
      data
    );
  }

  /**
   * Löscht Supplier-Link
   */
  deleteSupplierLink(variantId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/dropshipping/variants/${variantId}/source`
    );
  }

  // ==================================================================================
  // PRODUCT & STORE LEVEL
  // ==================================================================================

  /**
   * Lädt alle Supplier-Links für ein Product
   */
  getSupplierLinksForProduct(productId: number): Observable<DropshippingSource[]> {
    return this.http.get<DropshippingSource[]>(
      `${environment.apiUrl}/dropshipping/products/${productId}/sources`
    );
  }

  /**
   * Lädt alle Supplier-Links für einen Store
   */
  getSupplierLinksForStore(storeId: number): Observable<DropshippingSource[]> {
    return this.http.get<DropshippingSource[]>(
      `${environment.apiUrl}/dropshipping/stores/${storeId}/sources`
    );
  }

  // ==================================================================================
  // ORDER FULFILLMENT
  // ==================================================================================

  /**
   * Lädt Order Items mit Dropshipping-Info
   */
  getOrderItemsWithDropshipping(orderId: number): Observable<OrderItemWithDropshipping[]> {
    return this.http.get<OrderItemWithDropshipping[]>(
      `${environment.apiUrl}/dropshipping/orders/${orderId}/items`
    );
  }

  /**
   * Aktualisiert Fulfillment Status für ein Order Item
   */
  updateFulfillment(itemId: number, data: FulfillmentUpdate): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/dropshipping/order-items/${itemId}/fulfillment`,
      data
    );
  }

  // ==================================================================================
  // ANALYTICS
  // ==================================================================================

  /**
   * Berechnet Gesamt-Marge für Store
   */
  calculateStoreMargin(storeId: number): Observable<MarginResponse> {
    return this.http.get<MarginResponse>(
      `${environment.apiUrl}/dropshipping/stores/${storeId}/margin`
    );
  }
}

