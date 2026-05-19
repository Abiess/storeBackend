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
   * • 200 OK + body → Gibt die konfigurierten Settings zurück (enabled=false respektiert)
   * • 204 No Content → Noch nicht konfiguriert → Client-Default mit enabled=true
   * • Fehler         → Client-Default mit enabled=true (Storefront crasht nie wegen Banner)
   */
  getPublicBanner(storeId: number): Observable<BannerSettings> {
    return this.http.get<BannerSettings>(
      `${this.base}/public/stores/${storeId}/banner`,
      { observe: 'response' }
    ).pipe(
      map(response => {
        if (response.status === 204 || !response.body) {
          // 204 = noch nicht konfiguriert → Client-Default anzeigen
          return this.buildClientDefault(storeId);
        }
        return response.body;
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

