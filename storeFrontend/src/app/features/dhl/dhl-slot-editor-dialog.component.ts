import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DhlLayoutService } from '@app/core/services/dhl-layout.service';
import { DhlShelfSlotLayout, DhlZone, SlotSize } from '@app/core/models/dhl.model';
import { DhlService } from '@app/core/services/dhl.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Slot Editor Dialog
 * 
 * Edit slot properties:
 * - Code (unique per store)
 * - Capacity (with occupied validation)
 * - Size (S/M/L/XL)
 * - Zone assignment
 * - Active status (with occupied validation)
 */
@Component({
  selector: 'app-dhl-slot-editor-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>{{ 'dhl.slotEditor.title' | translate }}</h2>
          <button class="btn-close" (click)="close()">✕</button>
        </div>

        <div class="dialog-body">
          <!-- Slot Info -->
          <div class="slot-info-card">
            <div class="info-row">
              <span class="label">{{ 'dhl.slotEditor.code' | translate }}:</span>
              <span class="value">{{ slot()?.slotCode }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ 'dhl.slotEditor.occupied' | translate }}:</span>
              <span class="value">{{ slot()?.occupiedCount || 0 }} / {{ slot()?.slotCapacity }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ 'dhl.slotEditor.free' | translate }}:</span>
              <span class="value">{{ (slot()?.slotCapacity || 0) - (slot()?.occupiedCount || 0) }}</span>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="form-section">
            <div class="form-group">
              <label>{{ 'dhl.slotEditor.capacity' | translate }} *</label>
              <input
                type="number"
                [(ngModel)]="formCapacity"
                min="1"
                [disabled]="loading()">
              <div *ngIf="capacityError()" class="field-error">
                {{ capacityError() }}
              </div>
            </div>

            <div class="form-group">
              <label>{{ 'dhl.slotEditor.size' | translate }}</label>
              <div class="size-options">
                <button
                  *ngFor="let size of sizeOptions"
                  class="size-btn"
                  [class.active]="formSize === size"
                  (click)="formSize = size"
                  [disabled]="loading()">
                  {{ size }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>{{ 'dhl.slotEditor.zone' | translate }}</label>
              <select [(ngModel)]="formZoneId" [disabled]="loading()">
                <option [ngValue]="null">{{ 'dhl.slotEditor.noZone' | translate }}</option>
                <option *ngFor="let zone of zones()" [ngValue]="zone.id">
                  {{ zone.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [(ngModel)]="formActive"
                  [disabled]="loading() || !canDeactivate()">
                {{ 'dhl.slotEditor.active' | translate }}
              </label>
              <div *ngIf="!canDeactivate()" class="field-hint">
                {{ 'dhl.slotEditor.cannotDeactivate' | translate }}
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div *ngIf="error()" class="error-message">
            {{ error() }}
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" (click)="close()" [disabled]="loading()">
            {{ 'common.cancel' | translate }}
          </button>
          <button class="btn-primary" (click)="save()" [disabled]="!canSave() || loading()">
            <span *ngIf="!loading()">{{ 'common.save' | translate }}</span>
            <span *ngIf="loading()">{{ 'common.saving' | translate }}...</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .dialog-content {
      background: white;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .btn-close:hover {
      background: #f0f0f0;
      color: #333;
    }

    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .slot-info-card {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row .label {
      font-weight: 600;
      color: #666;
    }

    .info-row .value {
      color: #333;
      font-weight: 600;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }

    .form-group input[type="number"],
    .form-group select {
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input:disabled,
    .form-group select:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .size-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }

    .size-btn {
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      background: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .size-btn:hover:not(:disabled) {
      border-color: #667eea;
      background: #f0f0ff;
    }

    .size-btn.active {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .size-btn:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"]:disabled {
      cursor: not-allowed;
    }

    .field-error {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #fee;
      border: 1px solid #dc3545;
      border-radius: 4px;
      color: #721c24;
      font-size: 0.9rem;
    }

    .field-hint {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #666;
      font-style: italic;
    }

    .error-message {
      margin-top: 1rem;
      padding: 1rem;
      background: #fee;
      border: 2px solid #dc3545;
      border-radius: 6px;
      color: #721c24;
      font-size: 0.95rem;
    }

    .dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #f0f0f0;
    }

    @media (max-width: 768px) {
      .dialog-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .size-options {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class DhlSlotEditorDialogComponent implements OnInit {
  private layoutService = inject(DhlLayoutService);
  private dhlService = inject(DhlService);
  
  // Props from parent
  storeId = input.required<number>();
  slot = input.required<DhlShelfSlotLayout>();
  
  // Internal state - zones loaded by dialog
  zones = signal<DhlZone[]>([]);
  
  // State
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Form fields
  formCapacity = 3;
  formSize: SlotSize = 'M';
  formZoneId: number | null = null;
  formActive = true;

  sizeOptions: SlotSize[] = ['S', 'M', 'L', 'XL'];

  capacityError = computed(() => {
    const currentSlot = this.slot();
    if (!currentSlot) return null;

    const occupied = currentSlot.occupiedCount || 0;
    if (this.formCapacity < occupied) {
      return `Kapazität kann nicht kleiner als belegte Plätze (${occupied}) sein`;
    }
    return null;
  });

  canDeactivate = computed(() => {
    const currentSlot = this.slot();
    if (!currentSlot) return true;
    return (currentSlot.occupiedCount || 0) === 0;
  });

  canSave = computed(() => {
    return this.formCapacity >= 1 && !this.capacityError();
  });

  ngOnInit(): void {
    // Load zones
    this.layoutService.getZones(this.storeId()).subscribe({
      next: (zones) => this.zones.set(zones),
      error: (err) => console.error('Failed to load zones:', err)
    });
    
    // Initialize form from slot
    const currentSlot = this.slot();
    if (currentSlot) {
      this.formCapacity = currentSlot.slotCapacity || 3;
      this.formSize = this.getSizeFromDimensions(currentSlot.gridWidth, currentSlot.gridHeight);
      this.formZoneId = currentSlot.zoneId || null;
      this.formActive = currentSlot.slotActive !== false;
    }
  }

  private getSizeFromDimensions(width: number, height: number): SlotSize {
    if (width === 1 && height === 1) return 'S';
    if (width === 2 && height === 1) return 'M';
    if (width === 2 && height === 2) return 'L';
    if (width >= 3) return 'XL';
    return 'M';
  }

  save(): void {
    if (!this.canSave()) return;

    const currentSlot = this.slot();
    if (!currentSlot) return;

    this.loading.set(true);
    this.error.set(null);

    // Update capacity via DhlService
    if (this.formCapacity !== currentSlot.slotCapacity) {
      this.dhlService.updateSlotCapacity(
        this.storeId(),
        currentSlot.slotId,
        this.formCapacity
      ).subscribe({
        next: () => {
          console.log('✅ Capacity updated');
          this.updateLayoutProperties();
        },
        error: (err) => {
          console.error('❌ Failed to update capacity:', err);
          this.error.set(err.error?.message || 'Fehler beim Aktualisieren der Kapazität');
          this.loading.set(false);
        }
      });
    } else {
      this.updateLayoutProperties();
    }
  }

  private updateLayoutProperties(): void {
    const currentSlot = this.slot();
    if (!currentSlot) {
      this.loading.set(false);
      return;
    }

    // Calculate dimensions from size
    const { width, height } = this.getDimensionsFromSize(this.formSize);

    // Update layout (zone, size)
    const request = {
      slotId: currentSlot.slotId,
      gridX: currentSlot.gridX,
      gridY: currentSlot.gridY,
      gridWidth: width,
      gridHeight: height,
      zoneId: this.formZoneId
    };

    this.layoutService.updateLayout(this.storeId(), [request]).subscribe({
      next: () => {
        console.log('✅ Layout updated');
        this.loading.set(false);
        this.close();
      },
      error: (err) => {
        console.error('❌ Failed to update layout:', err);
        this.error.set(err.error?.message || 'Fehler beim Aktualisieren des Layouts');
        this.loading.set(false);
      }
    });
  }

  private getDimensionsFromSize(size: SlotSize): { width: number; height: number } {
    switch (size) {
      case 'S': return { width: 1, height: 1 };
      case 'M': return { width: 2, height: 1 };
      case 'L': return { width: 2, height: 2 };
      case 'XL': return { width: 3, height: 2 };
      default: return { width: 2, height: 1 };
    }
  }

  close(): void {
    console.log('Close slot editor');
    // Parent handles close
  }
}
