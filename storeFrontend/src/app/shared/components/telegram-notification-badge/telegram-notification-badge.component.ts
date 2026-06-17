import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { TelegramService, TelegramSyncNotification } from '@app/core/services/telegram.service';

/**
 * Telegram Notification Badge + Panel.
 *
 * Zeigt dezent an wenn neue Telegram-Produkte importiert wurden.
 * Polling alle 60s. Kein störendes Popup – nur Badge + expandierbares Panel.
 *
 * Usage:
 *   <app-telegram-notification-badge [storeId]="storeId">
 *   </app-telegram-notification-badge>
 */
@Component({
  selector: 'app-telegram-notification-badge',
  standalone: true,
  imports: [ CommonModule],
  template: `
    <div class="tg-notif-wrapper" *ngIf="unreadCount > 0 || panelOpen">

      <!-- Badge-Button -->
      <button class="tg-badge-btn" (click)="togglePanel()" [class.open]="panelOpen">
        <span class="tg-icon">📡</span>
        <span class="tg-badge-text" *ngIf="!panelOpen">
          {{ summaryText }}
        </span>
        <span class="tg-badge-count" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
        <span class="tg-chevron">{{ panelOpen ? '▲' : '▼' }}</span>
      </button>

      <!-- Dropdown Panel -->
      <div class="tg-panel" *ngIf="panelOpen">
        <div class="tg-panel-header">
          <span>📡 Telegram Updates</span>
          <div class="tg-panel-actions">
            <button class="tg-action-btn" (click)="markAllRead()" *ngIf="unreadCount > 0">
              ✓ Alle als gelesen
            </button>
            <button class="tg-action-btn tg-action-link" (click)="goToImport()">
              Zum Import →
            </button>
          </div>
        </div>

        <div class="tg-notifications" *ngIf="notifications.length > 0">
          <div class="tg-notif-item" *ngFor="let n of notifications"
               [class.tg-notif-error]="n.type === 'IMPORT_ERROR'"
               [class.tg-notif-warn]="n.type === 'PRICE_MISSING' || n.type === 'IMAGE_MISSING'"
               [class.tg-notif-info]="n.type === 'NEW_PRODUCTS'"
               [class.tg-notif-muted]="n.type === 'DUPLICATE'">
            <span class="tg-notif-icon">{{ notifIcon(n.type) }}</span>
            <div class="tg-notif-body">
              <span class="tg-notif-msg">{{ n.message }}</span>
              <span class="tg-notif-time">{{ formatTime(n.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="tg-empty" *ngIf="notifications.length === 0">
          <p>Keine neuen Meldungen.</p>
        </div>

        <!-- Produkte mit Preis-Warnung anzeigen -->
        <div class="tg-price-warning" *ngIf="hasPriceMissing">
          ⚠️ Einige importierte Produkte haben Standardpreis 1 –
          <button class="tg-link-btn" (click)="goToProducts()">Jetzt prüfen</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tg-notif-wrapper { position: relative; display: inline-block; }

    .tg-badge-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 12px; border-radius: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
      transition: opacity .15s, transform .1s;
      box-shadow: 0 2px 8px rgba(102,126,234,.35);
    }
    .tg-badge-btn:hover { opacity: .9; transform: translateY(-1px); }
    .tg-badge-btn.open { border-radius: 12px 12px 0 0; }

    .tg-icon { font-size: 16px; }
    .tg-badge-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tg-badge-count {
      background: #ff4444; color: #fff; border-radius: 50%;
      min-width: 18px; height: 18px; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; padding: 0 4px;
    }
    .tg-chevron { font-size: 10px; opacity: .8; }

    .tg-panel {
      position: absolute; top: 100%; right: 0; z-index: 1000;
      background: #fff; border-radius: 0 0 12px 12px;
      border: 1px solid #e5e7eb; border-top: none;
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      width: 360px; max-height: 400px; overflow-y: auto;
    }

    .tg-panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid #f0f0f0;
      font-size: 13px; font-weight: 700; color: #374151;
      background: #f9fafb;
    }
    .tg-panel-actions { display: flex; gap: 8px; }
    .tg-action-btn {
      background: none; border: none; cursor: pointer; font-size: 12px;
      color: #667eea; padding: 3px 6px; border-radius: 4px;
      font-weight: 600;
    }
    .tg-action-btn:hover { background: #eff6ff; }
    .tg-action-link { text-decoration: underline; }

    .tg-notifications { padding: 6px 0; }
    .tg-notif-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 9px 14px; border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .tg-notif-item:last-child { border-bottom: none; }
    .tg-notif-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .tg-notif-body { flex: 1; }
    .tg-notif-msg { display: block; color: #111827; line-height: 1.4; }
    .tg-notif-time { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }

    .tg-notif-info { background: #f0fdf4; }
    .tg-notif-warn { background: #fffbeb; }
    .tg-notif-error { background: #fef2f2; }
    .tg-notif-muted { background: #f9fafb; opacity: .75; }

    .tg-empty { padding: 20px; text-align: center; color: #9ca3af; font-size: 13px; }

    .tg-price-warning {
      padding: 10px 14px; background: #fffbeb; border-top: 1px solid #fde68a;
      font-size: 12px; color: #92400e;
    }
    .tg-link-btn {
      background: none; border: none; color: #d97706; cursor: pointer;
      font-weight: 700; text-decoration: underline; padding: 0; font-size: 12px;
    }
  `]
})
export class TelegramNotificationBadgeComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  unreadCount = 0;
  notifications: TelegramSyncNotification[] = [];
  panelOpen = false;
  hasPriceMissing = false;

  private pollSub?: Subscription;

  get summaryText(): string {
    if (this.unreadCount === 0) return 'Telegram Updates';
    const newProds = this.notifications.filter(n => n.type === 'NEW_PRODUCTS')
      .reduce((sum, n) => sum + n.count, 0);
    if (newProds > 0) {
      return `${newProds} neue Telegram-Produkt${newProds > 1 ? 'e' : ''}`;
    }
    return `${this.unreadCount} neue Meldung${this.unreadCount > 1 ? 'en' : ''}`;
  }

  constructor(
    private telegramService: TelegramService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Sofort laden + alle 60s pollen
    this.pollSub = interval(60_000).pipe(
      startWith(0),
      switchMap(() => this.telegramService.mtprotoGetNotifications(this.storeId))
    ).subscribe({
      next: res => {
        this.notifications = res.notifications;
        this.unreadCount = res.unreadCount;
        this.hasPriceMissing = res.notifications.some(n => n.type === 'PRICE_MISSING');
      },
      error: () => {} // Stille Fehler – Badge verschwindet einfach
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  markAllRead(): void {
    this.telegramService.mtprotoMarkNotificationsRead(this.storeId).subscribe({
      next: () => {
        this.unreadCount = 0;
        this.notifications = [];
        this.panelOpen = false;
      }
    });
  }

  goToImport(): void {
    // Korrekte Route: stores/:id/telegram (NICHT stores/:id/settings/telegram)
    this.router.navigate(['/stores', this.storeId, 'telegram']);
    this.panelOpen = false;
  }

  goToProducts(): void {
    this.router.navigate(['/stores', this.storeId, 'products'], {
      queryParams: { filter: 'price-review' }
    });
    this.panelOpen = false;
  }

  notifIcon(type: string): string {
    const icons: Record<string, string> = {
      'NEW_PRODUCTS': '🆕',
      'IMPORT_ERROR': '❌',
      'PRICE_MISSING': '💰',
      'IMAGE_MISSING': '🖼️',
      'DUPLICATE': '🔁'
    };
    return icons[type] || '📋';
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Gerade eben';
    if (diff < 60) return `vor ${diff} Min`;
    if (diff < 1440) return `vor ${Math.floor(diff / 60)} Std`;
    return d.toLocaleDateString('de');
  }
}

