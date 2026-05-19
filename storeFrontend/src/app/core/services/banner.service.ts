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

  /** Public: Storefront – kein Auth. Gibt null zurück wenn Banner deaktiviert oder Fehler. */
  getPublicBanner(storeId: number): Observable<BannerSettings | null> {
    return this.http.get<BannerSettings>(
      `${this.base}/public/stores/${storeId}/banner`,
      // Wichtig: 204 No Content nicht als Fehler behandeln
      { observe: 'response' }
    ).pipe(
      map(response => response.status === 204 || !response.body ? null : response.body),
      catchError(() => of(null))
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

