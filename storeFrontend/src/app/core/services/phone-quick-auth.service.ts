import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export interface PhoneCodeRequest {
  phoneNumber: string;
  channel?: 'whatsapp' | 'telegram';
}

export interface PhoneCodeResponse {
  success: boolean;
  verificationId: number;
  channel: string;
  message: string;
  expiresInMinutes: number;
  devCode?: string; // nur im DEV-Modus (whatsapp.enabled=false), sonst undefined
}

export interface PhoneVerifyRequest {
  verificationId: number;
  code: string;
}

export interface PhoneAuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    roles: string[];
  };
}

/**
 * Service für den "Schnellstart ohne E-Mail"-Flow.
 * Nutzer authentifizieren sich via WhatsApp/Telegram-Code.
 *
 * Endpoints:
 *   POST /api/auth/phone/request-code
 *   POST /api/auth/phone/verify-and-login
 */
@Injectable({ providedIn: 'root' })
export class PhoneQuickAuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth/phone`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Schritt 1: Code per WhatsApp/Telegram senden lassen
   */
  requestCode(phoneNumber: string, channel: 'whatsapp' | 'telegram' = 'whatsapp'): Observable<PhoneCodeResponse> {
    return this.http.post<PhoneCodeResponse>(`${this.baseUrl}/request-code`, {
      phoneNumber,
      channel
    });
  }

  /**
   * Schritt 2: Code verifizieren → JWT Token erhalten
   * Speichert Token + User in localStorage (wie normaler Login)
   */
  verifyAndLogin(verificationId: number, code: string): Observable<PhoneAuthResponse> {
    return this.http.post<PhoneAuthResponse>(`${this.baseUrl}/verify-and-login`, {
      verificationId,
      code
    }).pipe(
      tap(response => {
        // Wie normaler Login – Token und User speichern
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        // AuthService BehaviorSubject aktualisieren
        (this.authService as any).currentUserSubject?.next(response.user);
        console.log('✅ [PhoneAuth] Login erfolgreich – User:', response.user.id);
      })
    );
  }
}

