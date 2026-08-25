import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * POS Order Request
 * Nur productId + quantity, Preise werden serverseitig validiert
 */
export interface PosOrderItemRequest {
  productId: number;
  quantity: number;
}

export interface PosOrderRequest {
  paymentMethod: 'CASH' | 'CARD_EXTERNAL';
  cashReceived?: number;
  items: PosOrderItemRequest[];
}

/**
 * POS Order Response
 */
export interface PosOrderResponse {
  orderId: number;
  orderNumber: string;
  totalGross: number;
  taxTotal: number;
  cashChange?: number;
  status: string;
  createdAt: string;
}

/**
 * POS Service
 * API-Kommunikation für Point-of-Sale
 */
@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Erstellt POS-Verkauf (Order mit source = POS)
   * 
   * POST /api/stores/{storeId}/pos/sales
   * 
   * @param storeId Store ID
   * @param request POS Order Request
   * @returns Observable<PosOrderResponse>
   */
  createPosOrder(storeId: number, request: PosOrderRequest): Observable<PosOrderResponse> {
    return this.http.post<PosOrderResponse>(
      `${this.apiUrl}/stores/${storeId}/pos/sales`,
      request
    );
  }
}
