import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Microsoft Clarity Service – minimaler, consent-fähiger Wrapper.
 *
 * ─── Aktivierung ────────────────────────────────────────────────
 * Clarity-Projekt-ID in environment.prod.ts setzen:
 *   clarityId: 'abc123xyz0'
 * Leer ('') → komplett no-op, kein Script-Tag, kein Tracking.
 * In Dev (environment.ts) bleibt clarityId: '' → nie aktiv auf localhost.
 *
 * ─── Was Clarity trackt ─────────────────────────────────────────
 *  - Session Recordings (Nutzerverhalten aufzeichnen)
 *  - Heatmaps (Klick- und Scroll-Maps)
 *  - PageViews (automatisch)
 *  - Custom Events via clarity('set', key, value)
 *
 * ─── Deaktivieren ───────────────────────────────────────────────
 * clarityId: '' in environment.prod.ts → Frontend neu bauen → deployen.
 * Kein Restart des Backends nötig.
 *
 * ─── Consent-Gate (TODO) ────────────────────────────────────────
 * Aktuell wird init() sofort beim App-Start aufgerufen.
 * Für DSGVO-Compliance: init() erst nach explizitem Consent aufrufen.
 *
 * ─── Prüfen ob Clarity läuft ────────────────────────────────────
 * Browser DevTools → Network-Tab → Filter: "clarity"
 * → clarity.js sollte erscheinen wenn ID korrekt konfiguriert.
 * Oder: window.clarity in der Browser-Konsole → function = aktiv.
 */
declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class ClarityService {

  private readonly clarityId: string;
  private readonly maskData: boolean;
  private initialized = false;

  constructor() {
    const env = environment as Record<string, any>;
    const raw: string = typeof env['clarityId'] === 'string' ? env['clarityId'].trim() : '';
    // Platzhalter-Erkennung ohne Literal-String im Bundle:
    // Ein nicht ersetzter CI-Platzhalter hat immer das Muster __XYZ__ (Doppel-Underscore am Anfang und Ende).
    const isUnreplacedPlaceholder = raw.startsWith('__') && raw.endsWith('__') && raw.length > 4;
    this.clarityId = isUnreplacedPlaceholder ? '' : raw;
    
    // Anonymisierung / Cookie Masking aus environment lesen (default: false = keine Maskierung)
    this.maskData = typeof env['clarityMaskData'] === 'boolean' ? env['clarityMaskData'] : false;
  }

  /**
   * Clarity initialisieren.
   * Lädt clarity.js dynamisch und richtet den Tracking-Stub ein.
   * No-op wenn:
   *  - keine Clarity-ID konfiguriert (leer)
   *  - nicht in Production (environment.production === false)
   *  - bereits initialisiert
   */
  init(): void {
    if (!this.clarityId || !environment.production || this.initialized) {
      if (!environment.production && this.clarityId) {
        console.info('%c[Clarity] Tracking deaktiviert in DEV-Modus', 'color:#0078d4;font-weight:700');
      }
      return;
    }
    this.initialized = true;

    // Clarity-Stub einrichten (Aufrufe werden intern gequeued bis Script geladen ist)
    this.setupClarityStub();

    // Cookie Masking / IP-Anonymisierung konfigurieren
    // false = Volle Daten (DEFAULT)
    // true  = IP-Adressen und sensible Daten werden maskiert
    if (window.clarity) {
      window.clarity('consent', this.maskData ? 'mask' : 'unmask');
    }

    // clarity.js async laden (non-blocking, lädt nach allem anderen)
    const src = `https://www.clarity.ms/tag/${this.clarityId}`;
    this.loadScript(src);

    const status = this.maskData ? 'MIT Maskierung' : 'OHNE Maskierung (volle Daten)';
    console.info(`%c[Clarity] Initialized - ${status}`, 'color:#0078d4;font-weight:700');
  }

  /**
   * Custom Tag setzen – erscheint in Clarity als Filter-Dimension.
   * Beispiel: setTag('page', 'create-store') oder setTag('userType', 'anonymous')
   *
   * @param key    Tag-Name (z.B. 'flow', 'userType', 'store')
   * @param value  Tag-Wert (z.B. 'create-store', 'anonymous', '42')
   */
  setTag(key: string, value: string): void {
    if (!this.isReady()) return;
    window.clarity!('set', key, value);
  }

  /**
   * Clarity Custom Event senden.
   * Erscheint in Clarity unter "Custom Events" → filterbar.
   *
   * @param eventName  z.B. 'store_created', 'phone_auth_started'
   */
  event(eventName: string): void {
    if (!this.isReady()) return;
    window.clarity!('event', eventName);
  }

  /**
   * Identifiziert den User in Clarity-Sessions.
   * Nützlich um anonyme Sessions einem bekannten User zuzuordnen.
   *
   * @param userId  Interne User-ID (keine PII wie E-Mail!)
   */
  identify(userId: string): void {
    if (!this.isReady()) return;
    window.clarity!('identify', userId);
  }

  /** Gibt true zurück wenn Clarity aktiv und bereit ist. */
  isReady(): boolean {
    return this.initialized && typeof window.clarity === 'function';
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Richtet den Clarity-Stub ein.
   * Stellt sicher dass clarity()-Aufrufe gequeued werden bis das Script lädt.
   * Exakt das gleiche Pattern wie in der offiziellen Clarity-Dokumentation.
   */
  private setupClarityStub(): void {
    if (window.clarity) return; // Bereits vorhanden

    const c = function(...args: any[]) {
      (c as any).q = (c as any).q || [];
      (c as any).q.push(args);
    } as any;

    window.clarity = c;
  }

  /** Lädt ein externes Script async (non-blocking). */
  private loadScript(src: string): void {
    if (document.querySelector(`script[src*="clarity.ms"]`)) return; // bereits geladen

    const script   = document.createElement('script');
    script.src     = src;
    script.async   = true;

    // Fehler still abfangen – kein JS-Error wenn z.B. AdBlocker aktiv
    script.onerror = () => {
      console.warn('[Clarity] clarity.js konnte nicht geladen werden (AdBlocker / Netzwerk?)');
      this.initialized = false;
    };

    document.head.appendChild(script);
  }
}

