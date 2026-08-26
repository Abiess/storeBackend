import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DhlService, DhlStoreParcelRequest, DhlParcel } from '@app/core/services/dhl.service';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Store Parcel Component
 * 
 * Flow: Paket einlagern
 * 1. Tracking-Code scannen/eingeben
 * 2. Lagerplatz eingeben
 * 3. Optional: Notizen
 * 4. Speichern
 * 5. Erfolg: Lagerplatz groß anzeigen
 */
@Component({
  selector: 'app-dhl-store-parcel',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeInputComponent, TranslatePipe],
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
        <!-- Step 1: Tracking Code -->
        <div class="form-section">
          <label>{{ 'dhl.storeParcel.scanTracking' | translate }}</label>
          <app-barcode-input
            [(ngModel)]="trackingCode"
            [placeholder]="'dhl.storeParcel.trackingPlaceholder' | translate"
            [disabled]="loading()">
          </app-barcode-input>
          <p class="hint">{{ 'dhl.storeParcel.trackingHint' | translate }}</p>
        </div>

        <!-- Step 2: Shelf Location -->
        <div class="form-section">
          <label>{{ 'dhl.storeParcel.shelfLocation' | translate }}</label>
          <input
            type="text"
            [(ngModel)]="shelfLocation"
            [placeholder]="'dhl.storeParcel.shelfPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field input-field-large"
          />
          <p class="hint">{{ 'dhl.storeParcel.shelfHint' | translate }}</p>
        </div>

        <!-- Step 3: Notes (Optional) -->
        <div class="form-section">
          <label>{{ 'dhl.storeParcel.notes' | translate }} ({{ 'common.optional' | translate }})</label>
          <textarea
            [(ngModel)]="notes"
            [placeholder]="'dhl.storeParcel.notesPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field"
            rows="3">
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
      max-width: 600px;
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

    .input-field-large {
      font-size: 1.5rem;
      padding: 1rem;
      font-weight: 600;
      text-align: center;
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
    }
  `]
})
export class DhlStoreParcelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);

  storeId!: number;
  trackingCode = '';
  shelfLocation = '';
  notes = '';

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  storedParcel = signal<DhlParcel | null>(null);

  ngOnInit(): void {
    this.extractStoreId();
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

  canSubmit(): boolean {
    return this.trackingCode.trim().length >= 10 && this.shelfLocation.trim().length > 0;
  }

  storeParcel(): void {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const request: DhlStoreParcelRequest = {
      trackingCode: this.trackingCode.trim(),
      shelfLocation: this.shelfLocation.trim(),
      notes: this.notes.trim() || undefined
    };

    this.dhlService.storeParcel(this.storeId, request).subscribe({
      next: (parcel) => {
        console.log('✅ Parcel stored:', parcel);
        this.storedParcel.set(parcel);
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Store parcel failed:', err);
        this.loading.set(false);
        
        let errorMsg = 'dhl.errors.storeFailed';
        if (typeof err.error === 'string') {
          if (err.error.includes('already exists')) {
            errorMsg = 'dhl.errors.duplicate';
          } else {
            errorMsg = err.error;
          }
        }
        this.error.set(errorMsg);
      }
    });
  }

  reset(): void {
    this.trackingCode = '';
    this.shelfLocation = '';
    this.notes = '';
    this.error.set(null);
    this.success.set(false);
    this.storedParcel.set(null);
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
