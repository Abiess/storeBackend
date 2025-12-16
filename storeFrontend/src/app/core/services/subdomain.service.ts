import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface SubdomainInfo {
  isSubdomain: boolean;
  subdomain: string | null;
  storeId: number | null;
  storeName: string | null;
  slug: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SubdomainService {
  private baseDomain = 'markt.ma';
  private subdomainInfo: SubdomainInfo | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Analysiert die aktuelle Domain und prüft ob es eine Subdomain ist
   */
  detectSubdomain(): SubdomainInfo {
    if (this.subdomainInfo) {
      return this.subdomainInfo;
    }

    const hostname = window.location.hostname;
    console.log('🌐 Detecting subdomain from hostname:', hostname);

    // Entwicklungsumgebung (localhost)
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      this.subdomainInfo = {
        isSubdomain: false,
        subdomain: null,
        storeId: null,
        storeName: null,
        slug: null
      };
      return this.subdomainInfo;
    }

    // Hauptdomain (markt.ma oder www.markt.ma)
    if (hostname === this.baseDomain || hostname === `www.${this.baseDomain}`) {
      this.subdomainInfo = {
        isSubdomain: false,
        subdomain: null,
        storeId: null,
        storeName: null,
        slug: null
      };
      return this.subdomainInfo;
    }

    // API-Subdomain (api.markt.ma) - keine Storefront
    if (hostname === `api.${this.baseDomain}`) {
      this.subdomainInfo = {
        isSubdomain: false,
        subdomain: null,
        storeId: null,
        storeName: null,
        slug: null
      };
      return this.subdomainInfo;
    }

    // Subdomain erkannt (z.B. abc.markt.ma)
    if (hostname.endsWith(`.${this.baseDomain}`)) {
      const subdomain = hostname.replace(`.${this.baseDomain}`, '');
      console.log('✅ Subdomain erkannt:', subdomain);

      this.subdomainInfo = {
        isSubdomain: true,
        subdomain: subdomain,
        storeId: null, // Wird später vom Backend geladen
        storeName: null,
        slug: subdomain
      };
      return this.subdomainInfo;
    }

    // Keine Subdomain
    this.subdomainInfo = {
      isSubdomain: false,
      subdomain: null,
      storeId: null,
      storeName: null,
      slug: null
    };
    return this.subdomainInfo;
  }

  /**
   * Lädt Store-Informationen basierend auf der aktuellen Subdomain
   */
  resolveStore(): Observable<SubdomainInfo> {
    const info = this.detectSubdomain();

    if (!info.isSubdomain || !info.slug) {
      return of(info);
    }

    const hostname = window.location.hostname;
    console.log('🔍 Resolving store for hostname:', hostname);

    // Rufe Backend API auf um Store zu laden
    return this.http.get<any>(`${environment.apiUrl}/public/store/resolve?host=${hostname}`)
      .pipe(
        map(response => {
          console.log('✅ Store resolved:', response);
          this.subdomainInfo = {
            isSubdomain: true,
            subdomain: info.subdomain,
            storeId: response.storeId,
            storeName: response.name,
            slug: response.slug
          };
          return this.subdomainInfo;
        }),
        catchError(error => {
          console.error('❌ Failed to resolve store:', error);
          return of(info);
        })
      );
  }

  /**
   * Gibt die aktuelle Subdomain-Info zurück
   */
  getSubdomainInfo(): SubdomainInfo | null {
    return this.subdomainInfo;
  }

  /**
   * Prüft ob die aktuelle Domain eine Storefront-Subdomain ist
   */
  isStorefrontSubdomain(): boolean {
    const info = this.detectSubdomain();
    return info.isSubdomain;
  }

  /**
   * Gibt die Store-ID der aktuellen Subdomain zurück
   */
  getCurrentStoreId(): number | null {
    return this.subdomainInfo?.storeId || null;
  }

  /**
   * Setzt die Subdomain-Info zurück (für Tests)
   */
  reset(): void {
    this.subdomainInfo = null;
  }
}

