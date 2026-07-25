import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineStatus } from '@app/core/models/invoice-line.model';

@Component({
  selector: 'app-invoice-line-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'status-badge ' + badgeClass">
      {{ statusLabel }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .status-unreviewed {
      background: #e3f2fd;
      color: #1976d2;
    }
    
    .status-review-required {
      background: #fff3e0;
      color: #f57c00;
    }
    
    .status-confirmed {
      background: #e8f5e9;
      color: #388e3c;
    }
    
    .status-mapped {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
  `]
})
export class InvoiceLineStatusBadgeComponent {
  @Input() status!: LineStatus;
  
  get statusLabel(): string {
    switch (this.status) {
      case 'UNREVIEWED': return 'Nicht geprüft';
      case 'REVIEW_REQUIRED': return 'Bitte prüfen';
      case 'CONFIRMED': return 'Bestätigt';
      case 'MAPPED': return 'Zugeordnet';
      default: return this.status;
    }
  }
  
  get badgeClass(): string {
    return `status-${this.status.toLowerCase().replace('_', '-')}`;
  }
}
