import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, interval, filter, switchMap, catchError, EMPTY } from 'rxjs';

/**
 * PWA Update Management Service
 * 
 * Erkennt automatisch neue App-Versionen nach Production-Deployment
 * und bietet der UI eine kontrollierte Update-Möglichkeit.
 * 
 * ─── Nutzung ────────────────────────────────────────────────────
 * 
 * 1. Service wird in app.component.ts initialisiert (bereits automatisch via providedIn)
 * 2. UI kann updateAvailable$ subscriben und Update-Banner anzeigen
 * 3. User klickt "Update" → activateUpdate() wird aufgerufen
 * 4. Service aktiviert neue Version und lädt App neu
 * 
 * ─── Verhalten ──────────────────────────────────────────────────
 * 
 * - Funktioniert nur in Production (Service Worker aktiviert)
 * - Im Development (ng serve) ist Service Worker deaktiviert → no-op
 * - Neue Version wird NICHT automatisch aktiviert → User entscheidet
 * - Keine Endlosschleife beim Reload (aktiviert vor reload)
 * - Fehler bei Update-Check brechen App nicht ab
 * 
 * ─── Update-Strategie ───────────────────────────────────────────
 * 
 * Angular Service Worker prüft automatisch auf neue Versionen bei:
 * - App-Start
 * - Navigation (alle 30 Sekunden gecheckt)
 * 
 * Zusätzlich prüft dieser Service alle 6 Stunden manuell.
 * 
 * ─── Beispiel UI-Integration ───────────────────────────────────
 * 
 * ```typescript
 * // In einer Komponente:
 * constructor(public pwaUpdate: PwaUpdateService) {}
 * 
 * // Template:
 * <div *ngIf="pwaUpdate.updateAvailable$ | async" class="update-banner">
 *   Neue Version verfügbar!
 *   <button (click)="pwaUpdate.activateUpdate()">Jetzt aktualisieren</button>
 * </div>
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);

  /**
   * Observable das true emittiert wenn ein Update verfügbar ist.
   * UI-Komponenten können darauf subscriben um Update-Banner anzuzeigen.
   */
  updateAvailable$ = new BehaviorSubject<boolean>(false);

  /**
   * Letzte erkannte Version (nur für Logging/Debugging)
   */
  private currentVersionHash: string | null = null;

  /**
   * Version die dismissed wurde (um erneute Benachrichtigung zu verhindern)
   */
  private dismissedVersionHash: string | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialisiert Update-Detection.
   * Registriert Listener für VERSION_READY Events und startet optionales Polling.
   */
  private init(): void {
    // Service Worker nicht verfügbar (Development oder nicht unterstützt)
    if (!this.swUpdate.isEnabled) {
      console.info('[PWA Update] Service Worker deaktiviert (Development-Modus oder nicht unterstützt)');
      return;
    }

    console.info('[PWA Update] Service initialisiert, überwache neue Versionen...');

    // VERSION_READY Event: Neue Version wurde heruntergeladen und ist bereit
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        catchError(err => {
          console.error('[PWA Update] Fehler beim Version-Check:', err);
          return EMPTY;
        })
      )
      .subscribe(evt => {
        const newVersionHash = evt.latestVersion.hash;
        this.currentVersionHash = newVersionHash;
        
        console.info('[PWA Update] Neue Version verfügbar:', {
          current: evt.currentVersion.hash,
          latest: newVersionHash
        });

        // Nur benachrichtigen wenn es NICHT die dismissed Version ist
        if (newVersionHash !== this.dismissedVersionHash) {
          this.updateAvailable$.next(true);
          console.info('[PWA Update] Update-Banner wird angezeigt');
        } else {
          console.info('[PWA Update] Version wurde bereits dismissed, kein Banner');
        }
      });

    // Optional: Regelmäßig manuell nach Updates suchen
    // Angular prüft bereits automatisch bei App-Start und Navigation (alle 30s)
    // Zusätzliches Polling alle 6 Stunden für Long-Running-Sessions
    this.startPeriodicUpdateCheck();

    // Unrecoverable State: Service Worker ist kaputt → Reload als Fallback
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('[PWA Update] Unrecoverable State:', event.reason);
      console.info('[PWA Update] App wird neu geladen...');
      window.location.reload();
    });
  }

  /**
   * Startet regelmäßiges Polling nach Updates (alle 6 Stunden).
   * 
   * Notwendig für Long-Running-Sessions wo User App stundenlang offen hat
   * ohne Navigation (z.B. Admin bleibt auf Dashboard).
   * 
   * Angular prüft bereits bei Navigation, aber nicht bei inaktiven Tabs.
   */
  private startPeriodicUpdateCheck(): void {
    // Alle 6 Stunden = 6 * 60 * 60 * 1000 = 21600000ms
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    interval(SIX_HOURS)
      .pipe(
        switchMap(() => this.checkForUpdate()),
        catchError(err => {
          console.warn('[PWA Update] Periodic Check fehlgeschlagen:', err);
          return EMPTY; // Fehler nicht propagieren, weitermachen
        })
      )
      .subscribe();
  }

  /**
   * Manuell nach Updates suchen.
   * 
   * Kann von UI-Komponenten aufgerufen werden (z.B. "Auf Updates prüfen"-Button).
   * Wird auch automatisch alle 6 Stunden aufgerufen.
   * 
   * @returns Promise<boolean> true wenn Update gefunden, false wenn keine neue Version
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      console.info('[PWA Update] Prüfe manuell auf Updates...');
      const updateFound = await this.swUpdate.checkForUpdate();
      
      if (updateFound) {
        console.info('[PWA Update] Update gefunden und wird heruntergeladen...');
      } else {
        console.info('[PWA Update] Keine neue Version verfügbar');
      }
      
      return updateFound;
    } catch (err) {
      console.error('[PWA Update] Fehler beim manuellen Update-Check:', err);
      return false;
    }
  }

  /**
   * Aktiviert die neue Version und lädt die App neu.
   * 
   * Diese Methode sollte von der UI aufgerufen werden nachdem User
   * auf "Jetzt aktualisieren" geklickt hat.
   * 
   * ⚠️ WICHTIG: User muss aktiv zustimmen, niemals automatisch aufrufen!
   * 
   * Ablauf:
   * 1. Aktiviert die heruntergeladene neue Version
   * 2. Wartet auf Aktivierung
   * 3. Lädt App neu (clean reload, keine Endlosschleife)
   */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      console.warn('[PWA Update] Service Worker nicht verfügbar, kann nicht updaten');
      return;
    }

    if (!this.updateAvailable$.value) {
      console.warn('[PWA Update] Kein Update verfügbar zum Aktivieren');
      return;
    }

    try {
      console.info('[PWA Update] Aktiviere neue Version...');
      
      // Aktiviert die neue Version (swap von altem zu neuem Service Worker)
      await this.swUpdate.activateUpdate();
      
      console.info('[PWA Update] Neue Version aktiviert, App wird neu geladen...');
      
      // Clean Reload
      // Wichtig: activateUpdate() wurde bereits aufgerufen → keine Endlosschleife
      // Bei nächstem Start ist neue Version bereits aktiv
      window.location.reload();
    } catch (err) {
      console.error('[PWA Update] Fehler beim Aktivieren des Updates:', err);
      
      // Fallback: Trotzdem versuchen zu reloaden (evtl. hilft es)
      console.info('[PWA Update] Versuche trotzdem Reload...');
      window.location.reload();
    }
  }

  /**
   * Update-Benachrichtigung verwerfen.
   * 
   * User hat "Später"-Button geklickt → Banner ausblenden.
   * 
   * WICHTIG: Diese Version wird gemerkt. Wenn später eine NEUE Version C
   * deployed wird, erscheint das Banner erneut.
   * 
   * Beispiel:
   * - Version A läuft
   * - Version B verfügbar → User klickt "Später" → dismissed
   * - Version C wird deployed → Banner erscheint wieder (neue Version!)
   */
  dismissUpdate(): void {
    console.info('[PWA Update] Update-Benachrichtigung verworfen');
    
    // Aktuelle Version als "dismissed" markieren
    this.dismissedVersionHash = this.currentVersionHash;
    
    // Banner ausblenden
    this.updateAvailable$.next(false);
    
    console.info('[PWA Update] Version', this.dismissedVersionHash, 'dismissed. Neuere Versionen werden trotzdem angezeigt.');
  }
}
