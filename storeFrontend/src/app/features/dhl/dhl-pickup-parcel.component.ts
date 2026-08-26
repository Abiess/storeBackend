import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DhlService, DhlFindParcelRequest, DhlPickupParcelRequest, DhlParcel } from '@app/core/services/dhl.service';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Pickup Parcel Component
 * 
 * Flow: Paket abholen
 * 1. Tracking-Code scannen/eingeben
 * 2. Paket suchen
 * 3. Lagerplatz GROSS anzeigen
 * 4. Optional: Bestätigung (nochmal scannen)
 * 5. Als PICKED_UP markieren
 * 6. Erfolg anzeigen
 */
@Component({
  selector: 'app-dhl-pickup-parcel',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeInputComponent, TranslatePipe],
  template: `
    <div class="dhl-pickup-container">
      <div class="dhl-header">
        <button class="back-btn" (click)="goBack()">
          ← {{ 'common.back' | translate }}
        </button>
        <h1>📤 {{ 'dhl.pickupParcel.title' | translate }}</h1>
      </div>

      <!-- Step 1: Scan Tracking Code -->
      <div *ngIf="step() === 'scan'" class="step-scan">
        <div class="form-section">
          <label>{{ 'dhl.pickupParcel.scanTracking' | translate }}</label>
          <app-barcode-input
            [(ngModel)]="trackingCode"
            [placeholder]="'dhl.pickupParcel.trackingPlaceholder' | translate"
            [disabled]="loading()"
            (ngModelChange)="onTrackingCodeChange()">
          </app-barcode-input>
        </div>

        <button
          class="btn-submit"
          (click)="findParcel()"
          [disabled]="!canSearch() || loading()">
          <span *ngIf="!loading()">{{ 'dhl.pickupParcel.search' | translate }}</span>
          <span *ngIf="loading()">{{ 'common.loading' | translate }}...</span>
        </button>

        <div *ngIf="error()" class="error-box">
          {{ error() }}
        </div>
      </div>

      <!-- Step 2: Show Location -->
      <div *ngIf="step() === 'show-location'" class="step-location">
        <div class="location-icon">📍</div>
        <h2>{{ 'dhl.pickupParcel.locationTitle' | translate }}</h2>
        <div class="shelf-location-display">
          {{ foundParcel()?.shelfLocation }}
        </div>
        <p class="tracking-code-small">{{ foundParcel()?.trackingCode }}</p>
        
        <div *ngIf="foundParcel()?.notes" class="notes-box">
          <strong>{{ 'dhl.pickupParcel.notes' | translate }}:</strong>
          {{ foundParcel()?.notes }}
        </div>

        <button class="btn-primary" (click)="confirmPickup()">
          {{ 'dhl.pickupParcel.confirmPickup' | translate }}
        </button>

        <button class="btn-secondary" (click)="cancel()">
          {{ 'common.cancel' | translate }}
        </button>
      </div>

      <!-- Step 3: Success -->
      <div *ngIf="step() === 'success'" class="step-success">
        <div class="success-icon">✅</div>
        <h2>{{ 'dhl.pickupParcel.success' | translate }}</h2>
        <p class="tracking-code-small">{{ pickedUpParcel()?.trackingCode }}</p>
        <button class="btn-primary" (click)="reset()">
          {{ 'dhl.pickupParcel.pickupAnother' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dhl-pickup-container {
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

    .step-scan, .step-location, .step-success {
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

    .step-location {
      text-align: center;
      padding: 2rem 1rem;
    }

    .location-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .step-location h2 {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 1.5rem;
    }

    .shelf-location-display {
      font-size: 3.5rem;
      font-weight: bold;
      color: #667eea;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-radius: 12px;
      margin-bottom: 1rem;
      line-height: 1.2;
    }

    .tracking-code-small {
      font-family: monospace;
      color: #666;
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .notes-box {
      padding: 1rem;
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      text-align: left;
      margin-bottom: 1rem;
    }

    .notes-box strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #856404;
    }

    .success-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
    }

    .step-success {
      text-align: center;
      padding: 3rem 1rem;
    }

    .step-success h2 {
      font-size: 1.5rem;
      color: #28a745;
      margin-bottom: 2rem;
    }

    .error-box {
      padding: 1rem;
      background: #ffe6e6;
      border: 2px solid #dc3545;
      border-radius: 8px;
      color: #dc3545;
      font-weight: 500;
    }

    .btn-submit, .btn-primary {
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

    .btn-submit:hover:not(:disabled), .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-submit:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      padding: 1rem 2rem;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    @media (max-width: 640px) {
      .shelf-location-display {
        font-size: 2.5rem;
        padding: 1.5rem;
      }
    }
  `]
})
export class DhlPickupParcelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);

  storeId!: number;
  trackingCode = '';

  step = signal<'scan' | 'show-location' | 'success'>('scan');
  loading = signal(false);
  error = signal<string | null>(null);
  foundParcel = signal<DhlParcel | null>(null);
  pickedUpParcel = signal<DhlParcel | null>(null);

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

  onTrackingCodeChange(): void {
    this.error.set(null);
  }

  canSearch(): boolean {
    return this.trackingCode.trim().length >= 10;
  }

  findParcel(): void {
    if (!this.canSearch() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const request: DhlFindParcelRequest = {
      trackingCode: this.trackingCode.trim()
    };

    this.dhlService.findParcel(this.storeId, request).subscribe({
      next: (parcel) => {
        console.log('✅ Parcel found:', parcel);
        this.foundParcel.set(parcel);
        this.step.set('show-location');
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Find parcel failed:', err);
        this.loading.set(false);
        
        if (err.status === 404) {
          this.error.set('dhl.errors.notFound');
        } else if (typeof err.error === 'string') {
          this.error.set(err.error);
        } else {
          this.error.set('dhl.errors.findFailed');
        }
      }
    });
  }

  confirmPickup(): void {
    const parcel = this.foundParcel();
    if (!parcel || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const request: DhlPickupParcelRequest = {
      trackingCode: parcel.trackingCode
    };

    this.dhlService.pickupParcel(this.storeId, request).subscribe({
      next: (updatedParcel) => {
        console.log('✅ Parcel picked up:', updatedParcel);
        this.pickedUpParcel.set(updatedParcel);
        this.step.set('success');
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Pickup parcel failed:', err);
        this.loading.set(false);
        
        let errorMsg = 'dhl.errors.pickupFailed';
        if (typeof err.error === 'string') {
          if (err.error.includes('already picked up')) {
            errorMsg = 'dhl.errors.alreadyPickedUp';
          } else {
            errorMsg = err.error;
          }
        }
        this.error.set(errorMsg);
      }
    });
  }

  cancel(): void {
    this.reset();
  }

  reset(): void {
    this.trackingCode = '';
    this.step.set('scan');
    this.error.set(null);
    this.foundParcel.set(null);
    this.pickedUpParcel.set(null);
    this.loading.set(false);
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
