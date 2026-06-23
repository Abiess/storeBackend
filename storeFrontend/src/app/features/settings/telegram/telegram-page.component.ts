import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramSettingsComponent } from './telegram-settings.component';
import { TelegramImportComponent } from './telegram-import.component';
import { TelegramImportLogComponent } from './telegram-import-log.component';
import { TelegramMtprotoComponent } from './telegram-mtproto.component';
import { TelegramService } from '@app/core/services/telegram.service';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';

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
    TelegramMtprotoComponent,
    StoreNavigationComponent
  ],
  template: `
    <div class="telegram-page">

      <app-store-navigation [currentPage]="'Telegram'"></app-store-navigation>

      <!-- Hero Header -->
      <div class="tg-hero">
        <div class="tg-hero-bg">
          <span class="blob blob1"></span>
          <span class="blob blob2"></span>
          <span class="blob blob3"></span>
        </div>
        <div class="tg-hero-content">
          <div class="tg-icon-ring">✈️</div>
          <div>
            <h1 class="tg-title">Telegram Integration</h1>
            <p class="tg-subtitle">Channel Importer &amp; Bot-Benachrichtigungen für deinen Store</p>
          </div>
          <div class="tg-pills">
            <span class="pill pill-pink">📡 MTProto</span>
            <span class="pill pill-purple">🤖 Bot API</span>
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
    .telegram-page { max-width: 960px; margin: 0 auto; padding: 0 16px 48px; }

    /* ── Hero ─────────────────────────────────────────────────── */
    .tg-hero {
      position: relative; overflow: hidden;
      border-radius: 20px; margin-bottom: 28px;
      background: linear-gradient(135deg, #ec4899 0%, #a855f7 45%, #667eea 100%);
      padding: 32px 28px; box-shadow: 0 8px 32px rgba(168,85,247,.28);
    }
    .tg-hero-bg { position: absolute; inset: 0; pointer-events: none; }
    .blob {
      position: absolute; border-radius: 50%; opacity: .18; filter: blur(40px);
    }
    .blob1 { width: 220px; height: 220px; background: #f9a8d4; top: -60px; left: -60px; }
    .blob2 { width: 180px; height: 180px; background: #c084fc; bottom: -50px; right: 20px; }
    .blob3 { width: 120px; height: 120px; background: #818cf8; top: 10px; right: 120px; }

    .tg-hero-content {
      position: relative; display: flex; align-items: center;
      gap: 20px; flex-wrap: wrap;
    }
    .tg-icon-ring {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(255,255,255,.22); backdrop-filter: blur(8px);
      border: 2px solid rgba(255,255,255,.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(0,0,0,.12);
    }
    .tg-title {
      margin: 0 0 4px; font-size: 24px; font-weight: 800;
      color: #fff; letter-spacing: -.3px;
      text-shadow: 0 2px 8px rgba(0,0,0,.15);
    }
    .tg-subtitle { margin: 0; font-size: 13.5px; color: rgba(255,255,255,.82); }
    .tg-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
    .pill {
      padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
      backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.35);
      color: #fff; white-space: nowrap;
    }
    .pill-pink  { background: rgba(236,72,153,.35); }
    .pill-purple { background: rgba(168,85,247,.35); }

    /* ── Tabs ──────────────────────────────────────────────────── */
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
    .tab-btn.active { color: #a855f7; border-bottom-color: #a855f7; }
    .tab-badge {
      padding: 2px 8px; background: linear-gradient(135deg,#ec4899,#a855f7);
      color: #fff; border-radius: 20px; font-size: 10px; font-weight: 700;
    }

    /* ── Content ───────────────────────────────────────────────── */
    .tab-content {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px;
      box-shadow: 0 2px 12px rgba(168,85,247,.06);
    }
    .feature-note {
      background: linear-gradient(135deg,#fdf4ff,#fce7f3);
      border: 1px solid #e879f9; border-radius: 12px;
      padding: 14px 18px; font-size: 13px; color: #7e22ce; margin-bottom: 20px;
      line-height: 1.6;
    }
    .feature-note strong { color: #a21caf; }
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
