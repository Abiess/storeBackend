import { Observable, of, delay } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { MOCK_USER } from './mock-data';

export class MockAuthService {
  register(request: RegisterRequest): Observable<AuthResponse> {
    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Math.random().toString(36).substring(7),
      user: { ...MOCK_USER, email: request.email }
    };
    return of(response).pipe(delay(500));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    const response: AuthResponse = {
      token: 'mock-jwt-token-' + Math.random().toString(36).substring(7),
      user: MOCK_USER
    };
    return of(response).pipe(delay(500));
  }

  getMe(): Observable<User> {
    return of(MOCK_USER).pipe(delay(300));
  }
}

