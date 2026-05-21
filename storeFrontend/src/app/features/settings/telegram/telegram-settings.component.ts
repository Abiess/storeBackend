import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelegramService, TelegramConfig } from '@app/core/services/telegram.service';

/**
 * Telegram Bot Einstellungen für einen Store.
 * - Bot-Token eingeben + Channel-ID
 * - Notification-Flags konfigurieren
 * - Verbindungstest
 * - Import auslösen (delegiert an TelegramImportComponent)
 */
@Component({
  selector: 'app-telegram-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="telegram-settings">

      <!-- Header -->
      <div class="section-header">
        <div class="header-icon">✈️</div>
        <div>
          <h2>Telegram Bot</h2>
          <p>Importiere Produkte aus deinem Telegram-Channel und erhalte Bestellbenachrichtigungen.</p>
        </div>
        <div class="connection-badge" [class.connected]="config?.connected" *ngIf="config">
          <span>{{ config.connected ? '✅ Verbunden' : '🔴 Nicht verbunden' }}</span>
        </div>
      </div>

      <!-- Ladeindikator -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Lade Konfiguration...</p>
      </div>

      <!-- Formular -->
      <form (ngSubmit)="save()" *ngIf="!loading && config">

        <!-- BOT-TOKEN -->
        <div class="form-section">
          <h3>🤖 Bot-Konfiguration</h3>
          <div class="info-box">
            <strong>Schritt 1:</strong> Erstelle einen Bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener">&#64;BotFather</a> auf Telegram.<br>
            <strong>Schritt 2:</strong> Füge den Bot als <strong>Admin</strong> in deinen Channel ein.<br>
            <strong>Schritt 3:</strong> Trage Token und Channel-ID unten ein.
          </div>

          <div class="form-group">
            <label>Bot-Token <span class="required">*</span></label>
            <input
              type="password"
              [(ngModel)]="config.botToken"
              name="botToken"
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              autocomplete="off"
              class="form-input">
            <small>Von &#64;BotFather erhalten. Wird verschlüsselt gespeichert.</small>
          </div>

          <div class="form-group">
            <label>Channel-ID <span class="required">*</span></label>
            <input
              type="text"
              [(ngModel)]="config.channelId"
              name="channelId"
              placeholder="&#64;meinkanal oder -100123456789"
              class="form-input">
            <small>&#64;username des Channels (öffentlich) oder numerische ID (aus Bot-Updates).</small>
          </div>

          <div class="form-group">
            <label>Max. Posts pro Import</label>
            <input
              type="number"
              [(ngModel)]="config.importLimit"
              name="importLimit"
              min="1" max="100"
              class="form-input form-input-small">
            <small>Zwischen 1 und 100 (Standard: 50)</small>
          </div>
        </div>

        <!-- NOTIFICATIONS -->
        <div class="form-section">
          <h3>🔔 Benachrichtigungen</h3>

          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Neue Bestellungen</strong>
              <small>Bot sendet dir beim Eingang jeder neuen Bestellung eine Nachricht</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="config.notifyNewOrders" name="notifyNewOrders">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Niedriger Lagerbestand</strong>
              <small>Alert wenn Produkt-Lagerstand unter Schwellenwert fällt</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="config.notifyLowStock" name="notifyLowStock">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="form-group" *ngIf="config.notifyLowStock" style="margin-top: 8px; padding-left: 16px">
            <label>Schwellenwert Lagerbestand</label>
            <input type="number" [(ngModel)]="config.lowStockThreshold"
              name="lowStockThreshold" min="1" max="100" class="form-input form-input-small">
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Neue Produkte im Channel posten</strong>
              <small>Wenn du ein Produkt veröffentlichst, wird es automatisch in deinen Channel gepostet</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="config.postNewProducts" name="postNewProducts">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- AKTIV/INAKTIV -->
        <div class="form-section">
          <div class="toggle-row">
            <div class="toggle-info">
              <strong>Telegram-Integration aktiv</strong>
              <small>Deaktivieren ohne Konfiguration zu verlieren</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="config.active" name="active">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- AKTIONEN -->
        <div class="action-bar">
          <button type="button" class="btn-test"
            (click)="testConnection()"
            [disabled]="testing || !config.botToken || !config.channelId">
            {{ testing ? '⏳ Teste...' : '🧪 Verbindung testen' }}
          </button>

          <button type="submit" class="btn-save" [disabled]="saving">
            {{ saving ? '⏳ Speichern...' : '💾 Speichern' }}
          </button>
        </div>

        <!-- Feedback -->
        <div class="feedback success" *ngIf="successMsg">✅ {{ successMsg }}</div>
        <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>

      </form>
    </div>
  `,
  styles: [`
    .telegram-settings {
      max-width: 680px;
    }
    .section-header {
      display: flex; align-items: flex-start; gap: 16px;
      margin-bottom: 28px; flex-wrap: wrap;
    }
    .header-icon {
      font-size: 36px; line-height: 1;
    }
    .section-header h2 {
      font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #111827;
    }
    .section-header p {
      font-size: 14px; color: #6b7280; margin: 0;
    }
    .connection-badge {
      margin-left: auto; padding: 6px 14px; border-radius: 8px;
      background: #fef2f2; color: #b91c1c; font-size: 13px; font-weight: 600;
      white-space: nowrap; align-self: center;
    }
    .connection-badge.connected {
      background: #f0fdf4; color: #166534;
    }
    .form-section {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 20px; margin-bottom: 16px;
    }
    .form-section h3 {
      font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 16px;
    }
    .info-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 12px 16px; font-size: 13px; color: #1e40af;
      margin-bottom: 16px; line-height: 1.6;
    }
    .info-box a { color: #2563eb; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block; font-size: 13px; font-weight: 600; color: #374151;
      margin-bottom: 6px;
    }
    .required { color: #ef4444; }
    .form-input {
      width: 100%; padding: 10px 14px; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 14px; color: #111827;
      background: #fff; box-sizing: border-box;
      transition: border-color .15s, box-shadow .15s;
    }
    .form-input:focus {
      outline: none; border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,.15);
    }
    .form-input-small { width: 120px; }
    .form-group small { display: block; font-size: 12px; color: #6b7280; margin-top: 4px; }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; padding: 10px 0; border-bottom: 1px solid #f3f4f6;
    }
    .toggle-row:last-child { border-bottom: none; }
    .toggle-info strong { display: block; font-size: 14px; font-weight: 600; color: #111827; }
    .toggle-info small { font-size: 12px; color: #6b7280; }
    .toggle-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; cursor: pointer; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; inset: 0; background: #d1d5db; border-radius: 24px;
      transition: background .2s;
    }
    .toggle-slider::before {
      content: ''; position: absolute; width: 18px; height: 18px;
      left: 3px; top: 3px; background: #fff; border-radius: 50%;
      transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }
    input:checked + .toggle-slider { background: linear-gradient(135deg,#667eea,#764ba2); }
    input:checked + .toggle-slider::before { transform: translateX(20px); }
    .action-bar {
      display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px;
    }
    .btn-save, .btn-test {
      padding: 10px 24px; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: opacity .15s, transform .1s;
    }
    .btn-save:active, .btn-test:active { transform: scale(0.97); }
    .btn-save {
      background: linear-gradient(135deg,#667eea,#764ba2); color: #fff;
    }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .btn-test {
      background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
    }
    .btn-test:disabled { opacity: .5; cursor: not-allowed; }
    .feedback {
      margin-top: 12px; padding: 10px 16px; border-radius: 8px; font-size: 14px;
    }
    .feedback.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .feedback.error   { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .loading-state {
      display: flex; align-items: center; gap: 12px; padding: 20px;
      color: #6b7280; font-size: 14px;
    }
    .spinner {
      width: 18px; height: 18px; border: 2px solid #e5e7eb;
      border-top-color: #667eea; border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TelegramSettingsComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  config: TelegramConfig | null = null;
  loading   = false;
  saving    = false;
  testing   = false;
  successMsg = '';
  errorMsg   = '';

  constructor(private telegramService: TelegramService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {}

  private loadConfig(): void {
    this.loading = true;
    this.telegramService.getConfig(this.storeId).subscribe({
      next: cfg => {
        this.config = cfg;
        // Defaults setzen wenn noch keine Config vorhanden
        if (!this.config.notifyNewOrders && this.config.notifyNewOrders !== false)
          this.config.notifyNewOrders = true;
        if (!this.config.importLimit) this.config.importLimit = 50;
        if (!this.config.lowStockThreshold) this.config.lowStockThreshold = 5;
        this.loading = false;
      },
      error: () => {
        this.config = {
          storeId: this.storeId,
          notifyNewOrders: true,
          notifyLowStock: false,
          postNewProducts: false,
          lowStockThreshold: 5,
          importLimit: 50,
          active: false
        };
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.config) return;
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.telegramService.saveConfig(this.storeId, this.config).subscribe({
      next: updated => {
        this.config = updated;
        this.successMsg = 'Konfiguration gespeichert!';
        this.saving = false;
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: err => {
        this.errorMsg = 'Fehler beim Speichern: ' + (err.error?.message || err.message);
        this.saving = false;
      }
    });
  }

  testConnection(): void {
    this.testing = true;
    this.successMsg = '';
    this.errorMsg = '';

    // Erst speichern, dann testen (Token muss in DB sein)
    this.telegramService.saveConfig(this.storeId, this.config!).subscribe({
      next: () => {
        this.telegramService.testConnection(this.storeId).subscribe({
          next: result => {
            if (result.success) {
              this.successMsg = result.message;
              this.config!.connected = true;
            } else {
              this.errorMsg = result.message;
              this.config!.connected = false;
            }
            this.testing = false;
          },
          error: err => {
            this.errorMsg = 'Test fehlgeschlagen: ' + (err.error?.message || err.message);
            this.testing = false;
          }
        });
      },
      error: err => {
        this.errorMsg = 'Fehler beim Speichern: ' + (err.error?.message || err.message);
        this.testing = false;
      }
    });
  }
}

