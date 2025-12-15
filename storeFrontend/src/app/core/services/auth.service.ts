import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load user from localStorage if exists
    const token = this.getToken();
    if (token) {
      // Could validate token with backend here
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store token and user
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap(response => {
          // Store token and user after successful registration
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null && !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
