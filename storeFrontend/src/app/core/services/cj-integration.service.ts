import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CJConnectionRequest,
  CJConnectionStatus,
  CJOrderRequest,
  CJOrderResponse
} from '../models/dropshipping.model';

/**
 * CJ Dropshipping Integration Service
 */
@Injectable({
  providedIn: 'root'
})
export class CJIntegrationService {
  private apiUrl = `${environment.apiUrl}/api/cj`;

  constructor(private http: HttpClient) {}

  /**
   * Verbinde Store mit CJ Account
   */
  connectStore(storeId: number, request: CJConnectionRequest): Observable<CJConnectionStatus> {
    return this.http.post<CJConnectionStatus>(
      `${this.apiUrl}/stores/${storeId}/connect`,
      request
    );
  }

  /**
   * Prüfe CJ Connection Status
   */
  getConnectionStatus(storeId: number): Observable<CJConnectionStatus> {
    return this.http.get<CJConnectionStatus>(
      `${this.apiUrl}/stores/${storeId}/status`
    );
  }

  /**
   * Disconnect Store von CJ
   */
  disconnectStore(storeId: number): Observable<CJConnectionStatus> {
    return this.http.delete<CJConnectionStatus>(
      `${this.apiUrl}/stores/${storeId}/disconnect`
    );
  }

  /**
   * Bestelle Order Item bei CJ
   */
  placeOrder(itemId: number, request: CJOrderRequest): Observable<CJOrderResponse> {
    return this.http.post<CJOrderResponse>(
      `${this.apiUrl}/order-items/${itemId}/place-order`,
      request
    );
  }
}

