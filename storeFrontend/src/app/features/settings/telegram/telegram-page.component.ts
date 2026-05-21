import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramSettingsComponent } from './telegram-settings.component';
import { TelegramImportComponent } from './telegram-import.component';
import { TelegramImportLogComponent } from './telegram-import-log.component';
import { TelegramService } from '@app/core/services/telegram.service';

/**
 * Telegram-Hauptseite mit Tab-Navigation:
 * - Tab 1: Konfiguration (Bot-Token, Notifications)
 * - Tab 2: Import (Posts aus Channel importieren)
 * - Tab 3: Protokoll (Import-Historie)
 */
@Component({
  selector: 'app-telegram-page',
  standalone: true,
  imports: [
    CommonModule,
    TelegramSettingsComponent,
    TelegramImportComponent,
    TelegramImportLogComponent
  ],
  template: `
    <div class="telegram-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">← Zurück</button>
          <div>
            <h1>✈️ Telegram Integration</h1>
            <p>Bot-Benachrichtigungen & Channel-Import für Store #{{ storeId }}</p>
          </div>
        </div>
      </div>

      <!-- Tab-Navigation -->
      <div class="tab-nav">
        <button class="tab-btn" [class.active]="activeTab === 'settings'"
          (click)="activeTab = 'settings'">
          ⚙️ Konfiguration
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'import'"
          (click)="activeTab = 'import'"
          [disabled]="!hasConfig">
          📥 Produkte importieren
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'log'"
          (click)="activeTab = 'log'"
          [disabled]="!hasConfig">
          📋 Import-Protokoll
        </button>
      </div>

      <!-- Tab-Content -->
      <div class="tab-content">
        <app-telegram-settings
          *ngIf="activeTab === 'settings'"
          [storeId]="storeId">
        </app-telegram-settings>

        <app-telegram-import
          *ngIf="activeTab === 'import' && storeId"
          [storeId]="storeId"
          [importLimit]="importLimit">
        </app-telegram-import>

        <app-telegram-import-log
          *ngIf="activeTab === 'log' && storeId"
          [storeId]="storeId">
        </app-telegram-import-log>
      </div>

    </div>
  `,
  styles: [`
    .telegram-page {
      max-width: 780px; margin: 0 auto; padding: 0 16px 40px;
    }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; padding: 20px 0; flex-wrap: wrap; gap: 12px;
    }
    .header-left {
      display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap;
    }
    .back-btn {
      padding: 8px 16px; background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #374151;
      cursor: pointer; white-space: nowrap;
    }
    .back-btn:hover { background: #e5e7eb; }
    .page-header h1 {
      font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px;
    }
    .page-header p { font-size: 14px; color: #6b7280; margin: 0; }
    .tab-nav {
      display: flex; gap: 4px; border-bottom: 2px solid #e5e7eb;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .tab-btn {
      padding: 10px 20px; background: none; border: none; border-bottom: 3px solid transparent;
      margin-bottom: -2px; font-size: 14px; font-weight: 600; color: #6b7280;
      cursor: pointer; transition: color .15s, border-color .15s; white-space: nowrap;
    }
    .tab-btn:hover { color: #374151; }
    .tab-btn.active { color: #667eea; border-bottom-color: #667eea; }
    .tab-btn:disabled { opacity: .4; cursor: not-allowed; }
    .tab-content {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;
    }
  `]
})
export class TelegramPageComponent implements OnInit {

  storeId = 0;
  activeTab: 'settings' | 'import' | 'log' = 'settings';
  hasConfig = false;
  importLimit = 50;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private telegramService: TelegramService
  ) {}

  ngOnInit(): void {
    // Store-ID 3-stufig extrahieren (Projekt-Standard)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }
    this.storeId = id ? +id : 0;

    if (this.storeId) {
      this.telegramService.getConfig(this.storeId).subscribe({
        next: cfg => {
          this.hasConfig = !!(cfg.botToken || cfg.channelId);
          this.importLimit = cfg.importLimit || 50;
        },
        error: () => this.hasConfig = false
      });
    }
  }

  goBack(): void {
    this.router.navigate(['../..'], { relativeTo: this.route });
  }
}

