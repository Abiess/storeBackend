import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface BannerTexts {
  de?: string;
  en?: string;
  ar?: string;
  [lang: string]: string | undefined;
}

export interface BannerSettings {
  storeId: number;
  enabled: boolean;
  /** 'top' | 'bottom' */
  position: string;
  bgColor: string;
  textColor: string;
  /** px/s – 0 = statisch */
  animationSpeed: number;
  texts: BannerTexts;
  icon?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Liefert Client-seitige Default-Einstellungen.
   * Wird genutzt wenn:
   *  – API antwortet mit 204 (kein DB-Eintrag, noch nicht konfiguriert)
   *  – API-Fehler (Netzwerk, Timeout, etc.)
   * Default = enabled:true → Banner sofort sichtbar ohne Konfiguration.
   */
  private buildClientDefault(storeId: number = 0): BannerSettings {
    return {
      storeId,
      enabled: true,
      position: 'top',
      bgColor: '#667eea',
      textColor: '#ffffff',
      animationSpeed: 60,
      texts: {
        de: '🎉 Heute Rabatt auf ausgewählte Produkte!',
        en: '🎉 Special discounts available today!',
        ar: '🎉 خصومات مميزة متوفرة اليوم!'
      }
    };
  }

  /**
   * Public: Storefront – kein Auth.
   *
   * Logik:
   * • 204 No Content           → noch nie konfiguriert → Client-Default (enabled=true)
   * • 200 + enabled=false      → prüfen ob jemals gespeichert (updatedAt):
   *     – updatedAt fehlt/null → Backend-Default, nie explizit gespeichert → Client-Default
   *     – updatedAt vorhanden  → Admin hat bewusst deaktiviert → respektieren (kein Banner)
   * • 200 + enabled=true       → zeigen
   * • Fehler                   → Client-Default (Storefront crasht nie wegen Banner)
   */
  getPublicBanner(storeId: number): Observable<BannerSettings> {
    // Füge Timestamp hinzu um Browser-Cache zu umgehen
    const timestamp = new Date().getTime();
    return this.http.get<BannerSettings>(
      `${this.base}/public/stores/${storeId}/banner?t=${timestamp}`,
      { observe: 'response' }
    ).pipe(
      map(response => {
        // 204 = noch nicht konfiguriert → Defaults anzeigen
        if (response.status === 204 || !response.body) {
          return this.buildClientDefault(storeId);
        }
        const settings = response.body;
        // enabled=false OHNE updatedAt = Server-Default, Admin hat nie gespeichert → Defaults
        // enabled=false MIT updatedAt  = Admin hat explizit deaktiviert → respektieren
        if (!settings.enabled && !settings.updatedAt) {
          return this.buildClientDefault(storeId);
        }
        return settings;
      }),
      catchError(() => of(this.buildClientDefault(storeId)))
    );
  }

  /** Admin: aktuellen Banner-Stand laden (mit Auth) */
  getAdminBanner(storeId: number): Observable<BannerSettings> {
    return this.http.get<BannerSettings>(
      `${this.base}/stores/${storeId}/banner`
    );
  }

  /** Admin: Banner-Einstellungen speichern */
  saveBanner(storeId: number, settings: Partial<BannerSettings>): Observable<BannerSettings> {
    return this.http.put<BannerSettings>(
      `${this.base}/stores/${storeId}/banner`,
      settings
    );
  }
}

