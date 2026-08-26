import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DhlSlot } from '@app/core/services/dhl.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Slot Grid Component (Kino-Style)
 * 
 * Displays slots in a grid layout with visual status indicators
 */
@Component({
  selector: 'app-dhl-slot-grid',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="slot-grid">
      <div *ngFor="let row of rows" class="slot-row">
        <div class="row-label">{{ row.label }}</div>
        <div class="row-slots">
          <button
            *ngFor="let slot of row.slots"
            class="slot"
            [class.occupied]="slot.occupied"
            [class.free]="!slot.occupied"
            [class.selectable]="selectable && !slot.occupied"
            [disabled]="slot.occupied || !slot.active || !selectable"
            (click)="onSlotClick(slot)">
            <div class="slot-code">{{ slot.code }}</div>
            <div class="slot-status">
              <span *ngIf="slot.occupied">● {{ 'dhl.grid.occupied' | translate }}</span>
              <span *ngIf="!slot.occupied">✓ {{ 'dhl.grid.free' | translate }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slot-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .slot-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .row-label {
      font-size: 1.5rem;
      font-weight: bold;
      width: 40px;
      text-align: center;
      color: #667eea;
    }

    .row-slots {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .slot {
      min-width: 80px;
      padding: 0.75rem;
      border: 2px solid;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .slot.free {
      border-color: #28a745;
      background: #d4edda;
    }

    .slot.occupied {
      border-color: #dc3545;
      background: #f8d7da;
      cursor: not-allowed;
    }

    .slot.selectable:not(.occupied):hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .slot:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .slot-code {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    .slot-status {
      font-size: 0.75rem;
      color: #666;
    }

    @media (max-width: 768px) {
      .row-slots {
        flex-wrap: wrap;
      }
      
      .slot {
        min-width: 60px;
        padding: 0.5rem;
      }
      
      .slot-code {
        font-size: 1rem;
      }
    }
  `]
})
export class DhlSlotGridComponent {
  @Input() slots: DhlSlot[] = [];
  @Input() selectable = false;
  @Output() slotSelected = new EventEmitter<DhlSlot>();

  get rows() {
    const grouped: {[key: string]: DhlSlot[]} = {};
    
    this.slots.forEach(slot => {
      const rowLabel = slot.code.charAt(0);
      if (!grouped[rowLabel]) {
        grouped[rowLabel] = [];
      }
      grouped[rowLabel].push(slot);
    });

    return Object.keys(grouped).sort().map(label => ({
      label,
      slots: grouped[label].sort((a, b) => a.sortOrder - b.sortOrder)
    }));
  }

  onSlotClick(slot: DhlSlot): void {
    if (this.selectable && !slot.occupied && slot.active) {
      this.slotSelected.emit(slot);
    }
  }
}
