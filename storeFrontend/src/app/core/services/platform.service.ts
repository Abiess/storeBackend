import { Injectable } from '@angular/core';

/**
 * PlatformService – abstrahiert Web vs. Native (Capacitor) Kontext.
 *
 * MUSS überall statt direktem window.location.hostname-Check verwendet werden,
 * sobald die App als Capacitor-App (Android/iOS) läuft.
 *
 * Capacitor-Kontext: window.Capacitor.isNativePlatform() === true
 * → hostname ist immer "localhost" → kein Subdomain-Check möglich
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {

  /** true = Capacitor Native App (iOS/Android), false = Web Browser */
  readonly isNative: boolean = this.detectCapacitor();

  /** true = Mobiles Gerät (Web ODER Native, basierend auf UserAgent + Viewport-Breite) */
  readonly isMobile: boolean = this.detectMobile();

  /** true = iOS-Gerät (WebView oder Safari) */
  readonly isIos: boolean = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  /** true = Android-Gerät */
  readonly isAndroid: boolean = /Android/i.test(navigator.userAgent);

  /** Gibt true zurück wenn RTL-Sprache aktiv ist */
  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  private detectCapacitor(): boolean {
    try {
      return typeof (window as any).Capacitor !== 'undefined' &&
             (window as any).Capacitor.isNativePlatform?.() === true;
    } catch {
      return false;
    }
  }

  private detectMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }

  /**
   * Gibt an ob wir auf einer Storefront-Subdomain sind.
   * Im Native-Kontext (Capacitor) immer false – Store wird über /s/:slug geöffnet.
   */
  isStorefrontSubdomain(): boolean {
    if (this.isNative) return false; // Im App-Kontext keine Subdomain-Erkennung möglich
    const hostname = window.location.hostname;
    return hostname.endsWith('.markt.ma') &&
           hostname !== 'markt.ma' &&
           hostname !== 'www.markt.ma' &&
           hostname !== 'api.markt.ma' &&
           hostname !== 'grafana.markt.ma';
  }

  /**
   * Gibt den aktuellen Hostname zurück.
   * Sicherheitsabstraktion für Capacitor-Kontext.
   */
  getHostname(): string {
    return window.location.hostname;
  }

  /**
   * Gibt den Plattform-Namen zurück für Debugging/Analytics.
   */
  getPlatformName(): 'ios' | 'android' | 'web' {
    if (!this.isNative) return 'web';
    if (this.isIos) return 'ios';
    if (this.isAndroid) return 'android';
    return 'web';
  }
}

