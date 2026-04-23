import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { UsageService, UsageStats, UsageItem } from '@app/core/services/usage.service';

interface UsageRow {
  icon: string;
  labelKey: string;
  unitKey?: string;
  item: UsageItem;
}

/**
 * Wiederverwendbares Widget zur Anzeige der Plan-Verbrauchs-Statistiken:
 *  - Stores, Produkte, Speicher (MB), Custom Domains, Subdomains, AI-Calls, Endkunden
 * Lädt automatisch via UsageService.getMyUsage().
 * Responsive Grid (1/2/3 Spalten je nach Breite), RTL-fähig (Arabisch).
 */
@Component({
  selector: 'app-usage-widget',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="usage-widget" *ngIf="!loading && stats">
      <header class="usage-header">
        <h3>{{ 'usage.title' | translate }}</h3>
        <span class="plan-badge" [attr.data-plan]="stats.plan">{{ stats.plan }}</span>
      </header>

      <div class="usage-grid">
        <div *ngFor="let row of rows" class="usage-card">
          <div class="card-head">
            <span class="card-icon" aria-hidden="true">{{ row.icon }}</span>
            <span class="card-label">{{ row.labelKey | translate }}</span>
          </div>

          <div class="card-value">
            <strong>{{ formatUsed(row) }}</strong>
            <span class="card-limit" *ngIf="row.item.limit !== null">
              <span aria-hidden="true">/</span>
              {{ row.item.limit === -1 ? '∞' : row.item.limit }}
              <span *ngIf="row.unitKey" class="card-unit">{{ row.unitKey | translate }}</span>
            </span>
          </div>

          <div class="card-bar" *ngIf="row.item.percent !== null && row.item.limit !== -1">
            <div class="card-bar-fill"
                 [style.width.%]="row.item.percent"
                 [class.warn]="(row.item.percent || 0) >= 80"
                 [class.danger]="(row.item.percent || 0) >= 95"></div>
          </div>
          <div class="card-bar-unlimited" *ngIf="row.item.limit === -1">
            {{ 'usage.unlimited' | translate }}
          </div>
        </div>
      </div>
    </section>

    <div class="usage-loading" *ngIf="loading">
      <div class="spinner"></div>
      <p>{{ 'usage.loading' | translate }}</p>
    </div>

    <div class="usage-error" *ngIf="error">
      <span aria-hidden="true">⚠️</span>
      <p>{{ 'usage.error' | translate }}</p>
      <button type="button" class="btn-retry" (click)="load()">{{ 'common.retry' | translate }}</button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .usage-widget {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 22px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .usage-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .usage-header h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
    .plan-badge {
      padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase;
      background: linear-gradient(135deg,#667eea,#764ba2); color: #fff;
    }
    .plan-badge[data-plan="FREE"] { background: linear-gradient(135deg,#9ca3af,#6b7280); }
    .plan-badge[data-plan="ENTERPRISE"] { background: linear-gradient(135deg,#f59e0b,#d97706); }

    .usage-grid {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    .usage-card {
      background: #f9fafb; border: 1px solid #f1f5f9; border-radius: 10px; padding: 14px 16px;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .usage-card:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.04); }

    .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #6b7280; }
    .card-icon { font-size: 18px; }
    .card-label { font-size: 13px; font-weight: 500; }

    .card-value { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
    .card-value strong { font-size: 22px; font-weight: 700; color: #111827; }
    .card-limit { font-size: 13px; color: #6b7280; }
    .card-unit { margin-inline-start: 2px; }

    .card-bar {
      height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden;
    }
    .card-bar-fill {
      height: 100%; background: linear-gradient(90deg,#10b981,#059669);
      border-radius: 999px; transition: width .35s ease;
    }
    .card-bar-fill.warn { background: linear-gradient(90deg,#f59e0b,#d97706); }
    .card-bar-fill.danger { background: linear-gradient(90deg,#ef4444,#dc2626); }
    .card-bar-unlimited {
      font-size: 12px; color: #059669; font-weight: 600;
    }

    .usage-loading, .usage-error {
      display: flex; align-items: center; gap: 12px; padding: 18px 22px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      margin-bottom: 24px;
    }
    .usage-error { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .btn-retry {
      margin-inline-start: auto; padding: 6px 14px; font-size: 13px;
      background: #fff; border: 1px solid #fca5a5; border-radius: 6px;
      color: #b91c1c; cursor: pointer;
    }
    .btn-retry:hover { background: #fee2e2; }

    .spinner {
      width: 18px; height: 18px; border: 2px solid #e5e7eb;
      border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
      .usage-widget { padding: 16px; }
      .usage-grid { grid-template-columns: 1fr; }
    }

    /* RTL Support */
    :host-context([dir="rtl"]) .card-bar-fill { transform-origin: right; }
  `]
})
export class UsageWidgetComponent implements OnInit {

  /** Optional: bereits geladene Stats von außen reinreichen statt selbst zu fetchen. */
  @Input() preloaded?: UsageStats | null;

  stats: UsageStats | null = null;
  rows: UsageRow[] = [];
  loading = false;
  error = false;

  constructor(private usageService: UsageService) {}

  ngOnInit(): void {
    if (this.preloaded) {
      this.applyStats(this.preloaded);
    } else {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.usageService.getMyUsage().subscribe({
      next: stats => {
        this.applyStats(stats);
        this.loading = false;
      },
      error: err => {
        console.error('[UsageWidget] Failed to load usage:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  formatUsed(row: UsageRow): string {
    if (row.item.limit !== null && row.item.used >= 1000) {
      return new Intl.NumberFormat().format(row.item.used);
    }
    return row.item.used.toString();
  }

  private applyStats(stats: UsageStats): void {
    this.stats = stats;
    this.rows = [
      { icon: '🏪', labelKey: 'usage.stores',        item: stats.stores },
      { icon: '📦', labelKey: 'usage.products',      item: stats.products },
      { icon: '💾', labelKey: 'usage.storage',       unitKey: 'usage.unitMb', item: stats.storageMb },
      { icon: '🌐', labelKey: 'usage.customDomains', item: stats.customDomains },
      { icon: '🔗', labelKey: 'usage.subdomains',    item: stats.subdomains },
      { icon: '🤖', labelKey: 'usage.aiCalls',       item: stats.aiCallsThisMonth },
      { icon: '👥', labelKey: 'usage.customers',     item: stats.customers }
    ];
  }
}

