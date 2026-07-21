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
   * KRITISCH: checkoutToken muss als Header gesendet werden für Gast-Checkout
   */
  createPayment(storeId: number, request: PaymentCreateRequest): Observable<PaymentCreateResponse> {
    let headers = new HttpHeaders();
    if (request.checkoutToken) {
      headers = headers.set('X-Checkout-Token', request.checkoutToken);
    }
    
    return this.http.post<PaymentCreateResponse>(
      `${this.apiUrl}/public/stores/${storeId}/checkout/payments`,
      request,
      { headers }
    );
  }

  /**
   * Erfasse (capture) eine genehmigte Zahlung
   * KRITISCH: checkoutToken wird für Gast-Checkout benötigt!
   */
  capturePayment(storeId: number, paymentId: number, checkoutToken?: string): Observable<PaymentCaptureResponse> {
    let headers = new HttpHeaders();
    if (checkoutToken) {
      headers = headers.set('X-Checkout-Token', checkoutToken);
      console.log('[PaymentService] Capturing with checkout token for guest checkout');
    } else {
      console.log('[PaymentService] Capturing with JWT auth for logged-in user');
    }
    
    return this.http.post<PaymentCaptureResponse>(
      `${this.apiUrl}/public/stores/${storeId}/checkout/payments/${paymentId}/capture`,
      {},
      { headers }
    );
  }

  /**
   * Frage Payment-Status ab
   */
  getPaymentStatus(storeId: number, paymentId: number, checkoutToken?: string): Observable<PaymentStatusResponse> {
    let headers = new HttpHeaders();
    if (checkoutToken) {
      headers = headers.set('X-Checkout-Token', checkoutToken);
    }
    
    return this.http.get<PaymentStatusResponse>(
      `${this.apiUrl}/public/stores/${storeId}/checkout/payments/${paymentId}/status`,
      { headers }
    );
  }
}
