import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { VesselDto } from '@app/core/models';

/**
 * Live-Karte für den aktuell ausgewählten Hafen (Phase 3A).
 *
 * WICHTIG: Ist eine REINE Visualisierung der bereits vom 8s-Polling in MaritimeComponent
 * geladenen Vessel-Daten (Input `vessels`). Baut KEINE eigene Verbindung auf, startet KEINEN
 * eigenen Timer/Poll und hält KEINE Historie – bei jedem `vessels`-Input-Wechsel werden
 * ausschließlich die vorhandenen Leaflet-Marker aktualisiert (add/move/remove), die Karte
 * selbst wird nur einmal initialisiert (siehe ngOnInit).
 *
 * Map-Library: Leaflet + OpenStreetMap-Tiles (kein API-Key, keine Kosten). CSS-Einbindung
 * ausschließlich EINMAL über `src/styles.scss` (`@import 'leaflet/dist/leaflet.css'`), analog zum
 * bestehenden Muster für das Material-Theme dort. `angular.json` enthält bewusst NUR
 * `allowedCommonJsDependencies: ["leaflet"]` (unterdrückt die CJS-Build-Warnung), keine zweite
 * CSS-Einbindung. Es existierte zuvor keine Map-Library im Projekt.
 */
@Component({
  selector: 'app-maritime-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maritime-map.component.html',
  styleUrls: ['./maritime-map.component.scss']
})
export class MaritimeMapComponent implements OnInit, OnChanges, OnDestroy {
  @Input() vessels: VesselDto[] = [];
  @Input() center?: [number, number];
  @Input() portZoneBox?: [[number, number], [number, number]];
  @Input() approachZone?: [[number, number], [number, number]];
  /** AIS-Subscription-BoundingBox – NUR in einem Debug-/Developer-Modus einblenden (siehe Aufgabenstellung). */
  @Input() boundingBox?: [[number, number], [number, number]];
  @Input() debugMode = false;
  /** Von der Liste ausgewähltes Schiff (MMSI) – Karte zentriert/öffnet Popup, ohne Re-Init. */
  @Input() focusMmsi: number | null = null;
  @Input() ariaLabel = 'Live vessel map';

  /** Klick auf einen Marker -> MaritimeComponent übernimmt bestehende Detail-Logik (kein eigenes Popup-Formular). */
  @Output() vesselSelect = new EventEmitter<number>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private markers = new Map<number, L.Marker>();
  private portZoneLayer?: L.Rectangle;
  private approachZoneLayer?: L.Rectangle;
  private boundingBoxLayer?: L.Rectangle;
  private lastFocusedMmsi: number | null = null;

  /** Betriebsstatus -> Marker-Farbe. Bewusst zurückhaltende, bereits im Projekt genutzte Farbtöne
   *  (angelehnt an die Badge-Klassen in maritime.component.ts), keine neuen bunten Farben. */
  private readonly statusColors: Record<string, string> = {
    MOORED: '#0369a1',
    IN_PORT: '#047857',
    APPROACHING: '#a855f7',
    DEPARTING: '#b45309',
    NEAR_PORT: '#6b7280',
    UNKNOWN: '#9ca3af'
  };

  ngOnInit(): void {
    // WICHTIG: Kein hartkodiertes Hafenzentrum im Frontend (weder Tanger Med noch ein anderer Port).
    // Solange `center` noch nicht vom Backend geladen ist (GET /api/maritime/ports), bekommt die
    // Karte lediglich eine neutrale, nicht-portspezifische Platzhalteransicht. Sobald der echte
    // Center-Wert eintrifft, wird EINMALIG per setView (kein Fly/Pan-Sprung) darauf gewechselt,
    // siehe ngOnChanges.
    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: true
    });
    if (this.center) {
      this.map.setView([this.center[0], this.center[1]], 11);
    } else {
      this.map.setView([0, 0], 2);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    this.renderZones();
    this.syncMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }
    if (changes['vessels']) {
      this.syncMarkers();
    }
    if (changes['center'] && this.center) {
      const previousCenter = changes['center'].previousValue as [number, number] | undefined;
      if (previousCenter == null) {
        // Erstes Eintreffen der Backend-Geometrie (z.B. kurz nach Seitenaufbau) -> direkt setzen,
        // kein "Flug" von der neutralen Platzhalteransicht quer über die Karte.
        this.map.setView([this.center[0], this.center[1]], 11);
      } else {
        // Echter Portwechsel (Tanger Med -> Nador -> Casablanca) auf derselben Map-Instanz:
        // sanftes Pan statt Re-Init. Zonen/Marker werden unabhängig davon unten aktualisiert.
        this.map.panTo([this.center[0], this.center[1]]);
      }
    }
    if (changes['portZoneBox'] || changes['approachZone'] || changes['boundingBox'] || changes['debugMode']) {
      this.renderZones();
    }
    if (changes['focusMmsi'] && this.focusMmsi != null && this.focusMmsi !== this.lastFocusedMmsi) {
      this.focusVessel(this.focusMmsi);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private renderZones(): void {
    if (!this.map) {
      return;
    }
    this.portZoneLayer?.remove();
    this.approachZoneLayer?.remove();
    this.boundingBoxLayer?.remove();

    // Anfahrtszone zuerst (liegt "unter" der engeren Port-Zone).
    if (this.approachZone) {
      this.approachZoneLayer = L.rectangle(this.toBounds(this.approachZone), {
        color: '#667eea',
        weight: 1.5,
        fillOpacity: 0.04,
        dashArray: '4 4'
      }).addTo(this.map);
    }
    if (this.portZoneBox) {
      this.portZoneLayer = L.rectangle(this.toBounds(this.portZoneBox), {
        color: '#764ba2',
        weight: 2,
        fillOpacity: 0.08
      }).addTo(this.map);
    }
    // AIS BoundingBox: NUR im Debug-Modus, nicht standardmäßig prominent (siehe Aufgabenstellung).
    if (this.debugMode && this.boundingBox) {
      this.boundingBoxLayer = L.rectangle(this.toBounds(this.boundingBox), {
        color: '#9ca3af',
        weight: 1,
        fillOpacity: 0,
        dashArray: '2 6'
      }).addTo(this.map);
    }
  }

  private toBounds(box: [[number, number], [number, number]]): L.LatLngBoundsExpression {
    return [[box[0][0], box[0][1]], [box[1][0], box[1][1]]];
  }

  /** Marker anhand des aktuellen Vessel-Cache add/update/remove – KEINE komplette Map-Neuinitialisierung. */
  private syncMarkers(): void {
    if (!this.map) {
      return;
    }
    const seen = new Set<number>();
    for (const v of this.vessels) {
      if (v.latitude == null || v.longitude == null) {
        continue;
      }
      seen.add(v.mmsi);
      const existing = this.markers.get(v.mmsi);
      const latLng: L.LatLngExpression = [v.latitude, v.longitude];
      if (existing) {
        existing.setLatLng(latLng);
        existing.setIcon(this.buildIcon(v));
        existing.setPopupContent(this.buildPopupHtml(v));
      } else {
        const marker = L.marker(latLng, { icon: this.buildIcon(v) })
          .addTo(this.map)
          .bindPopup(this.buildPopupHtml(v));
        marker.on('click', () => this.vesselSelect.emit(v.mmsi));
        this.markers.set(v.mmsi, marker);
      }
    }
    // Schiffe, die nicht mehr im aktuellen Cache sind (z.B. Portwechsel), entfernen.
    for (const [mmsi, marker] of this.markers) {
      if (!seen.has(mmsi)) {
        marker.remove();
        this.markers.delete(mmsi);
      }
    }
  }

  private buildIcon(v: VesselDto): L.DivIcon {
    const color = this.statusColors[v.portStatus || 'UNKNOWN'] || this.statusColors['UNKNOWN'];
    const rotation = v.heading != null && v.heading !== 511 ? v.heading : (v.course ?? null);
    const arrow = rotation != null
      ? `<div class="mm-arrow" style="transform: translate(-50%,-100%) rotate(${rotation}deg)"></div>`
      : '';
    const html = `<div class="mm-marker" style="background:${color}"></div>${arrow}`;
    return L.divIcon({
      className: 'mm-marker-wrap',
      html,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  private buildPopupHtml(v: VesselDto): string {
    const dash = '&mdash;';
    const esc = (s: unknown) => (s == null || s === '' ? dash : String(s));
    return `
      <div class="mm-popup">
        <strong>${esc(v.shipName)}</strong>
        <div>${esc(v.portStatus)}</div>
        <div>SOG: ${v.speed != null ? v.speed + ' kn' : dash}</div>
        <div>COG: ${v.course != null ? v.course + '&deg;' : dash}</div>
        <div>Dest: ${esc(v.destination)}</div>
        <div>ETA: ${esc(v.eta)}</div>
        <div>MMSI: ${v.mmsi}</div>
      </div>`;
  }

  private focusVessel(mmsi: number): void {
    this.lastFocusedMmsi = mmsi;
    const marker = this.markers.get(mmsi);
    if (marker && this.map) {
      this.map.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }
}
