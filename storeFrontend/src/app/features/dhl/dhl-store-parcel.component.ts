import { Component, OnInit, inject, signal, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DhlService, DhlStoreParcelRequestV2, DhlParcel, DhlSlot, DhlTrackingValidationResponse } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { DhlScanAudioService } from '@app/core/services/dhl-scan-audio.service';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { DhlSlotGridComponent } from './dhl-slot-grid.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Fachlicher Validierungszustand des Tracking-Codes gegen die DHL Tracking API.
 *
 * IDLE             → noch nicht (erfolgreich) durch DHL bestätigt
 * VALIDATING       → DHL-Prüfung läuft gerade
 * VALID            → DHL hat die Sendung bestätigt (Einlagerung erlaubt)
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
 * DHL Store Parcel Component (Phase 2 + SCHRITT 3)
 * 
 * Flow: Paket einlagern mit Mode-Selection + DHL Tracking Validation
 * 1. Tracking: [Scanner] [Manuell]
 * 2. DHL API Validation (SCHRITT 3)
 * 3. Lagerplatz: [Automatisch] [Manuell]
 * 4. Speichern
 * 5. Erfolg: Lagerplatz groß anzeigen
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
        <button class="sound-toggle-btn" type="button" (click)="toggleScanSounds()" [attr.aria-pressed]="scanSoundsEnabled()">
          {{ 'dhl.settings.scanSounds' | translate }}: {{ (scanSoundsEnabled() ? 'dhl.settings.scanSoundsOn' : 'dhl.settings.scanSoundsOff') | translate }}
        </button>
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
            #barcodeInput
            *ngIf="trackingMode() === 'scanner'"
            [ngModel]="trackingCode"
            (ngModelChange)="onTrackingCodeChange($event)"
            [placeholder]="'dhl.storeParcel.trackingPlaceholder' | translate"
            [disabled]="loading()">
          </app-barcode-input>
          <input
            #manualInput
            *ngIf="trackingMode() === 'manual'"
            type="text"
            [ngModel]="trackingCode"
            (ngModelChange)="onTrackingCodeChange($event, true)"
            (keydown)="onManualKeyDown($event)"
            [placeholder]="'dhl.storeParcel.trackingPlaceholder' | translate"
            [disabled]="loading()"
            class="input-field"
          />
          <p class="hint">{{ 'dhl.storeParcel.trackingHint' | translate }}</p>

          <!-- SCHRITT 3 + TEIL 1: DHL Validierungsstatus - dauerhaft sichtbar am Feld -->
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

        <!-- Error Message (technische Fehler bei der Einlagerung selbst) -->
        <div *ngIf="error()" class="error-box">
          {{ error() }}
        </div>

        <!-- Submit Button - TEIL 1: FAIL-CLOSED, nur bei validationState() === 'VALID' enabled -->
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

    .sound-toggle-btn {
      margin-top: 0.5rem;
      background: #f3f3f7;
      border: 1px solid #ddd;
      border-radius: 999px;
      padding: 0.35rem 0.9rem;
      font-size: 0.85rem;
      color: #555;
      cursor: pointer;
    }

    .sound-toggle-btn[aria-pressed="true"] {
      background: #eef1fd;
      border-color: #667eea;
      color: #4a5bc4;
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
  private dhlErrorService = inject(DhlErrorService);
  private dhlScanAudioService = inject(DhlScanAudioService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('barcodeInput') barcodeInputRef?: BarcodeInputComponent;
  @ViewChild('manualInput') manualInputRef?: ElementRef<HTMLInputElement>;

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

  // Nutzer-Einstellung "Scan-Töne" (localStorage, siehe DhlScanAudioService)
  scanSoundsEnabled = signal<boolean>(true);

  // TEIL 1: Fachlicher DHL-Validierungszustand (IDLE/VALIDATING/VALID/INVALID/TECHNICAL_ERROR)
  validationState = signal<TrackingValidationState>('IDLE');
  // Feinere Unterscheidung bei validationState() === 'INVALID' (NOT_FOUND vs. VALIDATION_ERROR)
  invalidReason = signal<TrackingInvalidReason | null>(null);
  // Letztes erfolgreiches DHL-Validierungsergebnis (für kompakte Anzeige: Produkt/Gewicht)
  validatedResult = signal<DhlTrackingValidationResponse | null>(null);

  // Clear-Guard für manuellen Eingabemodus (Scanner-Modus: siehe BarcodeInputComponent)
  private awaitingNextManualScan = false;

  // Debounce-Pipeline: verhindert einen DHL-Call pro Tastenanschlag,
  // triggert aber automatische Validierung sobald der Code sich beruhigt hat.
  private trackingCodeChange$ = new Subject<string>();

  ngOnInit(): void {
    this.extractStoreId();
    this.loadSlots();
    this.scanSoundsEnabled.set(this.dhlScanAudioService.isEnabled());
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
        this.dhlErrorService.handleError(err);
      }
    });
  }

  setTrackingMode(mode: 'scanner' | 'manual'): void {
    this.trackingMode.set(mode);
    this.error.set(null);
  }

  toggleScanSounds(): void {
    const next = !this.scanSoundsEnabled();
    this.scanSoundsEnabled.set(next);
    this.dhlScanAudioService.setEnabled(next);
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

  /**
   * TEIL 1: Fail-closed - "Paket einlagern" ist AUSSCHLIESSLICH aktiv wenn
   * DHL die Sendung bestätigt hat (validationState() === 'VALID') UND alle
   * bestehenden Slot-/Formbedingungen erfüllt sind. Eine Codelänge >= 10
   * allein reicht NICHT mehr aus.
   */
  canSubmit(): boolean {
    if (this.validationState() !== 'VALID') {
      return false;
    }
    if (this.slotMode() === 'manual') {
      return this.selectedSlot() !== null;
    }
    return true;
  }

  /**
   * Wird bei jeder Änderung des Tracking-Codes aufgerufen (Scanner-Input
   * UND manuelle Eingabe verwenden denselben Handler - kein Bypass möglich).
   *
   * WICHTIG: Ein vorheriger VALID-Zustand wird SOFORT verworfen, sobald sich
   * der Code ändert. Der alte VALID-Status darf niemals für einen neuen Code
   * gelten (Button fällt sofort zurück auf disabled).
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
   * TEIL 1: Automatische DHL-Validierung (debounced), unabhängig vom
   * "Paket einlagern"-Button. Race-Guard: Ergebnisse eines veralteten
   * Requests (Code hat sich inzwischen erneut geändert) werden verworfen.
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
            // Audio-Feedback ERST NACH der DHL-Antwort (nicht beim Scan selbst).
            this.dhlScanAudioService.playForState('VALID');
            // Auch nach VALID: nächster Scan (z.B. anderes Paket) soll ersetzen,
            // nicht an den kanonischen Code angehängt werden.
            this.prepareForNextScan();
          } else {
            // ❌ NOT_FOUND: fachlicher Fehler, KEIN technisches Problem.
            // Barcode bleibt sichtbar (Mitarbeiter soll erkennen, was abgelehnt wurde),
            // aber Input wird für den nächsten Scan vorbereitet (Auto-Replace).
            this.validationState.set('INVALID');
            this.invalidReason.set('NOT_FOUND');
            this.validatedResult.set(null);
            this.dhlScanAudioService.playForState('INVALID');
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
            this.dhlScanAudioService.playForState('INVALID');
            // Fachlicher Fehler: Inline-Status-Box zeigt bereits die passende
            // Meldung - kein zusätzlicher Toast nötig (Barcode-Scan-UX).
            this.prepareForNextScan();
          } else {
            this.dhlScanAudioService.playForState('TECHNICAL_ERROR');
            this.dhlErrorService.handleError(err);
            // Auch bei TECHNICAL_ERROR: nächster Scan soll den alten Code
            // ersetzen, nicht anhängen.
            this.prepareForNextScan();
          }
        }
      });
  }

  /**
   * SCANNER-UX: Nach INVALID/TECHNICAL_ERROR bleibt der abgelehnte Code
   * sichtbar, das Feld wird aber für den NÄCHSTEN Scan vorbereitet:
   * - Scanner-Modus: BarcodeInputComponent.prepareForNextScan() - visuelle
   *   Selektion PLUS deterministischer Clear-Guard (erstes Zeichen des
   *   nächsten Scans leert das Feld zuerst, statt anzuhängen).
   * - Manueller Modus: dasselbe Prinzip direkt hier (kein BarcodeInputComponent
   *   involviert), siehe onManualKeyDown().
   * Kamera-Scanner-Verhalten bleibt unverändert (schreibt ohnehin direkt den
   * neuen Wert atomar, kein Zeichen-für-Zeichen keydown).
   */
  private prepareForNextScan(): void {
    if (this.trackingMode() === 'scanner') {
      this.barcodeInputRef?.prepareForNextScan();
    } else {
      this.awaitingNextManualScan = true;
      setTimeout(() => this.manualInputRef?.nativeElement.select());
    }
  }

  /**
   * Manuelles Pendant zu BarcodeInputComponent.onKeyDown(): ohne vorheriges
   * prepareForNextScan() ein No-Op. Leert trackingCode UND das native
   * DOM-Value synchron beim ERSTEN Zeichen der nächsten Eingabe, damit der
   * neue Code den alten (abgelehnten) ersetzt statt daran angehängt zu
   * werden - unabhängig von native Selection-Replace-Timing.
   */
  onManualKeyDown(event: KeyboardEvent): void {
    if (!this.awaitingNextManualScan) {
      return;
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    this.awaitingNextManualScan = false;
    this.trackingCode = '';
    if (this.manualInputRef) {
      this.manualInputRef.nativeElement.value = '';
    }
  }

  storeParcel(): void {
    if (!this.canSubmit() || this.loading()) return;
    this.proceedWithStorage();
  }

  /**
   * Führt die eigentliche Einlagerung durch.
   *
   * Wird NUR über den (per canSubmit() fail-closed abgesicherten) Button
   * ausgelöst, NACHDEM validationState() bereits VALID ist - keine erneute
   * Validierung hier nötig (das autoritative Backend validiert beim
   * Speichern ohnehin nochmals, siehe DhlController.storeParcel()).
   */
  private proceedWithStorage(): void {
    this.loading.set(true);
    this.error.set(null);

    const request: DhlStoreParcelRequestV2 = {
      trackingCode: this.trackingCode.trim(),
      mode: this.slotMode(),
      slotCode: this.slotMode() === 'manual' ? this.selectedSlot()?.code : undefined,
      notes: this.notes.trim() || undefined
    };

    this.dhlService.storeParcelV2(this.storeId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (parcel) => {
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
          this.loading.set(false);
          this.dhlErrorService.handleError(err);
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

    // TEIL 1: Validierungszustand zurücksetzen
    this.validationState.set('IDLE');
    this.invalidReason.set(null);
    this.validatedResult.set(null);
    this.awaitingNextManualScan = false;

    this.loadSlots();
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'dhl']);
  }
}
