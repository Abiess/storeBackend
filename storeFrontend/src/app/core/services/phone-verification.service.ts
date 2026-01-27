import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PhoneVerificationRequest {
  phoneNumber: string;
  storeId: string;
  preferredChannel?: string;
}

export interface PhoneVerificationResponse {
  success: boolean;
  verificationId?: number;
  channel?: string;
  message: string;
  expiresInMinutes?: number;
  remainingAttempts?: number;
}

export interface VerifyCodeRequest {
  verificationId: number;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhoneVerificationService {
  private apiUrl = `${environment.apiUrl}/api/public/phone-verification`;

  constructor(private http: HttpClient) {}

  /**
   * Sendet einen Verifizierungscode an die Telefonnummer
   */
  sendVerificationCode(phoneNumber: string, storeId: number): Observable<PhoneVerificationResponse> {
    const request: PhoneVerificationRequest = {
      phoneNumber: phoneNumber.trim(),
      storeId: storeId.toString(),
      preferredChannel: 'whatsapp' // WhatsApp mit SMS-Fallback
    };

    return this.http.post<PhoneVerificationResponse>(
      `${this.apiUrl}/send-code`,
      request
    );
  }

  /**
   * Verifiziert den eingegebenen Code
   */
  verifyCode(verificationId: number, code: string): Observable<PhoneVerificationResponse> {
    const request: VerifyCodeRequest = {
      verificationId,
      code: code.trim()
    };

    return this.http.post<PhoneVerificationResponse>(
      `${this.apiUrl}/verify-code`,
      request
    );
  }

  /**
   * Prüft den Status einer Verifizierung
   */
  checkStatus(verificationId: number): Observable<PhoneVerificationResponse> {
    return this.http.get<PhoneVerificationResponse>(
      `${this.apiUrl}/status/${verificationId}`
    );
  }
}

