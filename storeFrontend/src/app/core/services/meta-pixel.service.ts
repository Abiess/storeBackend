import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Typisierung für window.fbq (Meta Pixel SDK).
 * Verhindert TypeScript-Fehler bei fbq-Aufrufen.
 */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

/**
 * Meta/Facebook Pixel Service – minimaler, consent-fähiger Wrapper.
 *
 * ─── Aktivierung ────────────────────────────────────────────────
 * Pixel ID in environment.ts / environment.prod.ts setzen:
 *   metaPixelId: '1234567890123456'
 * Leer ('') → komplett no-op, kein Script-Tag, kein fbq-Aufruf.
 *
 * ─── Consent-Gate (TODO) ────────────────────────────────────────
 * Aktuell wird init() sofort beim App-Start aufgerufen.
 * Vor DSGVO/RGPD-Compliance: init() erst nach Consent aufrufen:
 *
 *   // Im CookieConsentService:
 *   onConsentGranted() {
 *     this.metaPixel.init();
 *   }
 *
 * ─── Getrackter Events ──────────────────────────────────────────
 *  - PageView       → bei jeder Router-Navigation (AppComponent)
 *  - WhatsAppClick  → Custom Event via WhatsappTrackingService
 *
 * ─── Kein Blocking ──────────────────────────────────────────────
 * Das fbevents.js Script wird async + defer geladen.
 * Alle fbq()-Aufrufe werden intern von FB gequeued bis Script fertig ist.
 */
@Injectable({ providedIn: 'root' })
export class MetaPixelService {

  private readonly pixelId: string;
  private initialized = false;

  constructor() {
    const env = environment as Record<string, any>;
    this.pixelId = typeof env['metaPixelId'] === 'string'
      ? env['metaPixelId'].trim()
      : '';
  }

  /**
   * Pixel initialisieren.
   * Lädt fbevents.js dynamisch und ruft fbq('init', pixelId) auf.
   * No-op wenn keine Pixel-ID konfiguriert oder bereits initialisiert.
   *
   * TODO(consent): Erst aufrufen nachdem User Tracking zugestimmt hat.
   */
  init(): void {
    if (!this.pixelId || this.initialized) return;
    this.initialized = true;

    // fbq-Stub einrichten (Aufrufe werden intern gequeued bis Script geladen ist)
    this.setupFbqStub();

    // Pixel initialisieren
    window.fbq!('init', this.pixelId);
    window.fbq!('track', 'PageView');

    // fbevents.js async laden (non-blocking)
    this.loadScript('https://connect.facebook.net/en_US/fbevents.js');

    if (!environment.production) {
      console.info('%c[MetaPixel] Initialized%c pixelId:', 'color:#1877f2;font-weight:700', 'color:inherit', this.pixelId);
    }
  }

  /**
   * PageView-Event senden.
   * Typischer Aufruf: bei jeder NavigationEnd in AppComponent.
   */
  trackPageView(): void {
    if (!this.isReady()) return;
    window.fbq!('track', 'PageView');
  }

  /**
   * Custom Event senden – generisch nutzbar.
   *
   * @param eventName  Name des Custom Events (z.B. 'WhatsAppClick')
   * @param data       Optionale Event-Daten (werden an Pixel gesendet)
   */
  trackCustom(eventName: string, data?: Record<string, any>): void {
    if (!this.isReady()) return;
    window.fbq!('trackCustom', eventName, data ?? {});

    if (!environment.production) {
      console.info(
        `%c[MetaPixel] trackCustom%c ${eventName}`,
        'color:#1877f2;font-weight:700', 'color:inherit',
        data ?? {}
      );
    }
  }

  /**
   * Standard Pixel-Event senden (z.B. 'Purchase', 'ViewContent').
   * Für Standard-Events aus dem Meta Events-Katalog.
   */
  track(eventName: string, data?: Record<string, any>): void {
    if (!this.isReady()) return;
    window.fbq!('track', eventName, data ?? {});
  }

  /** Gibt true zurück wenn Pixel aktiv ist und fbq verfügbar ist. */
  isReady(): boolean {
    return this.initialized && typeof window.fbq === 'function';
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Richtet den fbq-Stub ein (Standard-FB-Initialisierungs-Pattern).
   * Stellt sicher dass fbq()-Aufrufe gequeued werden bis das Script lädt.
   */
  private setupFbqStub(): void {
    if (window.fbq) return; // Bereits vorhanden

    const fbq = function(...args: any[]) {
      (fbq as any).callMethod
        ? (fbq as any).callMethod(...args)
        : (fbq as any).queue.push(args);
    } as any;

    fbq.push  = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue   = [];

    window.fbq  = fbq;
    window._fbq = fbq;
  }

  /** Lädt ein externes Script async + defer (non-blocking). */
  private loadScript(src: string): void {
    if (document.querySelector(`script[src="${src}"]`)) return; // bereits geladen

    const script    = document.createElement('script');
    script.src      = src;
    script.async    = true;
    script.defer    = true;

    // Fehler still abfangen – kein JS-Error wenn z.B. AdBlocker aktiv
    script.onerror  = () => {
      if (!environment.production) {
        console.warn('[MetaPixel] fbevents.js konnte nicht geladen werden (AdBlocker?)');
      }
    };

    document.head.appendChild(script);
  }
}

