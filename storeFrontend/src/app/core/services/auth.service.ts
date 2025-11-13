import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { MockAuthService } from '../mocks/mock-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = 'markt_ma_token';
  private mockService = new MockAuthService();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    if (environment.useMockData) {
      return this.mockService.register(request)
        .pipe(tap(response => this.handleAuthResponse(response)));
    }
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    console.log('AuthService.login aufgerufen');
    console.log('useMockData:', environment.useMockData);
    console.log('Login Request:', request);

    if (environment.useMockData) {
      console.log('Verwende MockAuthService für Login');
      return this.mockService.login(request)
        .pipe(tap(response => this.handleAuthResponse(response)));
    }
    console.log('Verwende echtes Backend für Login');
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  getMe(): Observable<User> {
    if (environment.useMockData) {
      return this.mockService.getMe()
        .pipe(tap(user => this.currentUserSubject.next(user)));
    }
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
