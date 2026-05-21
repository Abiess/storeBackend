import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramSettingsComponent } from './telegram-settings.component';
import { TelegramImportComponent } from './telegram-import.component';
import { TelegramImportLogComponent } from './telegram-import-log.component';
import { TelegramMtprotoComponent } from './telegram-mtproto.component';
import { TelegramService } from '@app/core/services/telegram.service';

/**
 * Telegram-Hauptseite mit Tab-Navigation.
 *
 * Tab-Struktur (klar getrennt):
 *   📡 Channel Importer  → MTProto (api_id + api_hash) – Channels LESEN
 *   ⚙️ Bot-Einstellungen → Bot Token – Benachrichtigungen SENDEN
 *   📥 Bot-Import        → Einfacher Import via Bot (wenn Bot Channel-Admin)
 *   📋 Protokoll         → Import-Historie
 */
@Component({
  selector: 'app-telegram-page',
  standalone: true,
  imports: [
    CommonModule,
    TelegramSettingsComponent,
    TelegramImportComponent,
    TelegramImportLogComponent,
    TelegramMtprotoComponent
  ],
  template: `
    <div class="telegram-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">← Zurück</button>
          <div>
            <h1>✈️ Telegram Integration</h1>
            <p>Channel Importer &amp; Bot-Benachrichtigungen für Store #{{ storeId }}</p>
          </div>
        </div>
      </div>

      <!-- Tab-Navigation -->
      <div class="tab-nav">
        <button class="tab-btn" [class.active]="activeTab === 'importer'"
          (click)="activeTab = 'importer'">
          📡 Channel Importer
          <span class="tab-badge">MTProto</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'bot'"
          (click)="activeTab = 'bot'">
          🤖 Bot-Einstellungen
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'bot-import'"
          (click)="activeTab = 'bot-import'">
          📥 Bot-Import
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'log'"
          (click)="activeTab = 'log'">
          📋 Protokoll
        </button>
      </div>

      <!-- Tab-Content -->
      <div class="tab-content">

        <!-- MTProto Channel Importer (Hauptfeature) -->
        <div *ngIf="activeTab === 'importer'">
          <app-telegram-mtproto [storeId]="storeId"></app-telegram-mtproto>
        </div>

        <!-- Bot-Einstellungen (Benachrichtigungen senden) -->
        <div *ngIf="activeTab === 'bot'">
          <div class="feature-note">
            <strong>🤖 Bot-Benachrichtigungen</strong><br>
            Richte einen Telegram-Bot ein um automatisch Benachrichtigungen
            bei neuen Bestellungen, niedrigem Lagerbestand etc. zu erhalten.
            Der Bot benötigt Admin-Rechte im Channel.
          </div>
          <app-telegram-settings [storeId]="storeId"></app-telegram-settings>
        </div>

        <!-- Bot-Import (einfach, nur wenn Bot Channel-Admin) -->
        <div *ngIf="activeTab === 'bot-import'">
          <div class="feature-note">
            <strong>📥 Bot-Import</strong><br>
            Importiert die letzten Posts aus dem in den Bot-Einstellungen konfigurierten Channel.
            Setzt voraus dass der Bot als Admin im Channel eingetragen ist.
            Für unbegrenzte Channel-Auswahl → <strong>Channel Importer (MTProto)</strong> verwenden.
          </div>
          <app-telegram-import [storeId]="storeId" [importLimit]="importLimit"></app-telegram-import>
        </div>

        <!-- Protokoll -->
        <div *ngIf="activeTab === 'log'">
          <app-telegram-import-log [storeId]="storeId"></app-telegram-import-log>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .telegram-page { max-width: 800px; margin: 0 auto; padding: 0 16px 40px; }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; padding: 20px 0; flex-wrap: wrap; gap: 12px;
    }
    .header-left { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .back-btn {
      padding: 8px 16px; background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer;
    }
    .back-btn:hover { background: #e5e7eb; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px; }
    .page-header p { font-size: 14px; color: #6b7280; margin: 0; }
    .tab-nav {
      display: flex; gap: 4px; border-bottom: 2px solid #e5e7eb;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 18px; background: none; border: none;
      border-bottom: 3px solid transparent; margin-bottom: -2px;
      font-size: 14px; font-weight: 600; color: #6b7280;
      cursor: pointer; transition: color .15s, border-color .15s; white-space: nowrap;
    }
    .tab-btn:hover { color: #374151; }
    .tab-btn.active { color: #667eea; border-bottom-color: #667eea; }
    .tab-badge {
      padding: 2px 8px; background: linear-gradient(135deg,#667eea,#764ba2);
      color: #fff; border-radius: 20px; font-size: 10px; font-weight: 700;
    }
    .tab-content {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;
    }
    .feature-note {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
      padding: 14px 18px; font-size: 13px; color: #1e40af; margin-bottom: 20px;
      line-height: 1.6;
    }
    .feature-note strong { color: #1d4ed8; }
  `]
})
export class TelegramPageComponent implements OnInit {

  storeId = 0;
  activeTab: 'importer' | 'bot' | 'bot-import' | 'log' = 'importer';
  importLimit = 50;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private telegramService: TelegramService
  ) {}

  ngOnInit(): void {
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }
    this.storeId = id ? +id : 0;

    if (this.storeId) {
      this.telegramService.getConfig(this.storeId).subscribe({
        next: cfg => { this.importLimit = cfg.importLimit || 50; },
        error: () => {}
      });
    }
  }

  goBack(): void {
    this.router.navigate([`/stores/${this.storeId}/settings`]);
  }
}
