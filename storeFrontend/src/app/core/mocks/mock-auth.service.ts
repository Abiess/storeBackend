import { Observable, of, delay, throwError } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { MOCK_USER } from './mock-data';

// Mock Credentials für Testing
export const MOCK_CREDENTIALS = {
  email: 'demo@markt.ma',
  password: 'demo123'
};

export class MockAuthService {
  register(request: RegisterRequest): Observable<AuthResponse> {
    // Simuliere erfolgreiche Registrierung
    const newUser: User = {
      id: Math.floor(Math.random() * 10000),
      email: request.email,
      name: request.name,
      role: 'ROLE_STORE_OWNER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Math.random().toString(36).substring(7),
      user: newUser
    };
    return of(response).pipe(delay(500));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    // Prüfe Mock-Credentials (mit Trimming für Robustheit)
    const email = request.email?.trim().toLowerCase();
    const password = request.password?.trim();

    console.log('Mock Login Versuch:', { email, password });
    console.log('Erwartete Credentials:', MOCK_CREDENTIALS);

    // Akzeptiere sowohl demo@markt.ma als auch demo@markt.de
    const validEmails = ['demo@markt.ma', 'demo@markt.de'];

    if (validEmails.includes(email || '') && password === MOCK_CREDENTIALS.password) {
      const response: AuthResponse = {
        token: 'mock-jwt-token-' + Math.random().toString(36).substring(7),
        user: MOCK_USER
      };
      console.log('Mock Login erfolgreich!', response);
      return of(response).pipe(delay(500));
    } else {
      // Simuliere Fehlschlag bei falschen Credentials
      console.log('Mock Login fehlgeschlagen - Credentials stimmen nicht überein');
      return throwError(() => ({
        error: { message: 'Ungültige E-Mail oder Passwort' }
      })).pipe(delay(500));
    }
  }

  getMe(): Observable<User> {
    return of(MOCK_USER).pipe(delay(300));
  }
}
