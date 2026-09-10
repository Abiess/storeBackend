import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { MaritimeService } from '@app/core/services/maritime.service';
import { VesselDto, MaritimeVesselsResponse } from '@app/core/models';

/**
 * Maritime / Tanger Med Live (MVP).
 *
 * Zeigt den aktuellen AIS-Verbindungsstatus + die aktuell sichtbaren Schiffe
 * (Live-State, keine Historie – siehe Backend AisStreamClientService).
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
  lastMessageAt: string | null = null;
  vesselCount = 0;
  vessels: VesselDto[] = [];
  loading = true;
  error = '';

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
        this.error = 'unavailable';
        return;
      }
      this.connected = res.connected;
      this.configured = res.configured;
      this.lastMessageAt = res.lastMessageAt;
      this.vesselCount = res.vesselCount;
      this.vessels = res.vessels || [];
      this.loading = false;
      this.error = '';
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
