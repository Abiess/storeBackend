import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load user from localStorage if exists
    const token = this.getToken();
    if (token) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser && storedUser !== 'undefined') {
        try {
          const user = JSON.parse(storedUser);
          this.currentUserSubject.next(user);
        } catch (e) {
          console.error('Fehler beim Parsen des gespeicherten Users:', e);
          this.validateTokenWithBackend();
        }
      } else {
        // Token vorhanden, aber kein User gespeichert - hole vom Backend
        this.validateTokenWithBackend();
      }
    }
  }

  /**
   * Validiert den Token mit dem Backend und lädt User-Daten
   */
  private validateTokenWithBackend(): void {
    this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(
        catchError(error => {
          console.error('Token-Validierung fehlgeschlagen:', error);
          this.logout();
          return of(null);
        })
      )
      .subscribe(user => {
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          console.log('User erfolgreich vom Backend geladen:', user.email);
        }
      });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store token and user - FIXED: use 'auth_token' everywhere
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap(response => {
          // Store token and user after successful registration - FIXED: use 'auth_token' everywhere
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null && !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Öffentliche Methode zum manuellen Neuladen des Users
   */
  reloadCurrentUser(): Observable<User | null> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(
        tap(user => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Fehler beim Neuladen des Users:', error);
          return of(null);
        })
      );
  }
}
