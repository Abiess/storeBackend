import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DhlService, DhlStoreParcelRequestV2, DhlParcel, DhlSlot } from '@app/core/services/dhl.service';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { DhlSlotGridComponent } from './dhl-slot-grid.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Store Parcel Component (Phase 2)
 * 
 * Flow: Paket einlagern mit Mode-Selection
 * 1. Tracking: [Scanner] [Manuell]
 * 2. Lagerplatz: [Automatisch] [Manuell]
 * 3. Speichern
 * 4. Erfolg: Lagerplatz groß anzeigen
 */
@Component({
  selector: 'app-dhl-store-parcel',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeInputComponent, DhlSlotGridComponent, TranslatePipe],
  template: `
    <div class="dhl-store-container">
      <div class="dhl-header">
        <button class="back-btn" (click)="goBack()">
          ← {{ 'common.back' | translate }}
        </button>
        <h1>📦 {{ 'dhl.storeParcel.title' | translate }}</h1>
      </div>

      <!-- Success Screen -->
      <div *ngIf="success()" class="success-screen">
        <div class="success-icon">✅</div>
        <h2>{{ 'dhl.storeParcel.success' | translate }}</h2>
        <div class="shelf-location-display">
          {{ storedParcel()?.shelfLocation }}
        </div>
        <p class="tracking-code-small">{{ storedParcel()?.trackingCode }}</p>
        <button class="btn-primary" (click)="reset()">
          {{ 'dhl.storeParcel.storeAnother' | translate }}
        </button>
      </div>

      <!-- Input Form -->
      <div *ngIf="!success()" class="input-form">
        <!-- Mode 1: Tracking-Erfassung -->
        <div class="mode-section">
          <label class="mode-label">{{ 'dhl.modes.tracking' | translate }}</label>
          <div class="mode-buttons">
            <button
              class="mode-btn"
              [class.active]="trackingMode() === 'scanner'"
              (click)="setTrackingMode('scanner')"
              [disabled]="loading()">
              📷 {{ 'dhl.modes.scanner' | translate }}
            </button>
            <button
              class="mode-btn"
              [class.active]="trackingMode() === 'manual'"
              (click)="setTrackingMode('manual')"
              [disabled]="loading()">
              ⌨️ {{ 'dhl.modes.manual' | translate }}
            </button>
          </div>
        </div>

        <!-- Tracking Input -->
        <div class="form-section">
          <label>{{ 'dhl.storeParcel.scanTracking' | translate }}</label>
          <app-barcode-input
            *ngIf="trackingMode() === 'scanner'"
            [(ngModel)]="trackingCode"
            [placeholder]="'dhl.storeParcel.trackingPlaceholder' | translate"
            [disabled]="loading()">
          </app-barcode-input>
          <input
            *ngIf="trackingMode() === 'manual'"
            type="text"
            [(ngModel)]="trackingCode"
            [placeholder]="'dhl.storeParcel.trackingPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field"
            (input)="trackingCode = trackingCode.toUpperCase()"
          />
          <p class="hint">{{ 'dhl.storeParcel.trackingHint' | translate }}</p>
        </div>

        <!-- Mode 2: Lagerplatz-Zuweisung -->
        <div class="mode-section">
          <label class="mode-label">{{ 'dhl.modes.storage' | translate }}</label>
          <div class="mode-buttons">
            <button
              class="mode-btn"
              [class.active]="slotMode() === 'auto'"
              (click)="setSlotMode('auto')"
              [disabled]="loading()">
              🤖 {{ 'dhl.modes.auto' | translate }}
            </button>
            <button
              class="mode-btn"
              [class.active]="slotMode() === 'manual'"
              (click)="setSlotMode('manual')"
              [disabled]="loading()">
              👆 {{ 'dhl.modes.manualSlot' | translate }}
            </button>
          </div>
        </div>

        <!-- Manual Slot Selection -->
        <div *ngIf="slotMode() === 'manual'" class="slot-selection">
          <p class="info-text">{{ 'dhl.modes.selectSlot' | translate }}</p>
          <div *ngIf="loadingSlots()" class="loading-text">
            {{ 'common.loading' | translate }}...
          </div>
          <app-dhl-slot-grid
            *ngIf="!loadingSlots()"
            [slots]="slots()"
            [selectable]="true"
            (slotSelected)="onSlotSelected($event)">
          </app-dhl-slot-grid>
          <div *ngIf="selectedSlot()" class="selected-slot-badge">
            ✓ {{ 'dhl.modes.selected' | translate }}: <strong>{{ selectedSlot()?.code }}</strong>
          </div>
        </div>

        <!-- Notes (Optional) -->
        <div class="form-section">
          <label>{{ 'dhl.storeParcel.notes' | translate }} ({{ 'common.optional' | translate }})</label>
          <textarea
            [(ngModel)]="notes"
            [placeholder]="'dhl.storeParcel.notesPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field"
            rows="2">
          </textarea>
        </div>

        <!-- Error Message -->
        <div *ngIf="error()" class="error-box">
          {{ error() }}
        </div>

        <!-- Submit Button -->
        <button
          class="btn-submit"
          (click)="storeParcel()"
          [disabled]="!canSubmit() || loading()">
          <span *ngIf="!loading()">{{ 'dhl.storeParcel.submit' | translate }}</span>
          <span *ngIf="loading()">{{ 'common.loading' | translate }}...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dhl-store-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .dhl-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.5rem 0;
      margin-bottom: 1rem;
    }

    .dhl-header h1 {
      font-size: 1.8rem;
      margin: 0;
      color: #333;
    }

    .success-screen {
      text-align: center;
      padding: 3rem 1rem;
    }

    .success-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
    }

    .success-screen h2 {
      font-size: 1.5rem;
      color: #28a745;
      margin-bottom: 2rem;
    }

    .shelf-location-display {
      font-size: 3rem;
      font-weight: bold;
      color: #667eea;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-radius: 12px;
      margin-bottom: 1rem;
    }

    .tracking-code-small {
      font-family: monospace;
      color: #666;
      margin-bottom: 2rem;
    }

    .input-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .mode-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mode-label {
      font-weight: 600;
      color: #333;
      font-size: 1.1rem;
    }

    .mode-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .mode-btn {
      flex: 1;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-btn:hover:not(:disabled) {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .mode-btn.active {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      color: #667eea;
    }

    .mode-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-section label {
      font-weight: 600;
      color: #333;
    }

    .input-field {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }

    .input-field:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .hint {
      font-size: 0.875rem;
      color: #666;
      margin: 0;
    }

    .slot-selection {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .info-text {
      font-size: 0.95rem;
      color: #666;
      margin: 0 0 1rem 0;
    }

    .loading-text {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .selected-slot-badge {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #d4edda;
      border: 2px solid #28a745;
      border-radius: 8px;
      color: #155724;
      font-weight: 600;
      text-align: center;
    }

    .error-box {
      padding: 1rem;
      background: #ffe6e6;
      border: 2px solid #dc3545;
      border-radius: 8px;
      color: #dc3545;
      font-weight: 500;
    }

    .btn-submit {
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-submit:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    @media (max-width: 640px) {
      .shelf-location-display {
        font-size: 2rem;
        padding: 1.5rem;
      }
      
      .mode-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class DhlStoreParcelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);

  storeId!: number;
  trackingCode = '';
  notes = '';

  trackingMode = signal<'scanner' | 'manual'>('scanner');
  slotMode = signal<'auto' | 'manual'>('auto');
  
  slots = signal<DhlSlot[]>([]);
  selectedSlot = signal<DhlSlot | null>(null);
  loadingSlots = signal(false);
  
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  storedParcel = signal<DhlParcel | null>(null);

  ngOnInit(): void {
    this.extractStoreId();
    this.loadSlots();
  }

  private extractStoreId(): void {
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) id = match[1];
    }
    this.storeId = id ? parseInt(id, 10) : 0;
  }

  private loadSlots(): void {
    this.loadingSlots.set(true);
    this.dhlService.getSlots(this.storeId).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingSlots.set(false);
      },
      error: (err) => {
        console.error('Failed to load slots:', err);
        this.loadingSlots.set(false);
      }
    });
  }

  setTrackingMode(mode: 'scanner' | 'manual'): void {
    this.trackingMode.set(mode);
    this.error.set(null);
  }

  setSlotMode(mode: 'auto' | 'manual'): void {
    this.slotMode.set(mode);
    this.selectedSlot.set(null);
    this.error.set(null);
  }

  onSlotSelected(slot: DhlSlot): void {
    this.selectedSlot.set(slot);
    this.error.set(null);
  }

  canSubmit(): boolean {
    const hasTracking = this.trackingCode.trim().length >= 10;
    if (this.slotMode() === 'manual') {
      return hasTracking && this.selectedSlot() !== null;
    }
    return hasTracking;
  }

  storeParcel(): void {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const request: DhlStoreParcelRequestV2 = {
      trackingCode: this.trackingCode.trim(),
      mode: this.slotMode(),
      slotCode: this.slotMode() === 'manual' ? this.selectedSlot()?.code : undefined,
      notes: this.notes.trim() || undefined
    };

    this.dhlService.storeParcelV2(this.storeId, request).subscribe({
      next: (parcel) => {
        console.log('✅ Parcel stored:', parcel);
        this.storedParcel.set(parcel);
        this.success.set(true);
        this.loading.set(false);
        
        // Dispatch highlight event for warehouse plan
        if (parcel.shelfLocation) {
          window.dispatchEvent(new CustomEvent('dhl-highlight-slot', {
            detail: { slotCode: parcel.shelfLocation }
          }));
        }
        
        // Refresh slots for grid
        this.loadSlots();
      },
      error: (err) => {
        console.error('❌ Store parcel failed:', err);
        this.loading.set(false);
        
        let errorMsg = 'dhl.errors.storeFailed';
        if (err.status === 404 && err.error?.includes('No free slot')) {
          errorMsg = 'dhl.errors.noFreeSlot';
        } else if (err.error?.includes('already exists')) {
          errorMsg = 'dhl.errors.duplicate';
        } else if (err.error?.includes('occupied')) {
          errorMsg = 'dhl.errors.slotOccupied';
        } else if (typeof err.error === 'string') {
          errorMsg = err.error;
        }
        this.error.set(errorMsg);
      }
    });
  }

  reset(): void {
    this.trackingCode = '';
    this.notes = '';
    this.selectedSlot.set(null);
    this.error.set(null);
    this.success.set(false);
    this.storedParcel.set(null);
    this.trackingMode.set('scanner');
    this.slotMode.set('auto');
    this.loadSlots();
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
