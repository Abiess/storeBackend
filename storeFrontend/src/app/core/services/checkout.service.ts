import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MockCheckoutService } from '../mocks/mock-checkout.service';

export interface CheckoutRequest {
  sessionId: string;
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

  constructor(private http: HttpClient) {}

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    if (environment.useMockData) {
      return this.mockService.checkout(request);
    }

    console.log('🛍️ Checkout-Request:', {
      sessionId: request.sessionId,
      storeId: request.storeId,
      email: request.customerEmail
    });

    return this.http.post<CheckoutResponse>(
      `${environment.publicApiUrl}/orders/checkout`,
      request,
      {
        headers: {
          'X-Session-Id': request.sessionId
        }
      }
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
