import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * hCaptcha Service
 * 
 * Wrapper für hCaptcha-Integration mit Angular.
 * Stellt gemeinsame Konfiguration und Utility-Funktionen bereit.
 * 
 * WICHTIG: Site Key ist ÖFFENTLICH (Frontend), Secret Key ist PRIVAT (Backend)!
 */
@Injectable({
  providedIn: 'root'
})
export class HCaptchaService {

  /**
   * Ist CAPTCHA aktiviert?
   */
  get isEnabled(): boolean {
    return environment.captcha.enabled;
  }

  /**
   * hCaptcha Site Key (öffentlich, für Frontend)
   */
  get siteKey(): string {
    return environment.captcha.siteKey;
  }

  /**
   * CAPTCHA Provider (hcaptcha oder recaptcha)
   */
  get provider(): string {
    return environment.captcha.provider;
  }

  /**
   * Erstellt generisches Error-Handling für CAPTCHA-Fehler
   */
  handleCaptchaError(error: any): string {
    // Status Codes vom Backend
    if (error.status === 429) {
      return 'Zu viele Versuche. Bitte warten Sie einige Minuten.';
    }
    if (error.status === 403 || error.status === 400) {
      // CAPTCHA validation failed
      return 'Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen.';
    }
    if (error.status === 503) {
      return 'Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
    }

    // Generic error
    return error.error?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
  }

  /**
   * Extrahiert benutzerfreundliche Fehlermeldung ohne interne Details
   */
  getSafeErrorMessage(error: any): string {
    // Keine technischen Details oder Sicherheitsregeln an User ausgeben
    const message = this.handleCaptchaError(error);
    
    // Blacklist-spezifische Begriffe entfernen
    if (message.toLowerCase().includes('disposable') || 
        message.toLowerCase().includes('blacklist') ||
        message.toLowerCase().includes('rate limit')) {
      return 'Diese E-Mail-Adresse kann nicht verwendet werden.';
    }

    // Honeypot-spezifisch
    if (message.toLowerCase().includes('honeypot') || 
        message.toLowerCase().includes('bot')) {
      return 'Ungültige Anfrage. Bitte versuchen Sie es erneut.';
    }

    return message;
  }
}
