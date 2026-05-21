import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelegramService, TelegramImportResult } from '@app/core/services/telegram.service';

/**
 * Telegram Channel Import.
 * Löst den Import der letzten Channel-Posts aus und zeigt das Ergebnis.
 */
@Component({
  selector: 'app-telegram-import',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="telegram-import">

      <div class="section-header">
        <h3>📥 Channel-Import</h3>
        <p>
          Importiert die letzten Posts aus deinem konfigurierten Telegram-Channel als Produkte (Status: Entwurf).
          Bereits importierte Posts werden automatisch übersprungen.
        </p>
      </div>

      <!-- Import-Button -->
      <div class="import-action">
        <button class="btn-import" (click)="startImport()" [disabled]="importing">
          <span *ngIf="!importing">📥 Jetzt importieren</span>
          <span *ngIf="importing">
            <span class="spinner-inline"></span> Importiere Posts...
          </span>
        </button>
        <small>Bot muss als Admin im Channel eingetragen sein. Max. {{ importLimit }} Posts pro Durchlauf.</small>
      </div>

      <!-- Fehler -->
      <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>

      <!-- Ergebnis -->
      <div class="result-card" *ngIf="result">
        <div class="result-stats">
          <div class="stat success">
            <strong>{{ result.imported }}</strong>
            <span>Importiert</span>
          </div>
          <div class="stat neutral">
            <strong>{{ result.skipped }}</strong>
            <span>Übersprungen</span>
          </div>
          <div class="stat error">
            <strong>{{ result.errors }}</strong>
            <span>Fehler</span>
          </div>
        </div>

        <!-- Importierte Titel -->
        <div class="imported-list" *ngIf="result.importedTitles.length > 0">
          <h4>✅ Importierte Produkte ({{ result.importedTitles.length }})</h4>
          <ul>
            <li *ngFor="let title of result.importedTitles">{{ title }}</li>
          </ul>
        </div>

        <!-- Fehler-Details -->
        <div class="error-list" *ngIf="result.errorMessages.length > 0">
          <h4>❌ Fehler ({{ result.errorMessages.length }})</h4>
          <ul>
            <li *ngFor="let msg of result.errorMessages" class="error-item">{{ msg }}</li>
          </ul>
        </div>

        <div class="no-result" *ngIf="result.imported === 0 && result.errors === 0">
          📭 Keine neuen Posts gefunden. Alle bereits importierten Posts werden übersprungen.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .telegram-import { max-width: 680px; }
    .section-header { margin-bottom: 20px; }
    .section-header h3 { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 6px; }
    .section-header p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; }
    .import-action {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
    }
    .import-action small { font-size: 12px; color: #9ca3af; }
    .btn-import {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; background: linear-gradient(135deg,#667eea,#764ba2);
      color: #fff; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      width: fit-content; transition: opacity .15s, transform .1s;
    }
    .btn-import:hover { opacity: .9; }
    .btn-import:active { transform: scale(.97); }
    .btn-import:disabled { opacity: .5; cursor: not-allowed; }
    .spinner-inline {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .feedback { padding: 10px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
    .feedback.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .result-card {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;
    }
    .result-stats {
      display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .stat {
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 24px; border-radius: 10px; min-width: 80px;
    }
    .stat strong { font-size: 28px; font-weight: 700; }
    .stat span { font-size: 12px; font-weight: 500; margin-top: 2px; }
    .stat.success { background: #f0fdf4; color: #166534; }
    .stat.neutral { background: #f9fafb; color: #374151; border: 1px solid #e5e7eb; }
    .stat.error   { background: #fef2f2; color: #b91c1c; }
    .imported-list, .error-list { margin-top: 12px; }
    .imported-list h4, .error-list h4 {
      font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px;
    }
    ul { margin: 0; padding-left: 20px; }
    li { font-size: 13px; color: #374151; margin-bottom: 4px; }
    .error-item { color: #b91c1c; }
    .no-result { font-size: 14px; color: #6b7280; text-align: center; padding: 12px 0; }
  `]
})
export class TelegramImportComponent implements OnInit {
  @Input() storeId!: number;
  @Input() importLimit = 50;

  importing = false;
  result: TelegramImportResult | null = null;
  errorMsg = '';

  constructor(private telegramService: TelegramService) {}

  ngOnInit(): void {}

  startImport(): void {
    this.importing = true;
    this.errorMsg = '';
    this.result = null;

    this.telegramService.triggerImport(this.storeId).subscribe({
      next: result => {
        this.result = result;
        this.importing = false;
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Import fehlgeschlagen. Bitte Konfiguration prüfen.';
        this.importing = false;
      }
    });
  }
}

