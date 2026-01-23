import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { MockCheckoutService } from '../mocks/mock-checkout.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';

export interface CheckoutRequest {
  storeId: number;
  customerEmail: string;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  total: number;
  customerEmail: string;
  message: string;
}

export interface OrderDetails {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customerEmail: string;
  customer?: {
    id: number;
    email: string;
  };
  items: OrderItem[];
  shippingAddress: Address;  // FIXED: Nicht mehr optional
  billingAddress: Address;   // FIXED: Nicht mehr optional
  notes?: string;
}

export interface OrderItem {
  id: number;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  subtotal: number;
  productSnapshot?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private mockService = new MockCheckoutService();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Holt den JWT Token aus localStorage (optional für Guest-Checkout)
   */
  private getAuthToken(): string | null {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('ℹ️ Kein Auth-Token - Guest-Checkout wird verwendet');
    }
    return token;
  }

  /**
   * Erstellt HTTP Headers mit Authorization Token (falls vorhanden)
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    // Für Guest-Checkout: Leere Headers
    return new HttpHeaders();
  }

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    if (environment.useMockData) {
      return this.mockService.checkout(request);
    }

    // FIXED: Kein Token-Check mehr - Guest-Checkout ist erlaubt
    const token = this.getAuthToken();
    const isGuest = !token;

    console.log('🛍️ Checkout-Request:', {
      storeId: request.storeId,
      email: request.customerEmail,
      mode: isGuest ? '👤 Guest' : '🔐 Authenticated'
    });

    // FIXED: Guest-Session-ID hinzufügen für Guest-Checkout
    const sessionId = localStorage.getItem('cart_session_id');
    const requestBody = isGuest && sessionId
      ? { ...request, sessionId }
      : request;

    return this.http.post<CheckoutResponse>(
      `${environment.publicApiUrl}/orders/checkout`,
      requestBody,
      {
        headers: this.getAuthHeaders()
      }
    ).pipe(
      catchError(error => {
        if (error.status === 401 && !isGuest) {
          // Nur bei eingeloggten Usern mit ungültigem Token zum Login weiterleiten
          console.error('❌ Token ungültig - Login erforderlich');
          const currentUrl = this.router.url;
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl }
          });
        } else if (error.status === 401 && isGuest) {
          // Guest-Checkout fehlgeschlagen aus anderen Gründen
          console.error('❌ Guest-Checkout fehlgeschlagen:', error);
        }
        return throwError(() => error);
      })
    );
  }

  getOrderByNumber(orderNumber: string, email: string): Observable<OrderDetails> {
    if (environment.useMockData) {
      return this.mockService.getOrderByNumber(orderNumber, email);
    }
    return this.http.get<OrderDetails>(
      `${environment.publicApiUrl}/orders/${orderNumber}?email=${email}`
    );
  }
}
