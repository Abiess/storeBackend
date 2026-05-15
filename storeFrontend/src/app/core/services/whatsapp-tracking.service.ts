import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { MetaPixelService } from './meta-pixel.service';

/**
 * Kontext eines WhatsApp-Klick-Events.
 * Alle Felder optional damit der Service aus Widget UND Produktseite
 * ohne Boilerplate aufgerufen werden kann.
 */
export interface WhatsappClickEvent {
  /** Store-ID, falls bekannt */
  storeId?: number;
  /** Produkt-ID, falls aufgerufen von Produktseite */
  productId?: number;
  /** Produktname (menschenlesbar im Log) */
  productName?: string;
  /** Woher der Klick kam */
  source: 'widget' | 'product_sticky_cta';
  /** ISO-8601-Timestamp – wird automatisch gesetzt wenn nicht übergeben */
  timestamp?: string;
  /** Vollständige wa.me-URL die geöffnet wurde */
  url?: string;
}

/**
 * Minimaler WhatsApp-Click-Tracking-Service.
 *
 * Aktueller Stand (Stub-Phase):
 *  - Dev:  console.info-Ausgabe + In-Memory-Log
 *  - Prod: stiller In-Memory-Log (bereit für Backend-Anbindung)
 *
 * Nächster Schritt wenn Backend-Endpunkt bereit ist:
 *   1. Backend: POST /api/stores/{storeId}/events  { type: 'WA_CLICK', ... }
 *   2. Hier: `sendToBackend(event)` in `track()` aufrufen (fire & forget)
 *
 * WICHTIG: Tracking darf nie den WhatsApp-Klick blockieren.
 * Alle Operationen sind synchron und lightweight – kein HTTP in diesem Stub.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappTrackingService {

  /** In-Memory-Log der letzten 100 Klicks (für Debug / zukünftige Batch-Sends) */
  private readonly log: WhatsappClickEvent[] = [];
  private readonly MAX_LOG_SIZE = 100;

  constructor(private metaPixel: MetaPixelService) {}

  /**
   * Haupt-Tracking-Methode.
   * Aufruf: `(click)="tracking.track({ source: 'widget', storeId: 1 })"`
   *
   * Blockiert NICHT den WhatsApp-Link – einfach synchron auführen,
   * der Browser öffnet den <a target="_blank"> Link unabhängig davon.
   */
  track(ctx: WhatsappClickEvent): void {
    const event: WhatsappClickEvent = {
      ...ctx,
      timestamp: ctx.timestamp ?? new Date().toISOString()
    };

    // In-Memory-Log (FIFO, max. 100 Einträge)
    this.log.push(event);
    if (this.log.length > this.MAX_LOG_SIZE) {
      this.log.shift();
    }

    // Dev-Only: strukturierte Ausgabe
    if (!environment.production) {
      console.info(
        `%c📲 WhatsApp Click%c ${event.source}`,
        'color:#25D366;font-weight:700',
        'color:inherit',
        {
          storeId:     event.storeId     ?? '–',
          productId:   event.productId   ?? '–',
          productName: event.productName ?? '–',
          url:         event.url         ?? '–',
          timestamp:   event.timestamp
        }
      );
    }

    // Meta Pixel Custom Event – no-op wenn Pixel nicht konfiguriert
    this.metaPixel.trackCustom('WhatsAppClick', {
      source:       event.source,
      store_id:     event.storeId,
      product_id:   event.productId,
      product_name: event.productName,
      content_type: event.productId ? 'product' : 'general'
    });
  }

  /**
   * Liefert eine Kopie des aktuellen Logs (für Tests / Dev-Tools).
   */
  getLog(): ReadonlyArray<WhatsappClickEvent> {
    return [...this.log];
  }

  /**
   * Stub für zukünftige Backend-Anbindung.
   * Auskommentiert lassen bis der Endpunkt existiert.
   *
   * private sendToBackend(event: WhatsappClickEvent): void {
   *   this.http.post(
   *     `${environment.apiUrl}/stores/${event.storeId}/events`,
   *     { type: 'WA_CLICK', ...event }
   *   ).subscribe({ error: () => {} }); // Fehler still ignorieren
   * }
   */
}

