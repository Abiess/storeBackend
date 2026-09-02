import { Component, OnInit, inject, signal, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DhlService, DhlFindParcelRequest, DhlPickupParcelRequest, DhlParcel, DhlTrackingValidationResponse } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Fachlicher Validierungszustand des Tracking-Codes gegen die DHL Tracking API.
 * Identisches Prinzip wie bei dhl-store-parcel.component.ts (TEIL C):
 *
 * IDLE             → noch nicht (erfolgreich) durch DHL bestätigt
 * VALIDATING       → DHL-Prüfung läuft gerade
 * VALID            → DHL hat die Sendung bestätigt (lokale Suche erlaubt)
 * INVALID          → DHL kennt/akzeptiert den Code nicht (NOT_FOUND)
 * TECHNICAL_ERROR  → Prüfung konnte technisch nicht durchgeführt werden
 */
export type TrackingValidationState = 'IDLE' | 'VALIDATING' | 'VALID' | 'INVALID' | 'TECHNICAL_ERROR';

/**
 * Feinere Unterscheidung innerhalb von validationState() === 'INVALID':
 * - NOT_FOUND         → DHL hat den Code klar abgelehnt (dhlResponseCode=100)
 * - VALIDATION_ERROR  → DHL hat mit einem unbekannten Response-Code
 *                       geantwortet (z.B. code=40); NICHT geraten, ob
 *                       fachlich ungültig - daher neutralere UI-Formulierung.
 */
export type TrackingInvalidReason = 'NOT_FOUND' | 'VALIDATION_ERROR';

/**
 * DHL Pickup Parcel Component
 * 
 * Flow: Paket abholen (TEIL C: DHL-Validierung VOR jeder lokalen Suche)
 * 1. Tracking-Code scannen/eingeben
 * 2. DHL API Validierung (fail-closed - Suche nur bei VALID erlaubt)
 * 3. Paket im Lager suchen (mit kanonischem pieceCode)
 * 4. Lagerplatz GROSS anzeigen
 * 5. Bestätigung → als PICKED_UP markieren (Backend validiert erneut)
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
        <!-- Tracking Mode Selection -->
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

        <div class="form-section">
          <label>{{ 'dhl.pickupParcel.scanTracking' | translate }}</label>
          <app-barcode-input
            #barcodeInput
            *ngIf="trackingMode() === 'scanner'"
            [ngModel]="trackingCode"
            (ngModelChange)="onTrackingCodeChange($event)"
            [placeholder]="'dhl.pickupParcel.trackingPlaceholder' | translate"
            [disabled]="loading()">
          </app-barcode-input>
          <input
            #manualInput
            *ngIf="trackingMode() === 'manual'"
            type="text"
            [ngModel]="trackingCode"
            (ngModelChange)="onTrackingCodeChange($event, true)"
            [placeholder]="'dhl.pickupParcel.trackingPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field"
          />

          <!-- TEIL C: DHL Validierungsstatus - dauerhaft sichtbar am Feld -->
          <div class="tracking-validation-status" [ngSwitch]="validationState()">
            <div *ngSwitchCase="'VALIDATING'" class="status-box status-validating">
              {{ 'dhl.validation.validatingTitle' | translate }}
            </div>
            <div *ngSwitchCase="'VALID'" class="status-box status-valid">
              <div class="status-title">{{ 'dhl.validation.validShipment' | translate }}</div>
              <div class="status-details" *ngIf="validatedResult() as res">
                <span *ngIf="res.productName">{{ res.productName }}</span>
                <span *ngIf="res.weightKg"> · {{ res.weightKg | number:'1.2-2' }} kg</span>
              </div>
            </div>
            <div *ngSwitchCase="'INVALID'" class="status-box status-invalid">
              <ng-container *ngIf="invalidReason() === 'VALIDATION_ERROR'; else notFoundText">
                <div class="status-title">{{ 'dhl.validation.validationErrorTitle' | translate }}</div>
                <div class="status-details">{{ 'dhl.validation.scanAnotherBarcode' | translate }}</div>
              </ng-container>
              <ng-template #notFoundText>
                <div class="status-title">{{ 'dhl.validation.invalidTitle' | translate }}</div>
                <div class="status-details">{{ 'dhl.validation.invalidHint' | translate }}</div>
              </ng-template>
            </div>
            <div *ngSwitchCase="'TECHNICAL_ERROR'" class="status-box status-technical-error">
              <div class="status-title">{{ 'dhl.validation.technicalErrorTitle' | translate }}</div>
              <div class="status-details">{{ 'dhl.validation.technicalErrorHint' | translate }}</div>
            </div>
          </div>
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

    .tracking-validation-status {
      margin-top: 0.5rem;
    }

    .status-box {
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-weight: 500;
      animation: fadeIn 0.3s;
    }

    .status-title {
      font-weight: 600;
    }

    .status-details {
      font-size: 0.85rem;
      margin-top: 0.25rem;
      opacity: 0.85;
    }

    .status-validating {
      background: #e6f3ff;
      border: 2px solid #667eea;
      color: #333;
    }

    .status-valid {
      background: #d4edda;
      border: 2px solid #28a745;
      color: #155724;
    }

    .status-invalid {
      background: #f8d7da;
      border: 2px solid #dc3545;
      color: #721c24;
    }

    .status-technical-error {
      background: #fff3cd;
      border: 2px solid #ffc107;
      color: #856404;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
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

      .mode-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class DhlPickupParcelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dhlService = inject(DhlService);
  private dhlErrorService = inject(DhlErrorService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('barcodeInput') barcodeInputRef?: BarcodeInputComponent;
  @ViewChild('manualInput') manualInputRef?: ElementRef<HTMLInputElement>;

  storeId!: number;
  trackingCode = '';
  trackingMode = signal<'scanner' | 'manual'>('scanner');

  step = signal<'scan' | 'show-location' | 'success'>('scan');
  loading = signal(false);
  error = signal<string | null>(null);
  foundParcel = signal<DhlParcel | null>(null);
  pickedUpParcel = signal<DhlParcel | null>(null);

  // TEIL C: Fachlicher DHL-Validierungszustand (IDLE/VALIDATING/VALID/INVALID/TECHNICAL_ERROR)
  validationState = signal<TrackingValidationState>('IDLE');
  // Feinere Unterscheidung bei validationState() === 'INVALID' (NOT_FOUND vs. VALIDATION_ERROR)
  invalidReason = signal<TrackingInvalidReason | null>(null);
  // Letztes erfolgreiches DHL-Validierungsergebnis (für kompakte Anzeige: Produkt/Gewicht)
  validatedResult = signal<DhlTrackingValidationResponse | null>(null);

  // Debounce-Pipeline: verhindert einen DHL-Call pro Tastenanschlag,
  // triggert aber automatische Validierung sobald der Code sich beruhigt hat.
  private trackingCodeChange$ = new Subject<string>();

  ngOnInit(): void {
    this.extractStoreId();
    this.trackingCodeChange$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((code) => this.runValidation(code));
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

  setTrackingMode(mode: 'scanner' | 'manual'): void {
    this.trackingMode.set(mode);
    this.error.set(null);
  }

  /**
   * TEIL C: Fail-closed - die lokale Suche ist AUSSCHLIESSLICH aktiv wenn
   * DHL die Sendung bestätigt hat (validationState() === 'VALID'). Eine
   * Codelänge >= 10 allein reicht NICHT mehr aus.
   */
  canSearch(): boolean {
    return this.validationState() === 'VALID';
  }

  /**
   * Wird bei jeder Änderung des Tracking-Codes aufgerufen (Scanner-Input
   * UND manuelle Eingabe verwenden denselben Handler - kein Bypass möglich).
   *
   * WICHTIG: Ein vorheriger VALID-Zustand wird SOFORT verworfen, sobald sich
   * der Code ändert. Der alte VALID-Status darf niemals für einen neuen Code
   * gelten (Suche fällt sofort zurück auf disabled).
   */
  onTrackingCodeChange(value: string, isManualInput = false): void {
    this.trackingCode = isManualInput ? value.toUpperCase() : value;
    this.error.set(null);

    if (this.validationState() !== 'IDLE') {
      this.validationState.set('IDLE');
      this.validatedResult.set(null);
      this.invalidReason.set(null);
    }

    const trimmed = this.trackingCode.trim();
    if (trimmed.length >= 10) {
      this.trackingCodeChange$.next(trimmed);
    }
  }

  /**
   * TEIL C: Automatische DHL-Validierung (debounced), unabhängig von der
   * "Suchen"-Aktion. Race-Guard: Ergebnisse eines veralteten Requests (Code
   * hat sich inzwischen erneut geändert) werden verworfen.
   */
  private runValidation(code: string): void {
    if (this.trackingCode.trim() !== code) {
      return; // Code hat sich bereits weiterverändert - veralteter Trigger
    }

    this.validationState.set('VALIDATING');
    this.validatedResult.set(null);
    this.invalidReason.set(null);

    this.dhlService.validateTrackingCode(this.storeId, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (this.trackingCode.trim() !== code) {
            return; // veraltete Antwort - Code hat sich zwischenzeitlich geändert
          }

          if (result.status === 'VALID') {
            // ✅ DHL bestätigt Sendung - kanonischen pieceCode übernehmen
            this.validationState.set('VALID');
            this.validatedResult.set(result);
            this.trackingCode = result.pieceCode || result.trackingCode;
          } else {
            // ❌ NOT_FOUND: fachlicher Fehler, KEIN technisches Problem.
            // Barcode bleibt sichtbar (Mitarbeiter soll erkennen, was abgelehnt wurde),
            // aber Input wird für den nächsten Scan vorbereitet (Auto-Replace).
            this.validationState.set('INVALID');
            this.invalidReason.set('NOT_FOUND');
            this.validatedResult.set(null);
            this.prepareForNextScan();
          }
        },
        error: (err) => {
          if (this.trackingCode.trim() !== code) {
            return;
          }
          // Fachlicher (INVALID) vs. technischer (TECHNICAL_ERROR) Fehler
          // einheitlich klassifizieren (siehe DhlErrorService) - NICHT mehr
          // jeden HTTP-Fehler pauschal als "DHL nicht erreichbar" behandeln.
          const state = this.dhlErrorService.classifyTrackingValidationError(err);
          this.validationState.set(state);
          this.validatedResult.set(null);
          if (state === 'INVALID') {
            this.invalidReason.set('VALIDATION_ERROR');
            // Fachlicher Fehler: Inline-Status-Box zeigt bereits die passende
            // Meldung - kein zusätzlicher Toast nötig (Barcode-Scan-UX).
            this.prepareForNextScan();
          } else {
            this.dhlErrorService.handleError(err);
          }
        }
      });
  }

  /**
   * SCANNER-UX: Nach INVALID bleibt der abgelehnte Code sichtbar, aber wird
   * selektiert - der NÄCHSTE Scan (HID-Scanner "tippt" die Zeichen in das
   * fokussierte Feld) ersetzt die Selektion automatisch. Kein manuelles
   * Löschen/Markieren durch den Mitarbeiter nötig. Kamera-Scanner-Verhalten
   * bleibt unverändert (schreibt ohnehin direkt den neuen Wert).
   */
  private prepareForNextScan(): void {
    if (this.trackingMode() === 'scanner') {
      setTimeout(() => this.barcodeInputRef?.selectAll());
    } else {
      setTimeout(() => this.manualInputRef?.nativeElement.select());
    }
  }

  /**
   * Sucht das Paket lokal - wird NUR über die (per canSearch() fail-closed
   * abgesicherte) Suchen-Aktion ausgelöst, NACHDEM validationState()
   * bereits VALID ist. Verwendet den kanonischen (von DHL bestätigten)
   * trackingCode/pieceCode für die lokale Suche.
   */
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
        
        // Dispatch highlight event for warehouse plan
        if (parcel.shelfLocation) {
          window.dispatchEvent(new CustomEvent('dhl-highlight-slot', {
            detail: { slotCode: parcel.shelfLocation }
          }));
        }
      },
      error: (err) => {
        console.error('❌ Find parcel failed:', err);
        this.loading.set(false);
        this.dhlErrorService.handleError(err);
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
        this.dhlErrorService.handleError(err);
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
    this.trackingMode.set('scanner');

    // TEIL C: Validierungszustand zurücksetzen
    this.validationState.set('IDLE');
    this.validatedResult.set(null);
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
