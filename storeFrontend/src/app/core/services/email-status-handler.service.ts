import { Injectable } from '@angular/core';
import { TeamInvitationResponse } from '../models';

/**
 * Email Operation Response vom Backend (nach Registrierung, Passwort-Reset, etc.)
 */
export interface EmailOperationResponse {
  operationSuccessful: boolean;
  emailSent: boolean;
  emailStatus: string;  // 'SENT' | 'TEMPORARILY_FAILED' | 'PERMANENTLY_FAILED'
  errorCode?: string;   // 'SMTP_DAILY_LIMIT' | 'SMTP_AUTH_FAILED' | 'RATE_LIMIT_EXCEEDED' | etc.
  message: string;
  retryAllowed: boolean;
}

/**
 * Registration Response (erweitert um Email-Status)
 */
export interface RegistrationResponse {
  registrationSuccessful: boolean;
  emailVerificationRequired: boolean;
  emailSent: boolean;
  emailStatus: string;
  emailErrorCode?: string;
  email: string;
  message: string;
  retryAllowed: boolean;
}

/**
 * Ergebnis der Status-Auflösung
 */
export interface EmailStatusResult {
  severity: 'success' | 'warning' | 'error';
  messageKey: string;
  icon: string;
}

/**
 * Zentraler Service zur Behandlung von E-Mail-Versandstatus
 * 
 * Verwendung:
 * - Nach Registrierung
 * - Nach Passwort-Reset
 * - Nach Team-Einladung
 * - Nach Bestellbestätigung
 */
@Injectable({
  providedIn: 'root'
})
export class EmailStatusHandlerService {

  /**
   * Übersetzt Backend-Response in benutzerfreundliche Message-Keys und Severity
   */
  resolve(response: EmailOperationResponse | RegistrationResponse | TeamInvitationResponse): EmailStatusResult {
    // Erfolg: E-Mail versendet
    if (response.emailSent) {
      return {
        severity: 'success',
        messageKey: 'email.sent',
        icon: '✅'
      };
    }

    // Fehler: E-Mail konnte nicht versendet werden
    // Typ-sichere Auflösung: emailErrorCode (RegistrationResponse) oder errorCode (EmailOperationResponse)
    let errorCode: string | null | undefined;
    if ('emailErrorCode' in response) {
      errorCode = response.emailErrorCode;
    } else if ('errorCode' in response) {
      errorCode = (response as EmailOperationResponse).errorCode;
    }
    
    switch (errorCode) {
      case 'SMTP_DAILY_LIMIT':
        return {
          severity: 'warning',
          messageKey: 'email.dailyLimit',
          icon: '⚠️'
        };

      case 'SMTP_AUTH_FAILED':
        return {
          severity: 'error',
          messageKey: 'email.configurationError',
          icon: '❌'
        };

      case 'RATE_LIMIT_EXCEEDED':
        return {
          severity: 'warning',
          messageKey: 'email.rateLimitExceeded',
          icon: '⏱️'
        };

      case 'MAIL_DISABLED':
      case 'FEATURE_DISABLED':
        return {
          severity: 'warning',
          messageKey: 'email.serviceDisabled',
          icon: '🚫'
        };

      case 'INVALID_RECIPIENT':
        return {
          severity: 'error',
          messageKey: 'email.invalidRecipient',
          icon: '❌'
        };

      case 'TEMPORARILY_FAILED':
      case 'SMTP_UNAVAILABLE':
      case 'UNKNOWN_EMAIL_ERROR':
      default:
        return {
          severity: 'warning',
          messageKey: 'email.temporarilyUnavailable',
          icon: '⚠️'
        };
    }
  }

  /**
   * Prüft ob Retry erlaubt ist
   */
  canRetry(response: EmailOperationResponse | RegistrationResponse): boolean {
    return response.retryAllowed === true;
  }

  /**
   * Gibt spezifische Hilfe-Message basierend auf Error-Code
   */
  getHelpMessage(errorCode?: string): string | null {
    switch (errorCode) {
      case 'SMTP_DAILY_LIMIT':
        return 'email.help.dailyLimit';
      case 'RATE_LIMIT_EXCEEDED':
        return 'email.help.rateLimitExceeded';
      default:
        return null;
    }
  }
}
