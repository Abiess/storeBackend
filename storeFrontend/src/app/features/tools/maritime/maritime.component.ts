import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { MaritimeService } from '@app/core/services/maritime.service';
import { VesselDto, MaritimeVesselsResponse, MaritimePort } from '@app/core/models';

/**
 * Maritime / Live-AIS-Schiffsdaten (MVP: Tanger Med, Nador, Casablanca).
 *
 * Zeigt den aktuellen AIS-Verbindungsstatus + die aktuell sichtbaren Schiffe des
 * ausgewählten Hafens (Live-State, keine Historie – siehe Backend AisStreamClientService).
 * Der Hafenwechsel (Segmented Control) sendet EIN PUT-Request an das Backend, welches
 * die BESTEHENDE AISStream-Verbindung umkonfiguriert (kein neuer WebSocket, weder
 * backend- noch frontendseitig).
 *
 * REST-Polling alle 8s (Standard-Pattern im Projekt, siehe z.B.
 * TelegramNotificationBadgeComponent) statt eines eigenen Frontend-WebSockets.
 * Kein Memory Leak: Polling-Subscription wird in ngOnDestroy sauber beendet.
 */
@Component({
  selector: 'app-maritime',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PageHeaderComponent, ResponsiveDataListComponent],
  templateUrl: './maritime.component.html',
  styleUrls: ['./maritime.component.scss']
})
export class MaritimeComponent implements OnInit, OnDestroy {
  connected = false;
  configured = true;
  healthy = false;
  selectedPort = 'TANGER_MED';
  lastMessageAt: string | null = null;
  vesselCount = 0;
  vessels: VesselDto[] = [];
  loading = true;
  error = '';
  ports: MaritimePort[] = [];
  switchingPort = false;

  private pollSub?: Subscription;

  columns: ColumnConfig[] = [
    { key: 'shipName', label: 'Schiff', type: 'text', mobileLabel: 'Schiff', formatFn: (v) => v || '—' },
    { key: 'mmsi', label: 'MMSI', type: 'text', mobileLabel: 'MMSI' },
    { key: 'speed', label: 'Geschwindigkeit', type: 'text', mobileLabel: 'Geschwindigkeit', formatFn: (v) => v != null ? `${v} kn` : '—' },
    { key: 'course', label: 'Kurs', type: 'text', mobileLabel: 'Kurs', formatFn: (v) => v != null ? `${v}°` : '—', hideOnMobile: true },
    { key: 'latitude', label: 'Latitude', type: 'text', mobileLabel: 'Latitude', formatFn: (v) => v?.toFixed(4), hideOnMobile: true },
    { key: 'longitude', label: 'Longitude', type: 'text', mobileLabel: 'Longitude', formatFn: (v) => v?.toFixed(4), hideOnMobile: true },
    { key: 'lastSeen', label: 'Letzte Meldung', type: 'date', mobileLabel: 'Letzte Meldung' }
  ];

  constructor(private maritimeService: MaritimeService) {}

  ngOnInit(): void {
    // Liste der Häfen für das Segmented-Control laden (defensiv: Fehler hier dürfen die Seite nicht blockieren).
    this.maritimeService.getPorts().pipe(
      catchError(() => of([]))
    ).subscribe((ports) => {
      this.ports = ports;
    });

    // Sofort laden + alle 8s pollen. Fehler stoppen das Polling nicht (defensiv).
    this.pollSub = interval(8000).pipe(
      startWith(0),
      switchMap(() =>
        this.maritimeService.getVessels().pipe(
          // Ein einzelner fehlgeschlagener Poll darf das Intervall nicht beenden:
          // Fehler hier abfangen statt an switchMap/interval durchzureichen,
          // sonst würde das Polling nach dem ersten Fehler dauerhaft stoppen.
          catchError(() => of(null))
        )
      )
    ).subscribe((res: MaritimeVesselsResponse | null) => {
      if (!res) {
        this.loading = false;
        this.connected = false;
        this.healthy = false;
        this.error = 'unavailable';
        return;
      }
      this.connected = res.connected;
      this.configured = res.configured;
      this.healthy = res.healthy;
      this.selectedPort = res.selectedPort;
      this.lastMessageAt = res.lastMessageAt;
      this.vesselCount = res.vesselCount;
      this.vessels = res.vessels || [];
      this.loading = false;
      this.error = '';
    });
  }

  selectPort(portId: string): void {
    if (portId === this.selectedPort || this.switchingPort) {
      return;
    }
    this.switchingPort = true;
    // Vessel-Liste sofort leeren/auf "loading" setzen – das bestehende 8s-Polling
    // holt die neuen Schiffe des gewählten Hafens beim nächsten Tick automatisch nach.
    this.vessels = [];
    this.loading = true;
    this.maritimeService.switchPort(portId).pipe(
      catchError(() => of(null))
    ).subscribe((status) => {
      this.switchingPort = false;
      if (!status) {
        return;
      }
      this.selectedPort = status.selectedPort;
      this.connected = status.connected;
      this.healthy = status.healthy;
      this.vesselCount = status.vesselCount;
      this.lastMessageAt = status.lastMessageAt;
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
