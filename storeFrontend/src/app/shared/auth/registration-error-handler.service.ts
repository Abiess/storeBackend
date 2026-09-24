import { Injectable } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

/**
 * Registrierungs-Error Codes vom Backend
 */
export type RegistrationErrorCode = 
  | 'EMAIL_ALREADY_EXISTS'
  | 'EMAIL_NOT_VERIFIED'
  | 'CAPTCHA_VALIDATION_FAILED'
  | 'INVALID_EMAIL'
  | 'INVALID_PASSWORD'
  | 'TOO_MANY_REQUESTS'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Registrierungs-Fehler Interface
 */
export interface RegistrationError {
  code: RegistrationErrorCode;
  message: string;
  status?: number;
}

/**
 * Zentraler Service für Registrierungs-Fehlerbehandlung
 * 
 * WICHTIG: Diese Logik wird von ALLEN Registrierungskomponenten verwendet:
 * - register.component.ts (Hauptdomain)
 * - storefront-auth-dialog.component.ts (Subdomains)
 * 
 * Stellt sicher dass:
 * - CAPTCHA nach JEDEM Fehler zurückgesetzt wird
 * - Formularwerte erhalten bleiben
 * - Benutzerfreundliche Fehlermeldungen angezeigt werden
 */
@Injectable({
  providedIn: 'root'
})
export class RegistrationErrorHandler {
  
  constructor(private translationService: TranslationService) {}
  
  /**
   * Konvertiert Backend-Error in standardisierten RegistrationError
   */
  parseError(error: any): RegistrationError {
    // HTTP Status Code
    const status = error.status;
    
    // Error code vom Backend (wenn vorhanden)
    const backendCode = error.error?.error;
    
    // Error message vom Backend
    const backendMessage = error.error?.message;
    
    // Mapping zu standardisierten Codes
    let code: RegistrationErrorCode;
    
    if (status === 409 || backendCode === 'USER_EXISTS' || backendCode === 'EMAIL_ALREADY_EXISTS') {
      code = 'EMAIL_ALREADY_EXISTS';
    } else if (status === 400 && backendCode === 'CAPTCHA_VALIDATION_FAILED') {
      code = 'CAPTCHA_VALIDATION_FAILED';
    } else if (status === 429 || backendCode === 'TOO_MANY_REQUESTS') {
      code = 'TOO_MANY_REQUESTS';
    } else if (status === 0 || !status) {
      // Network error (keine Verbindung zum Server)
      code = 'NETWORK_ERROR';
    } else if (backendMessage?.includes('verify your email') || backendMessage?.includes('email address before logging')) {
      // Email not verified
      code = 'EMAIL_NOT_VERIFIED';
    } else {
      code = 'UNKNOWN_ERROR';
    }
    
    return {
      code,
      message: backendMessage || this.getDefaultMessage(code),
      status
    };
  }
  
  /**
   * Gibt benutzerfreundliche Fehlermeldung zurück
   */
  getDefaultMessage(code: RegistrationErrorCode): string {
    switch (code) {
      case 'EMAIL_ALREADY_EXISTS':
        return this.translationService.translate('auth.emailAlreadyExists') || 
               'This email address is already registered.';
      
      case 'EMAIL_NOT_VERIFIED':
        return this.translationService.translate('auth.emailNotVerified') || 
               'Please verify your email address first.';
      
      case 'CAPTCHA_VALIDATION_FAILED':
        return this.translationService.translate('auth.captchaInvalid') || 
               'CAPTCHA validation failed. Please try again.';
      
      case 'TOO_MANY_REQUESTS':
        return this.translationService.translate('auth.rateLimitExceeded') || 
               'Too many requests. Please try again later.';
      
      case 'NETWORK_ERROR':
        return this.translationService.translate('auth.networkError') || 
               'Network error. Please check your connection and try again.';
      
      case 'UNKNOWN_ERROR':
      default:
        return this.translationService.translate('auth.registrationError') || 
               'Registration failed. Please try again.';
    }
  }
  
  /**
   * Gibt kurzen Hinweistext für bestimmte Fehler zurück
   */
  getHintMessage(code: RegistrationErrorCode): string | null {
    switch (code) {
      case 'EMAIL_ALREADY_EXISTS':
        return this.translationService.translate('auth.emailExistsHint') || 
               'Try logging in or use password reset.';
      
      case 'EMAIL_NOT_VERIFIED':
        return this.translationService.translate('auth.emailNotVerifiedHint') || 
               'Check your inbox and click the confirmation link.';
      
      case 'CAPTCHA_VALIDATION_FAILED':
        return this.translationService.translate('auth.captchaFailedHint') || 
               'The CAPTCHA has been reset. Please solve it again.';
      
      default:
        return null;
    }
  }
  
  /**
   * Prüft ob Formularwerte gelöscht werden sollen
   * 
   * @returns true wenn Form zurückgesetzt werden soll (NIEMALS für Standard-Fehler!)
   */
  shouldClearForm(code: RegistrationErrorCode): boolean {
    // Für Standard-Registrierungsfehler NIEMALS Form löschen!
    // Benutzer soll nur CAPTCHA neu lösen, nicht alles neu eingeben
    return false;
  }
}
