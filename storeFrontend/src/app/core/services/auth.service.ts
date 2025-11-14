import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, Role, AuthResponse, LoginRequest, RegisterRequest } from '../models';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser$ = new BehaviorSubject<User | null>({
    id: 1,
    email: 'max@beispiel.de',
    name: 'Max Mustermann',
    roles: [Role.SUPER_ADMIN],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  login(credentials: LoginRequest | any): Observable<AuthResponse> {
    // Mock: Simuliert erfolgreichen Login
    const user: User = {
      id: 1,
      email: credentials.email || 'user@example.com',
      name: 'Test User',
      roles: [Role.STORE_OWNER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Date.now(),
      user
    };

    return of(response).pipe(
      tap(() => this.currentUser$.next(user))
    );
  }

  register(data: RegisterRequest | any): Observable<AuthResponse> {
    // Mock: Simuliert erfolgreiche Registrierung
    const user: User = {
      id: Math.floor(Math.random() * 1000),
      email: data.email || 'newuser@example.com',
      name: 'New User',
      roles: [Role.CUSTOMER],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Date.now(),
      user
    };

    return of(response).pipe(
      tap(() => this.currentUser$.next(user))
    );
  }

  logout(): void {
    this.currentUser$.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser$.value !== null;
  }

  getToken(): string | null {
    // Mock: In echter Anwendung würde das Token aus localStorage/sessionStorage kommen
    return this.isAuthenticated() ? 'mock-jwt-token-' + Date.now() : null;
  }
}
