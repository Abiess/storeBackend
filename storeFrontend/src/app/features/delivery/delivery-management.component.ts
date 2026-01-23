import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { DeliverySettingsService } from '../../core/services/delivery-settings.service';
import { DeliveryProvidersService } from '../../core/services/delivery-providers.service';
import { DeliveryZonesService } from '../../core/services/delivery-zones.service';
import { ToastService } from '../../core/services/toast.service';
import { DeliverySettings, DeliveryProvider, DeliveryZone } from '../../core/models/delivery.model';
import { DeliverySettingsDialogComponent } from './dialogs/delivery-settings-dialog.component';
import { DeliveryProviderDialogComponent } from './dialogs/delivery-provider-dialog.component';
import { DeliveryZoneDialogComponent } from './dialogs/delivery-zone-dialog.component';

@Component({
  selector: 'app-delivery-management',
  standalone: true,
  imports: [CommonModule, MatDialogModule, StoreNavigationComponent],
  template: `
    <app-store-navigation [storeId]="storeId" currentPage="Lieferung"></app-store-navigation>
    
    <div class="delivery-management">
      <div class="header">
        <h1>Liefereinstellungen</h1>
        <p class="subtitle">Verwalten Sie Lieferoptionen, Anbieter und Versandzonen</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Lade Liefereinstellungen...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Fehler beim Laden</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadData()">Erneut versuchen</button>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading && !error" class="content">
        <!-- Settings Overview -->
        <section class="settings-section">
          <div class="section-header">
            <h2>Allgemeine Einstellungen</h2>
            <button class="btn btn-primary" (click)="openSettingsDialog()">
              {{ settings ? 'Bearbeiten' : 'Einrichten' }}
            </button>
          </div>
          
          <div *ngIf="settings" class="settings-card">
            <div class="setting-row">
              <span class="label">Status:</span>
              <span class="value">
                <span class="badge" [class.badge-success]="settings.enabled" [class.badge-secondary]="!settings.enabled">
                  {{ settings.enabled ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </span>
            </div>
            <div class="setting-row" *ngIf="settings.defaultProvider">
              <span class="label">Standard-Anbieter:</span>
              <span class="value">{{ settings.defaultProvider }}</span>
            </div>
            <div class="setting-row" *ngIf="settings.estimatedMinDays != null && settings.estimatedMaxDays != null">
              <span class="label">Lieferzeit:</span>
              <span class="value">{{ settings.estimatedMinDays }}-{{ settings.estimatedMaxDays }} Tage</span>
            </div>
            <div class="setting-row" *ngIf="settings.freeShippingThreshold != null && settings.freeShippingThreshold > 0">
              <span class="label">Kostenloser Versand ab:</span>
              <span class="value">{{ settings.freeShippingThreshold }} {{ settings.currency || 'EUR' }}</span>
            </div>
          </div>

          <div *ngIf="!settings" class="empty-state">
            <p>Noch keine Liefereinstellungen konfiguriert</p>
            <button class="btn btn-primary" (click)="openSettingsDialog()">Jetzt einrichten</button>
          </div>
        </section>

        <!-- Providers -->
        <section class="providers-section">
          <div class="section-header">
            <h2>Lieferanbieter ({{ providers.length }})</h2>
            <button class="btn btn-primary" (click)="openProviderDialog()">
              + Anbieter hinzufügen
            </button>
          </div>

          <div *ngIf="providers.length > 0" class="providers-list">
            <div *ngFor="let provider of providers" class="provider-card">
              <div class="provider-header">
                <h3>{{ provider.name }}</h3>
                <span class="badge" [class.badge-success]="provider.enabled" [class.badge-secondary]="!provider.enabled">
                  {{ provider.enabled ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
              <div class="provider-details">
                <p><strong>Code:</strong> {{ provider.code }}</p>
                <p *ngIf="provider.trackingUrlTemplate"><strong>Tracking-URL:</strong> {{ provider.trackingUrlTemplate }}</p>
                <p><strong>Priorität:</strong> {{ provider.priority }}</p>
              </div>
              <div class="provider-actions">
                <button class="btn btn-sm btn-secondary" (click)="toggleProvider(provider)">
                  {{ provider.enabled ? 'Deaktivieren' : 'Aktivieren' }}
                </button>
                <button class="btn btn-sm btn-primary" (click)="openProviderDialog(provider)">
                  Bearbeiten
                </button>
                <button class="btn btn-sm btn-danger" (click)="deleteProvider(provider)">
                  Löschen
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="providers.length === 0" class="empty-state">
            <p>Noch keine Lieferanbieter konfiguriert</p>
          </div>
        </section>

        <!-- Zones -->
        <section class="zones-section">
          <div class="section-header">
            <h2>Versandzonen ({{ zones.length }})</h2>
            <button class="btn btn-primary" (click)="openZoneDialog()">
              + Zone hinzufügen
            </button>
          </div>

          <div *ngIf="zones.length > 0" class="zones-list">
            <div *ngFor="let zone of zones" class="zone-card">
              <div class="zone-header">
                <h3>{{ zone.name }}</h3>
                <span class="badge" [class.badge-success]="zone.enabled" [class.badge-secondary]="!zone.enabled">
                  {{ zone.enabled ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
              <div class="zone-details">
                <p><strong>Länder:</strong> {{ zone.countries?.join(', ') || 'Keine Länder definiert' }}</p>
                <p><strong>Versandkosten:</strong> {{ zone.shippingCost ?? 0 }} EUR</p>
                <p *ngIf="zone.freeShippingThreshold != null && zone.freeShippingThreshold > 0">
                  <strong>Kostenloser Versand ab:</strong> {{ zone.freeShippingThreshold }} EUR
                </p>
                <p *ngIf="zone.estimatedMinDays != null && zone.estimatedMaxDays != null">
                  <strong>Lieferzeit:</strong> {{ zone.estimatedMinDays }}-{{ zone.estimatedMaxDays }} Tage
                </p>
                <p><strong>Priorität:</strong> {{ zone.priority ?? 0 }}</p>
              </div>
              <div class="zone-actions">
                <button class="btn btn-sm btn-secondary" (click)="toggleZone(zone)">
                  {{ zone.enabled ? 'Deaktivieren' : 'Aktivieren' }}
                </button>
                <button class="btn btn-sm btn-primary" (click)="openZoneDialog(zone)">
                  Bearbeiten
                </button>
                <button class="btn btn-sm btn-danger" (click)="deleteZone(zone)">
                  Löschen
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="zones.length === 0" class="empty-state">
            <p>Noch keine Versandzonen konfiguriert</p>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .delivery-management {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1rem;
    }

    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
    }

    .spinner {
      border: 4px solid #f3f4f6;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .settings-card, .provider-card, .zone-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #374151;
    }

    .value {
      color: #6b7280;
    }

    .providers-list, .zones-list {
      display: grid;
      gap: 1rem;
    }

    .provider-header, .zone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .provider-header h3, .zone-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .provider-details, .zone-details {
      margin-bottom: 1rem;
    }

    .provider-details p, .zone-details p {
      margin: 0.5rem 0;
      color: #6b7280;
    }

    .provider-actions, .zone-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      background: #f9fafb;
      border: 2px dashed #e5e7eb;
      border-radius: 8px;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-secondary {
      background: #f3f4f6;
      color: #6b7280;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
  `]
})
export class DeliveryManagementComponent implements OnInit, OnDestroy {
  storeId!: number;
  settings: DeliverySettings | null = null;
  providers: DeliveryProvider[] = [];
  zones: DeliveryZone[] = [];
  loading = true;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private settingsService: DeliverySettingsService,
    private providersService: DeliveryProvidersService,
    private zonesService: DeliveryZonesService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Versuche storeId aus verschiedenen Quellen zu laden
    this.route.parent?.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('storeId');
      if (id) {
        this.storeId = +id;
        console.log('✅ Store-ID für Delivery geladen:', this.storeId);
        this.loadData();
      } else {
        console.error('❌ Keine Store-ID gefunden');
        this.error = 'Keine Store-ID gefunden';
        this.loading = false;
      }
    });

    // Fallback: Direkter Zugriff auf Route-Params
    if (!this.storeId) {
      this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
        const id = params.get('storeId');
        if (id && !this.storeId) {
          this.storeId = +id;
          console.log('✅ Store-ID (direkt) für Delivery geladen:', this.storeId);
          this.loadData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    console.log('🔄 Lade Delivery-Daten für Store:', this.storeId);

    // Lade alle Daten parallel mit forkJoin
    forkJoin({
      settings: this.settingsService.getDeliverySettings(this.storeId).pipe(
        catchError(err => {
          console.log('ℹ️ Keine Settings gefunden (404 ist normal):', err.status);
          return of(null);
        })
      ),
      providers: this.providersService.getProviders(this.storeId).pipe(
        catchError(err => {
          console.error('❌ Fehler beim Laden der Provider:', err);
          return of([]);
        })
      ),
      zones: this.zonesService.getZones(this.storeId).pipe(
        catchError(err => {
          console.error('❌ Fehler beim Laden der Zones:', err);
          return of([]);
        })
      )
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        console.log('✅ Delivery-Daten geladen:', data);
        this.settings = data.settings;
        this.providers = data.providers;
        this.zones = data.zones;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Kritischer Fehler beim Laden:', err);
        this.error = 'Fehler beim Laden der Liefereinstellungen';
        this.loading = false;
      }
    });
  }

  openSettingsDialog(): void {
    const dialogRef = this.dialog.open(DeliverySettingsDialogComponent, {
      width: '600px',
      data: this.settings,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const operation = this.settings
          ? this.settingsService.updateDeliverySettings(this.storeId, result)
          : this.settingsService.createDeliverySettings(this.storeId, result);

        operation.pipe(takeUntil(this.destroy$)).subscribe({
          next: (updated) => {
            this.settings = updated;
            this.toastService.success('Einstellungen erfolgreich gespeichert');
          },
          error: (err) => {
            console.error('Error saving settings:', err);
            this.toastService.error('Fehler beim Speichern der Einstellungen');
          }
        });
      }
    });
  }

  openProviderDialog(provider?: DeliveryProvider): void {
    const dialogRef = this.dialog.open(DeliveryProviderDialogComponent, {
      width: '600px',
      data: provider || null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const operation = provider
          ? this.providersService.updateProvider(this.storeId, provider.id, result)
          : this.providersService.createProvider(this.storeId, result);

        operation.pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success(
              provider ? 'Anbieter erfolgreich aktualisiert' : 'Anbieter erfolgreich erstellt'
            );
            this.loadData(); // Lade Daten neu
          },
          error: (err) => {
            console.error('Error saving provider:', err);
            this.toastService.error('Fehler beim Speichern des Anbieters');
          }
        });
      }
    });
  }

  openZoneDialog(zone?: DeliveryZone): void {
    const dialogRef = this.dialog.open(DeliveryZoneDialogComponent, {
      width: '650px',
      data: zone || null,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const operation = zone
          ? this.zonesService.updateZone(this.storeId, zone.id, result)
          : this.zonesService.createZone(this.storeId, result);

        operation.pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toastService.success(
              zone ? 'Zone erfolgreich aktualisiert' : 'Zone erfolgreich erstellt'
            );
            this.loadData(); // Lade Daten neu
          },
          error: (err) => {
            console.error('Error saving zone:', err);
            this.toastService.error('Fehler beim Speichern der Zone');
          }
        });
      }
    });
  }

  toggleProvider(provider: DeliveryProvider): void {
    this.providersService.toggleProviderEnabled(this.storeId, provider.id, !provider.enabled)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`Anbieter ${provider.enabled ? 'deaktiviert' : 'aktiviert'}`);
          this.loadData(); // Lade Daten neu
        },
        error: (err) => {
          console.error('Error toggling provider:', err);
          this.toastService.error('Fehler beim Aktualisieren des Anbieters');
        }
      });
  }

  deleteProvider(provider: DeliveryProvider): void {
    if (!confirm(`Möchten Sie den Anbieter "${provider.name}" wirklich löschen?`)) {
      return;
    }

    this.providersService.deleteProvider(this.storeId, provider.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Anbieter erfolgreich gelöscht');
          this.loadData(); // Lade Daten neu
        },
        error: (err) => {
          console.error('Error deleting provider:', err);
          this.toastService.error('Fehler beim Löschen des Anbieters');
        }
      });
  }

  toggleZone(zone: DeliveryZone): void {
    this.zonesService.toggleZoneEnabled(this.storeId, zone.id, !zone.enabled)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`Zone ${zone.enabled ? 'deaktiviert' : 'aktiviert'}`);
          this.loadData(); // Lade Daten neu
        },
        error: (err) => {
          console.error('Error toggling zone:', err);
          this.toastService.error('Fehler beim Aktualisieren der Zone');
        }
      });
  }

  deleteZone(zone: DeliveryZone): void {
    if (!confirm(`Möchten Sie die Zone "${zone.name}" wirklich löschen?`)) {
      return;
    }

    this.zonesService.deleteZone(this.storeId, zone.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Zone erfolgreich gelöscht');
          this.loadData(); // Lade Daten neu
        },
        error: (err) => {
          console.error('Error deleting zone:', err);
          this.toastService.error('Fehler beim Löschen der Zone');
        }
      });
  }
}
