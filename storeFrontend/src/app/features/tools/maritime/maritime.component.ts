import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { MaritimeService } from '@app/core/services/maritime.service';
import { TranslationService } from '@app/core/services/translation.service';
import { VesselDto, MaritimeVesselsResponse, MaritimePort, MarineWeatherDto, VesselPortEventDto } from '@app/core/models';

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
   * Phase 2B: kleine Hafen-Historie des aktuell ausgewählten Schiffs. Wird NUR beim Öffnen der
   * Detailansicht (Klick auf ein Schiff) geladen – bewusst NICHT Teil des 8s-Vessel-Pollings
   * (siehe Aufgabenstellung "keine unnötigen Requests im Polling").
   */
  vesselEvents: VesselPortEventDto[] = [];
  vesselEventsLoading = false;
  vesselEventsError = false;
  vesselEnteredAt: string | null = null;
  vesselMooredAt: string | null = null;
  vesselLeftAt: string | null = null;

  /** Phase 2B: "Letzte Hafenereignisse" für den ausgewählten Hafen – kleine, begrenzte Liste. */
  portEvents: VesselPortEventDto[] = [];
  portEventsLoading = true;

  /** Spalten der kleinen Event-Historie (Vessel-Detail + "Letzte Hafenereignisse"), reines Reuse von ResponsiveDataList. */
  eventColumns: ColumnConfig[];

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

  /**
   * Statuslogik-FAQ (reines Inline-Hilfe-Modul, keine neue Route/Komponente): jeder Eintrag ist ein
   * i18n-Key-Suffix unter `maritime.faq.<id>.question` / `maritime.faq.<id>.answer`. Der Text selbst
   * bleibt vollständig in den i18n-Dateien (kein Hardcoding) und wird per `translate`-Pipe direkt im
   * Template aufgelöst (reaktiv bei Sprachwechsel), anders als `columns` oben, die von
   * ResponsiveDataList als reiner Text (ohne Pipe-Unterstützung) konsumiert werden.
   * UI-Pattern: natives `<details>/<summary>` (im Projekt bereits an mehreren Stellen genutzt),
   * bewusst KEINE neue Accordion-Komponente/Dependency, siehe maritime.component.html.
   */
  readonly faqItems: string[] = [
    'statusCalculation', 'moored', 'inPort', 'approaching', 'departing', 'nearPort', 'unknown',
    'sog', 'cog', 'navStatus', 'conflictingData', 'geometries', 'statusVsEvent', 'restartEvent',
    'dedup', 'destination', 'safety'
  ];

  /** Event-Typ (Backend-Enum-Name) -> i18n-Key. */
  private readonly eventTypeLabelKeys: Record<string, string> = {
    APPROACHING: 'maritime.events.type.approaching',
    ENTERED_PORT: 'maritime.events.type.enteredPort',
    MOORED: 'maritime.events.type.moored',
    DEPARTING: 'maritime.events.type.departing',
    LEFT_PORT: 'maritime.events.type.leftPort'
  };

  /** Event-Typ -> bestehende, projektweite Badge-CSS-Klassen (keine neuen Badge-Farben eingeführt). */
  private readonly eventTypeBadgeClasses: Record<string, string> = {
    APPROACHING: 'status-processing',
    ENTERED_PORT: 'status-active',
    MOORED: 'status-shipped',
    DEPARTING: 'status-draft',
    LEFT_PORT: 'status-inactive'
  };

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
    // Phase 2B: kleine Spaltenkonfiguration für Event-Historie (Vessel-Detail + "Letzte Hafenereignisse"),
    // volle Wiederverwendung von ResponsiveDataListComponent (kein neues UI-Muster).
    this.eventColumns = [
      { key: 'shipName', label: t('maritime.table.shipName'), type: 'text', mobileLabel: t('maritime.table.shipName'), formatFn: (v) => v || '—' },
      {
        key: 'eventType', label: t('maritime.events.columnType'), type: 'badge', mobileLabel: t('maritime.events.columnType'),
        formatFn: (v) => this.translationService.translate(this.eventTypeLabel(v)),
        badgeClass: (v) => this.eventTypeBadgeClasses[v] || 'status-inactive'
      },
      { key: 'eventTime', label: t('maritime.events.columnTime'), type: 'date', mobileLabel: t('maritime.events.columnTime') }
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

    // Phase 2B: "Letzte Hafenereignisse" – NUR initial + bei Portwechsel geladen (kein separates
    // Auto-Refresh-Polling, siehe Aufgabenstellung "Performance").
    this.loadPortEvents();
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

  eventTypeLabel(type?: string | null): string {
    return type ? (this.eventTypeLabelKeys[type] || 'maritime.status.unknown') : 'maritime.status.unknown';
  }

  /** Phase 2B: "Letzte Hafenereignisse" für den aktuell ausgewählten Hafen laden (kleine, begrenzte Liste). */
  private loadPortEvents(): void {
    this.portEventsLoading = true;
    this.maritimeService.getPortEvents(this.selectedPort).pipe(
      catchError(() => of([]))
    ).subscribe((events) => {
      this.portEventsLoading = false;
      this.portEvents = events || [];
    });
  }

  /**
   * "Im Hafen seit"-Dauer, clientseitig aus dem serverseitig gelieferten Zeitpunkt berechnet
   * (siehe Aufgabenstellung: keine Sekundentakt-Updates in der DB). Format z.B. "2h 34m".
   */
  formatDwell(sinceIso: string | null): string | null {
    if (!sinceIso) {
      return null;
    }
    const since = new Date(sinceIso).getTime();
    const diffMs = Date.now() - since;
    if (!isFinite(diffMs) || diffMs < 0) {
      return null;
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  /** Anzeigename des aktuell gewählten Hafens (aus der bereits geladenen Port-Liste), Fallback: Port-ID. */
  selectedPortName(): string {
    return this.ports.find((p) => p.id === this.selectedPort)?.name || this.selectedPort;
  }

  onVesselClick(vessel: VesselDto): void {
    if (this.selectedVessel?.mmsi === vessel.mmsi) {
      this.selectedVessel = null;
      return;
    }
    this.selectedVessel = vessel;
    // Phase 2B: Historie NUR beim expliziten Öffnen laden (nicht Teil des 8s-Vessel-Pollings).
    this.vesselEvents = [];
    this.vesselEnteredAt = null;
    this.vesselMooredAt = null;
    this.vesselLeftAt = null;
    this.vesselEventsError = false;
    this.vesselEventsLoading = true;
    this.maritimeService.getVesselEvents(vessel.mmsi).pipe(
      catchError(() => of(null))
    ).subscribe((res) => {
      this.vesselEventsLoading = false;
      if (!res) {
        this.vesselEventsError = true;
        return;
      }
      this.vesselEvents = res.events || [];
      this.vesselEnteredAt = res.enteredAt || null;
      this.vesselMooredAt = res.mooredAt || null;
      this.vesselLeftAt = res.leftAt || null;
    });
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
      // Phase 2B: Portwechsel bestätigt -> "Letzte Hafenereignisse" für den neuen Hafen nachladen.
      this.loadPortEvents();
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
