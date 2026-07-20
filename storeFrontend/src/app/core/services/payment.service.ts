import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  PaymentProvider,
  PaymentCreateRequest,
  PaymentCreateResponse,
  PaymentCaptureResponse,
  PaymentStatusResponse,
  PaymentMethodsResponse
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Hole verfügbare Zahlungsmethoden für einen Store
   */
  getAvailablePaymentMethods(storeId: number): Observable<PaymentMethodsResponse> {
    return this.http.get<PaymentMethodsResponse>(
      `${this.apiUrl}/public/stores/${storeId}/payment-methods`
    );
  }

  /**
   * Erstelle eine Payment-Transaction
   */
  createPayment(storeId: number, request: PaymentCreateRequest): Observable<PaymentCreateResponse> {
    const headers = new HttpHeaders();
    if (request.checkoutToken) {
      headers.set('X-Checkout-Token', request.checkoutToken);
    }
    
    return this.http.post<PaymentCreateResponse>(
      `${this.apiUrl}/api/public/stores/${storeId}/checkout/payments`,
      request,
      { headers }
    );
  }

  /**
   * Erfasse (capture) eine genehmigte Zahlung
   */
  capturePayment(storeId: number, paymentId: number, checkoutToken?: string): Observable<PaymentCaptureResponse> {
    const headers = new HttpHeaders();
    if (checkoutToken) {
      headers.set('X-Checkout-Token', checkoutToken);
    }
    
    return this.http.post<PaymentCaptureResponse>(
      `${this.apiUrl}/api/public/stores/${storeId}/checkout/payments/${paymentId}/capture`,
      {},
      { headers }
    );
  }

  /**
   * Frage Payment-Status ab
   */
  getPaymentStatus(storeId: number, paymentId: number, checkoutToken?: string): Observable<PaymentStatusResponse> {
    const headers = new HttpHeaders();
    if (checkoutToken) {
      headers.set('X-Checkout-Token', checkoutToken);
    }
    
    return this.http.get<PaymentStatusResponse>(
      `${this.apiUrl}/api/public/stores/${storeId}/checkout/payments/${paymentId}/status`,
      { headers }
    );
  }
}
