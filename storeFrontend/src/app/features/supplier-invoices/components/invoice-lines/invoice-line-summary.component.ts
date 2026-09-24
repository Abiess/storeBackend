import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LineSummary } from '@app/core/models/invoice-line.model';

@Component({
    selector: 'app-invoice-line-summary',
    imports: [CommonModule, TranslateModule],
    template: `
    <div class="line-summary">
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-value">{{ summary.detected }}</span>
          <span class="stat-label">erkannt</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ summary.confirmed }}</span>
          <span class="stat-label">bestätigt</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ summary.mapped }}</span>
          <span class="stat-label">zugeordnet</span>
        </div>
        <div class="stat stat-warning">
          <span class="stat-value">{{ summary.needsReview }}</span>
          <span class="stat-label">bitte prüfen</span>
        </div>
      </div>
      
      <div class="summary-actions">
        <button 
          class="btn-bulk-confirm"
          (click)="bulkConfirm.emit()"
          [disabled]="loading || summary.needsReview === 0">
          <span class="icon">✓</span>
          Alle Positionen ohne Warnung bestätigen
        </button>
      </div>
    </div>
  `,
    styles: [`
    .line-summary {
      background: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .summary-stats {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    
    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #1976d2;
    }
    
    .stat-warning .stat-value {
      color: #f57c00;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-actions {
      display: flex;
      gap: 1rem;
    }
    
    .btn-bulk-confirm {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-bulk-confirm:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-bulk-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .icon {
      font-size: 1.25rem;
    }
    
    @media (max-width: 768px) {
      .summary-stats {
        gap: 1rem;
      }
      
      .stat-value {
        font-size: 1.5rem;
      }
      
      .btn-bulk-confirm {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class InvoiceLineSummaryComponent {
  @Input() summary!: LineSummary;
  @Input() loading = false;
  @Output() bulkConfirm = new EventEmitter<void>();
}
