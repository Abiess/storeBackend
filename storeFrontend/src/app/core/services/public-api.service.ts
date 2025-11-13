import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Cart, AddToCartRequest, CheckoutRequest, Order, PublicStore } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class PublicApiService {
  constructor(private http: HttpClient) {}

  // Store Resolution
  resolveStore(host: string): Observable<PublicStore> {
    const params = new HttpParams().set('host', host);
    return this.http.get<PublicStore>(`${environment.publicApiUrl}/store/resolve`, { params });
  }

  // Cart Management
  getCart(sessionId: string): Observable<Cart> {
    const params = new HttpParams().set('sessionId', sessionId);
    return this.http.get<Cart>(`${environment.publicApiUrl}/cart`, { params });
  }

  addToCart(request: AddToCartRequest): Observable<Cart> {
    return this.http.post<Cart>(`${environment.publicApiUrl}/cart/items`, request);
  }

  updateCartItem(itemId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${environment.publicApiUrl}/cart/items/${itemId}`, { quantity });
  }

  removeCartItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${environment.publicApiUrl}/cart/items/${itemId}`);
  }

  clearCart(sessionId: string): Observable<void> {
    const params = new HttpParams().set('sessionId', sessionId);
    return this.http.delete<void>(`${environment.publicApiUrl}/cart/clear`, { params });
  }

  // Checkout
  checkout(request: CheckoutRequest): Observable<Order> {
    return this.http.post<Order>(`${environment.publicApiUrl}/orders/checkout`, request);
  }

  getOrderByNumber(orderNumber: string, email: string): Observable<Order> {
    const params = new HttpParams().set('email', email);
    return this.http.get<Order>(`${environment.publicApiUrl}/orders/${orderNumber}`, { params });
  }
}

