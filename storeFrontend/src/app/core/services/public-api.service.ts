
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
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Cart, AddToCartRequest, CheckoutRequest, Order, PublicStore } from '../models';

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
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = 'markt_ma_token';

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap(user => this.currentUserSubject.next(user)));
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    this.currentUserSubject.next(response.user);
  }

  private loadUserFromStorage(): void {
    if (this.isAuthenticated()) {
      this.getMe().subscribe({
        error: () => this.logout()
      });
    }
  }
}

