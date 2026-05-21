import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelegramService, TelegramImportLogEntry } from '@app/core/services/telegram.service';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

/**
 * Import-Protokoll: Tabelle aller bisherigen Telegram-Imports pro Store.
 */
@Component({
  selector: 'app-telegram-import-log',
  standalone: true,
  imports: [CommonModule, ResponsiveDataListComponent],
  template: `
    <div class="telegram-log">
      <div class="log-header">
        <h3>📋 Import-Protokoll</h3>
        <button class="btn-refresh" (click)="load()" [disabled]="loading">
          {{ loading ? '⏳' : '🔄' }} Aktualisieren
        </button>
      </div>

      <app-responsive-data-list
        [items]="items"
        [columns]="columns"
        [loading]="loading"
        [rowClickable]="false"
        searchPlaceholder="Protokoll durchsuchen..."
        emptyIcon="📭"
        emptyMessage="Noch keine Imports. Löse deinen ersten Import oben aus.">
      </app-responsive-data-list>
    </div>
  `,
  styles: [`
    .telegram-log { }
    .log-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .log-header h3 { font-size: 15px; font-weight: 700; color: #111827; margin: 0; }
    .btn-refresh {
      padding: 6px 16px; background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #374151;
      cursor: pointer; transition: background .15s;
    }
    .btn-refresh:hover { background: #e5e7eb; }
    .btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class TelegramImportLogComponent implements OnInit {
  @Input() storeId!: number;

  items: (TelegramImportLogEntry & Record<string, any>)[] = [];
  loading = false;

  columns: ColumnConfig[] = [
    {
      key: 'telegramMsgId',
      label: 'Msg-ID',
      type: 'number',
      width: '80px',
      hideOnMobile: true
    },
    {
      key: 'channelId',
      label: 'Channel',
      type: 'text'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      badgeClass: (value: string) => {
        switch (value) {
          case 'SUCCESS': return 'status-active';
          case 'SKIPPED': return 'status-draft';
          case 'ERROR':   return 'status-archived';
          default:        return '';
        }
      }
    },
    {
      key: 'productId',
      label: 'Produkt-ID',
      type: 'text',
      formatFn: (value: number | null) => value ? `#${value}` : '–'
    },
    {
      key: 'importedAt',
      label: 'Importiert am',
      type: 'date',
      hideOnMobile: false
    },
    {
      key: 'errorMessage',
      label: 'Fehler',
      type: 'text',
      hideOnMobile: true,
      formatFn: (value: string | null) => value || '–'
    }
  ];

  constructor(private telegramService: TelegramService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.telegramService.getImportLog(this.storeId).subscribe({
      next: log => {
        this.items = log as any[];
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }
}

