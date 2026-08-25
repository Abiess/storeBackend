import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * PWA Installation Service
 * 
 * Ermöglicht Nutzern die Installation von markt.ma als App auf:
 * - Android (Chrome, Samsung Internet)
 * - Desktop (Chrome, Edge, Brave)
 * - iOS/iPadOS (Safari via "Zum Home-Bildschirm")
 * 
 * ─── Nutzung ────────────────────────────────────────────────────
 * 
 * ```typescript
 * // In einer Komponente:
 * constructor(public pwaInstall: PwaInstallService) {}
 * 
 * // Template (Android/Chrome/Desktop):
 * <button *ngIf="pwaInstall.canInstall$ | async" 
 *         (click)="pwaInstall.install()">
 *   📱 Als App installieren
 * </button>
 * 
 * // Template (iOS/Safari):
 * <div *ngIf="pwaInstall.showIOSInstructions$ | async">
 *   <p>Tippe auf Teilen → Zum Home-Bildschirm</p>
 * </div>
 * ```
 * 
 * ─── Plattform-Verhalten ───────────────────────────────────────
 * 
 * **Android / Chrome / Desktop Chromium:**
 * - `beforeinstallprompt` Event wird abgefangen
 * - `canInstall$` wird `true`
 * - User klickt Button → Native Install-Dialog erscheint
 * 
 * **iPhone / iPad Safari:**
 * - Kein `beforeinstallprompt` (nicht unterstützt)
 * - `showIOSInstructions$` wird `true` (wenn nicht standalone)
 * - User sieht Anleitung: "Teilen → Zum Home-Bildschirm"
 * 
 * **Bereits installiert:**
 * - `isStandalone$` wird `true`
 * - Alle Install-CTAs werden ausgeblendet
 * 
 * ─── Installation Detection ────────────────────────────────────
 * 
 * Erkennt Installation über:
 * - `display-mode: standalone` (CSS Media Query)
 * - `navigator.standalone` (iOS Safari)
 * - `appinstalled` Event (Android/Chrome)
 */

// TypeScript Interface für beforeinstallprompt Event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Window Interface erweitern für TypeScript
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
  interface Navigator {
    standalone?: boolean; // iOS Safari
  }
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  
  /**
   * Observable: Kann die App installiert werden?
   * true = Android/Chrome/Desktop hat beforeinstallprompt gefeuert
   */
  canInstall$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable: Läuft die App bereits im Standalone-Modus?
   * true = App ist installiert und läuft ohne Browser-Chrome
   */
  isStandalone$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable: Soll iOS-Installationsanleitung angezeigt werden?
   * true = iOS/Safari UND nicht standalone UND nicht im normalen Chrome
   */
  showIOSInstructions$ = new BehaviorSubject<boolean>(false);

  /**
   * Plattform-Detection
   */
  private readonly isIOS: boolean;
  private readonly isAndroid: boolean;
  private readonly isMobile: boolean;

  /**
   * Gecachtes beforeinstallprompt Event (nur Android/Chrome/Desktop)
   */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    // Plattform erkennen
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    this.isAndroid = /android/.test(ua);
    this.isMobile = this.isIOS || this.isAndroid || /mobile/.test(ua);

    // Standalone-Mode erkennen
    this.detectStandaloneMode();

    // beforeinstallprompt Event abfangen (Android/Chrome/Desktop)
    this.listenForInstallPrompt();

    // appinstalled Event (Installation erfolgreich)
    this.listenForAppInstalled();

    // iOS-Instructions-Flag setzen
    this.updateIOSInstructions();
  }

  /**
   * Erkennt ob App bereits im Standalone-Modus läuft.
   * 
   * Methoden:
   * 1. CSS Media Query: display-mode: standalone
   * 2. iOS Safari: navigator.standalone
   */
  private detectStandaloneMode(): void {
    // Methode 1: CSS Media Query (funktioniert auf allen Plattformen)
    const isStandaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches;
    
    // Methode 2: iOS Safari (navigator.standalone)
    const isIOSStandalone = this.isIOS && navigator.standalone === true;

    const isStandalone = isStandaloneMediaQuery || isIOSStandalone;
    
    this.isStandalone$.next(isStandalone);

    if (isStandalone) {
      console.info('[PWA Install] App läuft im Standalone-Modus (bereits installiert)');
    }
  }

  /**
   * Lauscht auf beforeinstallprompt Event.
   * 
   * Nur auf Android/Chrome/Desktop verfügbar.
   * iOS Safari feuert dieses Event nicht.
   */
  private listenForInstallPrompt(): void {
    fromEvent<BeforeInstallPromptEvent>(window, 'beforeinstallprompt')
      .pipe(take(1)) // Nur einmal pro Session
      .subscribe((event: BeforeInstallPromptEvent) => {
        // Standardverhalten verhindern (Mini-Banner unterdrücken)
        event.preventDefault();

        // Event für später speichern
        this.deferredPrompt = event;

        // canInstall auf true setzen
        this.canInstall$.next(true);

        console.info('[PWA Install] beforeinstallprompt Event empfangen, Installation möglich');
        console.info('[PWA Install] Plattformen:', event.platforms);
      });
  }

  /**
   * Lauscht auf appinstalled Event.
   * 
   * Feuert wenn User die App erfolgreich installiert hat.
   */
  private listenForAppInstalled(): void {
    fromEvent(window, 'appinstalled')
      .subscribe(() => {
        console.info('[PWA Install] App erfolgreich installiert (appinstalled Event)');
        
        // Install-Prompt zurücksetzen
        this.deferredPrompt = null;
        this.canInstall$.next(false);

        // Standalone-Mode sollte jetzt true sein (bei nächstem Start)
        // Aber für aktuelle Session manuell setzen
        this.isStandalone$.next(true);
        this.updateIOSInstructions();
      });
  }

  /**
   * Update iOS-Instructions-Flag basierend auf Plattform und Standalone-Status.
   */
  private updateIOSInstructions(): void {
    // iOS-Anleitung nur zeigen wenn:
    // 1. iOS/Safari
    // 2. Nicht standalone
    // 3. Nicht im normalen Chrome (hat beforeinstallprompt)
    const shouldShow = this.isIOS && 
                      !this.isStandalone$.value && 
                      !this.canInstall$.value;
    
    this.showIOSInstructions$.next(shouldShow);
  }

  /**
   * Installiert die App (Android/Chrome/Desktop).
   * 
   * Zeigt den nativen Install-Dialog des Browsers.
   * 
   * @returns Promise<boolean> true wenn User installiert hat, false wenn abgebrochen
   */
  async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA Install] Kein beforeinstallprompt Event verfügbar');
      return false;
    }

    try {
      console.info('[PWA Install] Zeige nativen Install-Dialog...');

      // Nativen Install-Dialog anzeigen
      await this.deferredPrompt.prompt();

      // Warten auf User-Entscheidung
      const { outcome } = await this.deferredPrompt.userChoice;

      console.info('[PWA Install] User-Entscheidung:', outcome);

      // Event verwerfen (kann nur einmal verwendet werden)
      this.deferredPrompt = null;
      this.canInstall$.next(false);

      // Bei iOS-Instructions-Update
      this.updateIOSInstructions();

      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA Install] Fehler beim Installieren:', error);
      return false;
    }
  }

  /**
   * Installationsangebot verwerfen.
   * 
   * User hat "Nein danke" geklickt → Banner ausblenden.
   * Installation bleibt verfügbar, Banner wird nicht mehr angezeigt.
   */
  dismiss(): void {
    console.info('[PWA Install] Installationsangebot verworfen');
    this.canInstall$.next(false);
    this.updateIOSInstructions();
  }

  /**
   * Gibt aktuelle Plattform-Info zurück (für Debugging/Logging).
   */
  getPlatformInfo(): {
    isIOS: boolean;
    isAndroid: boolean;
    isMobile: boolean;
    isStandalone: boolean;
    canInstall: boolean;
    showIOSInstructions: boolean;
  } {
    return {
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      isMobile: this.isMobile,
      isStandalone: this.isStandalone$.value,
      canInstall: this.canInstall$.value,
      showIOSInstructions: this.showIOSInstructions$.value
    };
  }
}
