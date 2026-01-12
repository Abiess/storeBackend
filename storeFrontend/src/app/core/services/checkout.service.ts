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
  customerEmail: string;
  status: string;
  total: number;
  shippingAddress: Address;
  billingAddress: Address;
  items: OrderItem[];
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  productName: string;
  variantName: string;
  quantity: number;
  priceAtOrder: number;
  subtotal: number;
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
   * Holt den JWT Token aus localStorage
   */
  private getAuthToken(): string | null {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('⚠️ Kein Auth-Token gefunden - Login erforderlich');
      return null;
    }
    return token;
  }

  /**
   * Erstellt HTTP Headers mit Authorization Token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required for checkout');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    if (environment.useMockData) {
      return this.mockService.checkout(request);
    }

    const token = this.getAuthToken();
    if (!token) {
      console.error('❌ Checkout ohne Login nicht möglich');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' }
      });
      return throwError(() => new Error('Authentication required'));
    }

    console.log('🛍️ Checkout-Request:', {
      storeId: request.storeId,
      email: request.customerEmail
    });

    return this.http.post<CheckoutResponse>(
      `${environment.publicApiUrl}/orders/checkout`,
      request,
      {
        headers: this.getAuthHeaders()
      }
    ).pipe(
      catchError(error => {
        if (error.status === 401) {
          console.error('❌ Token ungültig - Login erforderlich');
          this.router.navigate(['/login']);
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
