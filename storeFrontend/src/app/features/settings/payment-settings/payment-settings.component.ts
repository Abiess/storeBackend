import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPaymentService } from '@app/core/services/admin-payment.service';
import { StoreService } from '@app/core/services/store.service';
import { PaymentSettingsDTO } from '@app/core/models/payment-settings.model';
import { Store } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-payment-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="payment-settings">
      <!-- FEHLER: Keine Stores vorhanden -->
      <div class="error-state" *ngIf="!loadingStores && stores.length === 0">
        <p class="error-message">🏪 Sie haben noch keinen Store.</p>
        <p style="margin: 8px 0; color: #666; font-size: 14px;">Bitte erstellen Sie zuerst einen Store.</p>
        <button class="btn btn-primary" (click)="navigateToStoreCreation()">Store erstellen</button>
      </div>

      <!-- FEHLER: Stores vorhanden, aber keiner ausgewählt -->
      <div class="error-state" *ngIf="!loadingStores && stores.length > 0 && !selectedStoreId">
        <p class="error-message">📋 Bitte wählen Sie einen Store aus:</p>
        <select class="store-selector" [(ngModel)]="selectedStoreId" (ngModelChange)="onStoreSelected()">
          <option [value]="null" disabled selected>-- Store auswählen --</option>
          <option *ngFor="let store of stores" [value]="store.id">{{ store.name }}</option>
        </select>
      </div>

      <!-- LOADING: Stores werden geladen -->
      <div class="loading-state" *ngIf="loadingStores">
        <div class="spinner"></div>
        <p>{{ 'common.loading' | translate }}...</p>
      </div>

      <!-- MAIN CONTENT: Store ausgewählt -->
      <div *ngIf="selectedStoreId && selectedStoreId > 0">
        <div class="section-header">
          <div class="header-icon">💳</div>
          <div>
            <h2>{{ 'settings.payments.title' | translate }}</h2>
            <p>{{ 'settings.payments.subtitle' | translate }}</p>
          </div>
        </div>

        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>{{ 'common.loading' | translate }}...</p>
        </div>

        <div class="error-state" *ngIf="error">
          <p class="error-message">❌ {{ error }}</p>
          <button class="btn btn-outline" (click)="loadSettings()">{{ 'common.retry' | translate }}</button>
        </div>

        <div class="payment-providers" *ngIf="!loading && !error && settings">
        <div class="provider-card paypal-card">
          <div class="provider-header">
            <div class="provider-logo">💰</div>
            <div class="provider-info">
              <h3>PayPal</h3>
              <p>{{ 'settings.payments.paypal.description' | translate }}</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" 
                     [checked]="settings.enabled" 
                     (change)="togglePayPal()"
                     [disabled]="saving">
              <span class="slider"></span>
            </label>
          </div>

          <div class="provider-details" *ngIf="settings">
            <div class="info-grid">
              <div class="info-item">
                <label>{{ 'settings.payments.status' | translate }}</label>
                <span class="status-badge" [ngClass]="'status-' + settings.connectionStatus">
                  {{ getStatusLabel(settings.connectionStatus) }}
                </span>
              </div>

              <div class="info-item">
                <label>{{ 'settings.payments.mode' | translate }}</label>
                <span>{{ settings.mode === 'SANDBOX' ? '🧪 Sandbox' : '✅ Live' }}</span>
              </div>

              <div class="info-item" *ngIf="settings.merchantAccountId">
                <label>{{ 'settings.payments.merchantId' | translate }}</label>
                <span>{{ settings.merchantAccountId }}</span>
              </div>

              <div class="info-item">
                <label>{{ 'settings.payments.onboarding' | translate }}</label>
                <span>{{ settings.onboardingCompleted ? '✅' : '⏳' }}</span>
              </div>

              <div class="info-item" *ngIf="settings.lastCheckedAt">
                <label>{{ 'settings.payments.lastChecked' | translate }}</label>
                <span>{{ settings.lastCheckedAt ? (settings.lastCheckedAt | date:'short') : 'Noch nicht geprüft' }}</span>
              </div>
            </div>

            <div class="sandbox-warning" *ngIf="settings.connectionStatus === 'PLATFORM_SANDBOX'">
              <span class="warning-icon">⚠️</span>
              <div>
                <strong>{{ 'settings.payments.testMode' | translate }}</strong>
                <p>{{ 'settings.payments.testModeDescription' | translate }}</p>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-outline" (click)="checkConnection()" [disabled]="saving">
                <span *ngIf="!saving">{{ 'settings.payments.checkConnection' | translate }}</span>
                <span *ngIf="saving" class="spinner-sm"></span>
              </button>
              <button class="btn btn-primary" disabled [title]="'settings.payments.comingSoon' | translate">
                {{ 'settings.payments.connectPayPal' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-settings { padding: 0; }
    .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
    .header-icon { font-size: 32px; }
    .section-header h2 { margin: 0; font-size: 24px; font-weight: 600; }
    .section-header p { margin: 4px 0 0; color: #666; }
    .loading-state, .error-state { text-align: center; padding: 40px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-message { color: #d32f2f; margin-bottom: 16px; }
    .payment-providers { display: flex; flex-direction: column; gap: 24px; }
    .provider-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background: #fff; }
    .provider-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .provider-logo { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; font-size: 32px; }
    .provider-info { flex: 1; }
    .provider-info h3 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .provider-info p { margin: 0; color: #666; font-size: 14px; }
    .toggle-switch { position: relative; width: 50px; height: 28px; cursor: pointer; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.3s; border-radius: 28px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: 0.3s; border-radius: 50%; }
    input:checked + .slider { background-color: #667eea; }
    input:checked + .slider:before { transform: translateX(22px); }
    input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }
    .provider-details { padding-top: 24px; border-top: 1px solid #e0e0e0; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #999; }
    .info-item span { font-size: 14px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-badge.status-NOT_CONNECTED { background: #ffebee; color: #c62828; }
    .status-badge.status-PLATFORM_SANDBOX { background: #fff3e0; color: #e65100; }
    .status-badge.status-CONNECTED { background: #e8f5e9; color: #2e7d32; }
    .status-badge.status-ERROR { background: #ffebee; color: #c62828; }
    .sandbox-warning { display: flex; gap: 12px; padding: 16px; background: #fffbea; border: 1px solid #ffd54f; border-radius: 8px; margin-bottom: 24px; }
    .warning-icon { font-size: 24px; }
    .sandbox-warning strong { display: block; margin-bottom: 4px; }
    .sandbox-warning p { margin: 0; font-size: 14px; color: #666; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn { padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-outline { background: transparent; border: 1px solid #e0e0e0; color: #333; }
    .btn-outline:hover { background: #f5f5f5; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .store-selector { width: 100%; max-width: 400px; padding: 12px 16px; border: 2px solid #667eea; border-radius: 8px; font-size: 16px; margin-top: 16px; cursor: pointer; }
    .store-selector:focus { outline: none; border-color: #764ba2; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    @media (max-width: 768px) {
      .provider-header { flex-wrap: wrap; }
      .toggle-switch { order: -1; width: 100%; }
      .info-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
      .btn { width: 100%; }
    }
  `]
})
export class PaymentSettingsComponent implements OnInit, OnDestroy {
  stores: Store[] = [];
  selectedStoreId: number | null = null;
  loadingStores = false;
  settings?: PaymentSettingsDTO;
  loading = false;
  saving = false;
  error?: string;
  
  private subscription?: Subscription;

  constructor(
    private router: Router,
    private storeService: StoreService,
    private adminPaymentService: AdminPaymentService
  ) {}

  ngOnInit() {
    // Stores des Users laden
    this.loadStores();
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  
  private loadStores() {
    this.loadingStores = true;
    this.storeService.getMyStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.loadingStores = false;
        
        // Bei genau einem Store: automatisch auswählen
        if (stores.length === 1) {
          this.selectedStoreId = stores[0].id;
          this.loadSettings();
        }
        // Bei mehreren Stores: User muss auswählen (Dropdown wird angezeigt)
        // Bei keinen Stores: Fehlermeldung wird angezeigt
      },
      error: (err) => {
        console.error('Failed to load stores:', err);
        this.error = 'Fehler beim Laden der Stores';
        this.loadingStores = false;
      }
    });
  }
  
  onStoreSelected() {
    if (this.selectedStoreId && this.selectedStoreId > 0) {
      this.loadSettings();
    }
  }
  
  navigateToStoreCreation() {
    this.router.navigate(['/store-wizard']);
  }

  loadSettings() {
    // CRITICAL: Nie API-Call mit storeId=0 oder null
    if (!this.selectedStoreId || this.selectedStoreId <= 0) {
      this.error = 'Kein gültiger Store ausgewählt.';
      return;
    }
    
    this.loading = true;
    this.error = undefined;
    
    this.adminPaymentService.getPayPalSettings(this.selectedStoreId).subscribe({
      next: (data) => {
        this.settings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load payment settings:', err);
        this.error = err.error?.message || 'Fehler beim Laden der Zahlungseinstellungen';
        this.loading = false;
      }
    });
  }

  togglePayPal() {
    if (!this.settings || this.saving || !this.selectedStoreId) return;
    
    this.saving = true;
    const request = { 
      provider: 'PAYPAL' as const, 
      enabled: !this.settings.enabled 
    };
    
    this.adminPaymentService.updatePayPalSettings(this.selectedStoreId, request).subscribe({
      next: (data) => {
        this.settings = data;
        this.saving = false;
      },
      error: (err) => {
        console.error('Failed to update settings:', err);
        this.error = err.error?.message || 'Fehler beim Aktualisieren';
        this.saving = false;
        if (this.settings) {
          this.settings.enabled = !this.settings.enabled;
        }
      }
    });
  }

  checkConnection() {
    if (this.saving || !this.selectedStoreId) return;
    
    this.saving = true;
    
    this.adminPaymentService.checkConnection(this.selectedStoreId).subscribe({
      next: (data) => {
        this.settings = data;
        this.saving = false;
      },
      error: (err) => {
        console.error('Failed to check connection:', err);
        this.error = err.error?.message || 'Fehler beim Verbindungstest';
        this.saving = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'NOT_CONNECTED': 'Nicht verbunden',
      'PLATFORM_SANDBOX': 'Sandbox via markt.ma',
      'CONNECTED': 'PayPal verbunden',
      'ERROR': 'Verbindungsfehler'
    };
    return labels[status] || status;
  }
}
