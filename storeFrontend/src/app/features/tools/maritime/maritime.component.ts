import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { MaritimeService } from '@app/core/services/maritime.service';
import { TranslationService } from '@app/core/services/translation.service';
import { VesselDto, MaritimeVesselsResponse, MaritimePort, MarineWeatherDto } from '@app/core/models';

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

  /** Phase 2A KPIs – rein clientseitig aus dem vorhandenen /vessels-Response abgeleitet
   *  (bewusst KEIN separater REST-Aufruf pro Poll-Tick, siehe Aufgabenstellung "Performance"). */
  kpiInPort = 0;
  kpiApproaching = 0;
  kpiDeparting = 0;
  kpiMoored = 0;

  /** Aktuell für die Detailansicht ausgewähltes Schiff (Klick auf eine Tabellenzeile). */
  selectedVessel: VesselDto | null = null;

  /**
   * Marine-Wetter (Open-Meteo, Modell-/Forecast-Daten – siehe maritime.weather.disclaimer).
   * Separater REST-Call, NICHT Teil des 8s-AIS-Pollings: initial load, Portwechsel, alle 15 Min.
   * Ein Fehler hier darf den AIS-Teil der Seite nie beeinflussen (eigener Error-State).
   */
  weather: MarineWeatherDto | null = null;
  weatherError = false;
  weatherLoading = true;

  private pollSub?: Subscription;
  private weatherSub?: Subscription;

  /** Betriebsstatus (Backend-Enum-Name) -> i18n-Key, für die Anzeige in der Tabelle. */
  private readonly statusLabelKeys: Record<string, string> = {
    APPROACHING: 'maritime.status.approaching',
    IN_PORT: 'maritime.status.inPort',
    MOORED: 'maritime.status.moored',
    DEPARTING: 'maritime.status.departing',
    NEAR_PORT: 'maritime.status.nearPort',
    UNKNOWN: 'maritime.status.unknown'
  };

  /** Betriebsstatus -> bestehende, projektweite Badge-CSS-Klassen (keine neuen Badge-Farben eingeführt). */
  private readonly statusBadgeClasses: Record<string, string> = {
    APPROACHING: 'status-processing',
    IN_PORT: 'status-active',
    MOORED: 'status-shipped',
    DEPARTING: 'status-draft',
    NEAR_PORT: 'status-inactive',
    UNKNOWN: 'status-archived'
  };

  /** Spalten der Vessel-Tabelle. Wird im Konstruktor (nicht als Feld-Literal) aufgebaut, da
   *  ResponsiveDataListComponent `col.label`/`col.mobileLabel` als reinen Text rendert (keine
   *  `translate`-Pipe) – Labels müssen daher zum Konstruktionszeitpunkt übersetzt werden, analog
   *  zum bestehenden Projekt-Pattern (siehe z.B. supplier-invoices.component.ts). */
  columns: ColumnConfig[];

  constructor(private maritimeService: MaritimeService, private translationService: TranslationService) {
    const t = (key: string) => this.translationService.translate(key);
    this.columns = [
      { key: 'shipName', label: t('maritime.table.shipName'), type: 'text', mobileLabel: t('maritime.table.shipName'), formatFn: (v) => v || '—' },
      {
        key: 'portStatus', label: t('maritime.table.status'), type: 'badge', mobileLabel: t('maritime.table.status'),
        formatFn: (v) => this.translationService.translate(this.statusLabel(v)),
        badgeClass: (v) => this.statusBadgeClasses[v] || 'status-inactive'
      },
      { key: 'destination', label: t('maritime.table.destination'), type: 'text', mobileLabel: t('maritime.table.destination'), formatFn: (v) => v || '—', hideOnMobile: true },
      { key: 'mmsi', label: t('maritime.table.mmsi'), type: 'text', mobileLabel: t('maritime.table.mmsi') },
      { key: 'speed', label: t('maritime.table.speed'), type: 'text', mobileLabel: t('maritime.table.speed'), formatFn: (v) => v != null ? `${v} kn` : '—' },
      { key: 'course', label: t('maritime.table.course'), type: 'text', mobileLabel: t('maritime.table.course'), formatFn: (v) => v != null ? `${v}°` : '—', hideOnMobile: true },
      { key: 'lastSeen', label: t('maritime.table.lastSeen'), type: 'date', mobileLabel: t('maritime.table.lastSeen') }
    ];
  }

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
      this.updateKpis();
    });

    // Marine-Wetter: eigener, deutlich selteneren Poll-Zyklus (15 Min) – Backend cached ohnehin
    // 20 Min pro Hafen, hier geht es nur darum, nicht ewig denselben Stand anzuzeigen.
    // Fehler stoppen NICHT das AIS-Polling oben (komplett unabhängiger Subscription-Stream).
    this.weatherSub = interval(15 * 60 * 1000).pipe(
      startWith(0),
      switchMap(() => this.maritimeService.getWeather().pipe(catchError(() => of(null))))
    ).subscribe((weather) => this.applyWeather(weather));
  }

  private applyWeather(weather: MarineWeatherDto | null): void {
    this.weatherLoading = false;
    if (!weather || !weather.available) {
      this.weatherError = true;
      this.weather = null;
      return;
    }
    this.weatherError = false;
    this.weather = weather;
  }

  private updateKpis(): void {
    let inPort = 0, approaching = 0, departing = 0, moored = 0;
    for (const v of this.vessels) {
      switch (v.portStatus) {
        case 'IN_PORT': inPort++; break;
        case 'APPROACHING': approaching++; break;
        case 'DEPARTING': departing++; break;
        case 'MOORED': moored++; break;
      }
    }
    this.kpiInPort = inPort;
    this.kpiApproaching = approaching;
    this.kpiDeparting = departing;
    this.kpiMoored = moored;
  }

  statusLabel(status?: string | null): string {
    return status ? (this.statusLabelKeys[status] || 'maritime.status.unknown') : 'maritime.status.unknown';
  }

  /** Anzeigename des aktuell gewählten Hafens (aus der bereits geladenen Port-Liste), Fallback: Port-ID. */
  selectedPortName(): string {
    return this.ports.find((p) => p.id === this.selectedPort)?.name || this.selectedPort;
  }

  onVesselClick(vessel: VesselDto): void {
    this.selectedVessel = this.selectedVessel?.mmsi === vessel.mmsi ? null : vessel;
  }

  closeDetail(): void {
    this.selectedVessel = null;
  }

  selectPort(portId: string): void {
    if (portId === this.selectedPort || this.switchingPort) {
      return;
    }
    this.switchingPort = true;
    // Vessel-Liste sofort leeren/auf "loading" setzen – das bestehende 8s-Polling
    // holt die neuen Schiffe des gewählten Hafens beim nächsten Tick automatisch nach.
    this.vessels = [];
    this.selectedVessel = null;
    this.updateKpis();
    this.loading = true;
    // Wetter ist ein separater REST-Call (kein WebSocket) – bei Portwechsel sofort neu laden,
    // die AISStream-Subscription selbst wird ausschließlich im Backend über switchPort() umgestellt.
    this.weatherLoading = true;
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
    this.maritimeService.getWeather().pipe(
      catchError(() => of(null))
    ).subscribe((weather) => this.applyWeather(weather));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.weatherSub?.unsubscribe();
  }
}
