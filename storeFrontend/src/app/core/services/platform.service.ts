import { Injectable } from '@angular/core';

/**
 * Diskretes Plattform-Modell für die App Factory (Mobile-Pilot M1).
 *
 * Fachkomponenten sollen NICHT selbst `window.Capacitor`/`navigator`/
 * `matchMedia('(display-mode: standalone)')` abfragen, sondern ausschließlich
 * `PlatformService.type` (bzw. die bestehenden Getter) nutzen.
 */
export enum PlatformType {
  WEB = 'WEB',
  PWA = 'PWA',
  CAPACITOR_IOS = 'CAPACITOR_IOS',
  CAPACITOR_ANDROID = 'CAPACITOR_ANDROID'
}

/**
 * PlatformService – abstrahiert Web vs. PWA vs. Native (Capacitor) Kontext.
 *
 * MUSS überall statt direktem window.location.hostname-Check verwendet werden,
 * sobald die App als Capacitor-App (Android/iOS) läuft.
 *
 * Capacitor-Kontext: window.Capacitor.isNativePlatform() === true
 * → hostname ist immer "localhost" → kein Subdomain-Check möglich
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {

  /** Diskretes Plattform-Modell – bevorzugt gegenüber den Einzel-Flags unten. */
  readonly type: PlatformType = this.detectType();

  /** true = Capacitor Native App (iOS/Android), false = Web Browser (inkl. PWA) */
  readonly isNative: boolean = this.type === PlatformType.CAPACITOR_IOS || this.type === PlatformType.CAPACITOR_ANDROID;

  /** true = als installierte PWA (Homescreen/Standalone-Display-Mode) gestartet */
  readonly isPwa: boolean = this.type === PlatformType.PWA;

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

  private detectStandaloneDisplayMode(): boolean {
    try {
      // iOS Safari (installierte PWA) setzt `navigator.standalone`; alle
      // anderen Browser/Betriebssysteme nutzen die `display-mode`-Media-Query.
      return window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
             (navigator as any).standalone === true;
    } catch {
      return false;
    }
  }

  private detectType(): PlatformType {
    if (this.detectCapacitor()) {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? PlatformType.CAPACITOR_IOS : PlatformType.CAPACITOR_ANDROID;
    }
    if (this.detectStandaloneDisplayMode()) {
      return PlatformType.PWA;
    }
    return PlatformType.WEB;
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


