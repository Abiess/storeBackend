import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { DhlPickupParcelComponent } from './dhl-pickup-parcel.component';
import { DhlService, DhlTrackingValidationResponse, DhlParcel } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { DhlScanAudioService } from '@app/core/services/dhl-scan-audio.service';
import { TranslationService } from '@app/core/services/translation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * TEIL C - Abholung: dieselbe DHL-Validierung wie beim Einlagern.
 *
 * Ein gescannter/eingegebener Code darf NICHT nur auf Format/Länge geprüft
 * und dann lokal gesucht werden. Erst nach validationState() === 'VALID'
 * darf findParcel() aufgerufen werden (fail-closed).
 */
describe('DhlPickupParcelComponent - TEIL C TrackingValidationState', () => {
  let component: DhlPickupParcelComponent;
  let fixture: ComponentFixture<DhlPickupParcelComponent>;
  let mockDhlService: jasmine.SpyObj<DhlService>;
  let mockDhlErrorService: jasmine.SpyObj<DhlErrorService>;
  let mockDhlScanAudioService: jasmine.SpyObj<DhlScanAudioService>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const VALID_CODE = '00340434664988418341';

  function mockValidResponse(overrides: Partial<DhlTrackingValidationResponse> = {}): DhlTrackingValidationResponse {
    return {
      status: 'VALID',
      trackingCode: VALID_CODE,
      pieceCode: VALID_CODE,
      dhlResponseCode: '0',
      valid: true,
      ...overrides
    };
  }

  function mockNotFoundResponse(code: string): DhlTrackingValidationResponse {
    return {
      status: 'NOT_FOUND',
      trackingCode: code,
      dhlResponseCode: '100',
      valid: false
    };
  }

  function mockFoundParcel(): DhlParcel {
    return {
      id: 1,
      storeId: 123,
      trackingCode: VALID_CODE,
      shelfLocation: 'A7',
      receivedAt: '2026-09-01T15:00:00Z',
      status: 'STORED',
      createdAt: '2026-09-01T15:00:00Z',
      updatedAt: '2026-09-01T15:00:00Z'
    };
  }

  beforeEach(async () => {
    mockDhlService = jasmine.createSpyObj('DhlService', [
      'validateTrackingCode',
      'findParcel',
      'pickupParcel'
    ]);
    mockDhlErrorService = jasmine.createSpyObj('DhlErrorService', ['handleError', 'classifyTrackingValidationError']);
    mockDhlScanAudioService = jasmine.createSpyObj('DhlScanAudioService', ['playForState', 'isEnabled', 'setEnabled']);
    mockDhlScanAudioService.isEnabled.and.returnValue(true);
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['translate']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/stores/123/dhl/pickup' });

    mockTranslationService.translate.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [DhlPickupParcelComponent],
      providers: [
        { provide: DhlService, useValue: mockDhlService },
        { provide: DhlErrorService, useValue: mockDhlErrorService },
        { provide: DhlScanAudioService, useValue: mockDhlScanAudioService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '123' } },
            parent: null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DhlPickupParcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Löst die (debounced) automatische Validierung für einen Code aus. */
  function triggerValidation(code: string, manual = false): void {
    component.onTrackingCodeChange(code, manual);
    tick(400); // debounceTime(400)
  }

  describe('canSearch() - fail-closed pro Zustand', () => {
    it('IDLE → disabled', () => {
      expect(component.validationState()).toBe('IDLE');
      expect(component.canSearch()).toBe(false);
    });

    it('VALIDATING Zwischenzustand ist disabled (asynchrone DHL-Antwort)', fakeAsync(() => {
      let resolveFn!: (value: DhlTrackingValidationResponse) => void;
      const pending = new Promise<DhlTrackingValidationResponse>(resolve => { resolveFn = resolve; });
      mockDhlService.validateTrackingCode.and.returnValue(
        new Observable<DhlTrackingValidationResponse>((subscriber) => {
          pending.then(value => { subscriber.next(value); subscriber.complete(); });
        })
      );

      component.onTrackingCodeChange(VALID_CODE);
      tick(400);

      expect(component.validationState()).toBe('VALIDATING');
      expect(component.canSearch()).toBe(false);

      resolveFn(mockValidResponse());
      tick();
      expect(component.validationState()).toBe('VALID');
      expect(component.canSearch()).toBe(true);
    }));

    it('VALID → enabled (lokale Suche erlaubt)', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(component.validationState()).toBe('VALID');
      expect(component.canSearch()).toBe(true);
    }));

    it('INVALID (NOT_FOUND) → disabled', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD');

      expect(component.validationState()).toBe('INVALID');
      expect(component.canSearch()).toBe(false);
    }));

    it('TECHNICAL_ERROR → disabled', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { errorCode: 'DHL_CONNECTIVITY_ERROR', message: 'Timeout' },
        status: 504,
        statusText: 'Gateway Timeout'
      });
      mockDhlErrorService.classifyTrackingValidationError.and.returnValue('TECHNICAL_ERROR');
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation(VALID_CODE);

      expect(component.validationState()).toBe('TECHNICAL_ERROR');
      expect(component.canSearch()).toBe(false);
      expect(mockDhlErrorService.handleError).toHaveBeenCalledWith(mockError);
    }));

    it('DHL_VALIDATION_ERROR (unbekannter DHL Response Code, z.B. code=40) → INVALID, NICHT "DHL nicht erreichbar"', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { errorCode: 'DHL_VALIDATION_ERROR', message: 'unrecognized response code' },
        status: 422,
        statusText: 'Unprocessable Entity'
      });
      mockDhlErrorService.classifyTrackingValidationError.and.returnValue('INVALID');
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation('14411111114');

      expect(component.validationState()).toBe('INVALID');
      expect(component.canSearch()).toBe(false);
      // Fachlicher Fehler: kein zusätzlicher Toast, Inline-Box reicht
      expect(mockDhlErrorService.handleError).not.toHaveBeenCalled();
    }));

    it('Codelänge >= 10 allein aktiviert die Suche NICHT (kein Bypass ohne DHL-Bestätigung)', () => {
      component.trackingCode = 'VDBDBJDJDUDPADDING'; // >= 10 Zeichen, aber niemals validiert
      expect(component.validationState()).toBe('IDLE');
      expect(component.canSearch()).toBe(false);
    });
  });

  describe('Audio-Feedback: Ton ERST NACH der DHL-Antwort, nicht beim Scan selbst', () => {
    it('VALID → Success-Ton genau einmal', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('VALID');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));

    it('INVALID (NOT_FOUND) → Error-Ton genau einmal', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD');

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('INVALID');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));

    it('DHL_VALIDATION_ERROR (unbekannter Response Code) → Error-Ton genau einmal (dieselbe Kategorie wie NOT_FOUND)', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { errorCode: 'DHL_VALIDATION_ERROR', message: 'unrecognized response code' },
        status: 422,
        statusText: 'Unprocessable Entity'
      });
      mockDhlErrorService.classifyTrackingValidationError.and.returnValue('INVALID');
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation('14411111114');

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('INVALID');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));

    it('TECHNICAL_ERROR → Warn-Ton genau einmal', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { errorCode: 'DHL_CONNECTIVITY_ERROR', message: 'Timeout' },
        status: 504,
        statusText: 'Gateway Timeout'
      });
      mockDhlErrorService.classifyTrackingValidationError.and.returnValue('TECHNICAL_ERROR');
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation(VALID_CODE);

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('TECHNICAL_ERROR');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));

    it('Ton kommt NICHT sofort beim Scan, sondern erst nach der (debounced) DHL-Antwort', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      component.onTrackingCodeChange(VALID_CODE);

      // Vor Ablauf des Debounce (kein tick()) darf noch KEIN Ton gespielt worden sein.
      expect(mockDhlScanAudioService.playForState).not.toHaveBeenCalled();

      tick(400);
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('VALID');
    }));

    it('kein mehrfaches Beepen durch doppelten Trigger desselben Codes (distinctUntilChanged)', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      // Simuliert einen HID-Scanner, der denselben fertigen Code zweimal
      // "meldet" (z.B. durch ein zusätzliches Change-Event), bevor sich
      // der Code tatsächlich ändert.
      component.onTrackingCodeChange(VALID_CODE);
      component.onTrackingCodeChange(VALID_CODE);
      tick(400);

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));

    it('neuer Scan ersetzt INVALID-Zustand → alter Ton-Zustand irrelevant, neue DHL-Antwort spielt eigenen Ton', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('INVALID');

      mockDhlScanAudioService.playForState.calls.reset();
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledWith('VALID');
      expect(mockDhlScanAudioService.playForState).toHaveBeenCalledTimes(1);
    }));
  });

  describe('VALID → Tracking-Code geändert → sofort IDLE + disabled', () => {
    it('verwirft VALID sofort, sobald sich der Code ändert', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);
      expect(component.validationState()).toBe('VALID');
      expect(component.canSearch()).toBe(true);

      // Benutzer ändert eine Ziffer
      component.onTrackingCodeChange('00340434664988418342');

      expect(component.validationState()).toBe('IDLE');
      expect(component.validatedResult()).toBeNull();
      expect(component.canSearch()).toBe(false);
    }));
  });

  describe('Scanner kann INVALID-Code durch nächsten Scan ersetzen', () => {
    it('selektiert den abgelehnten Code im Scanner-Feld für Auto-Replace', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      const prepareForNextScanSpy = jasmine.createSpy('prepareForNextScan');
      (component as any).barcodeInputRef = { prepareForNextScan: prepareForNextScanSpy, selectAll: jasmine.createSpy('selectAll'), value: '' };

      triggerValidation('VDBDBJDJDUD');

      expect(component.validationState()).toBe('INVALID');
      expect(component.trackingCode).toBe('VDBDBJDJDUD'); // Code bleibt sichtbar
      expect(prepareForNextScanSpy).toHaveBeenCalled();
    }));

    it('ein nachfolgender Scan-Wert ersetzt den alten Code und validiert neu', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD');
      expect(component.validationState()).toBe('INVALID');

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(component.trackingCode).toBe(VALID_CODE);
      expect(component.validationState()).toBe('VALID');
      expect(component.canSearch()).toBe(true);
    }));

    it('manueller Modus: alter INVALID-Code wird durch Clear-Guard ersetzt, nicht angehängt', fakeAsync(() => {
      component.setTrackingMode('manual');
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD', true);
      expect(component.validationState()).toBe('INVALID');

      // Erstes Zeichen des nächsten (manuellen) Scans - Guard muss Feld leeren.
      component.onManualKeyDown(new KeyboardEvent('keydown', { key: '0' }));
      expect(component.trackingCode).toBe('');

      component.onTrackingCodeChange('00340434664988418341', true);
      tick(400);

      expect(component.trackingCode).toBe('00340434664988418341');
    }));
  });

  describe('Manuelle Eingabe kann Validierung nicht umgehen', () => {
    it('manuelle Eingabe verwendet denselben Handler/dieselbe DHL-Validierung', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      component.setTrackingMode('manual');

      triggerValidation(VALID_CODE, true);

      expect(mockDhlService.validateTrackingCode).toHaveBeenCalledWith(123, VALID_CODE);
      expect(component.validationState()).toBe('VALID');
    }));

    it('findParcel() ohne vorherige VALID-Validierung ruft niemals den Backend-Endpoint auf', () => {
      component.trackingCode = 'VDBDBJDJDUDPADDING';
      component.findParcel();

      expect(mockDhlService.findParcel).not.toHaveBeenCalled();
    });
  });

  describe('VALID → lokale Suche mit kanonischem pieceCode', () => {
    it('ruft findParcel mit dem kanonischen pieceCode auf und zeigt den Lagerplatz', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      mockDhlService.findParcel.and.returnValue(of(mockFoundParcel()));

      triggerValidation(VALID_CODE);
      expect(component.canSearch()).toBe(true);

      component.findParcel();
      tick();

      expect(mockDhlService.findParcel).toHaveBeenCalledOnceWith(123, jasmine.objectContaining({
        trackingCode: VALID_CODE
      }));
      expect(component.step()).toBe('show-location');
      expect(component.foundParcel()?.shelfLocation).toBe('A7');
    }));

    it('lokal nicht vorhanden → bestehende Fehlermeldung über DhlErrorService', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      const notFoundErr = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      mockDhlService.findParcel.and.returnValue(throwError(() => notFoundErr));

      triggerValidation(VALID_CODE);
      component.findParcel();
      tick();

      expect(mockDhlErrorService.handleError).toHaveBeenCalledWith(notFoundErr);
      expect(component.step()).toBe('scan');
    }));
  });

  describe('VALID response → productName/weightKg anzeigbar', () => {
    it('speichert validatedResult() mit Produkt/Gewicht aus der DHL-Antwort', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse({
        productName: 'DHL PAKET',
        weightKg: 1.76
      })));
      triggerValidation(VALID_CODE);

      expect(component.validatedResult()?.productName).toBe('DHL PAKET');
      expect(component.validatedResult()?.weightKg).toBe(1.76);
    }));
  });

  describe('Abholung (nur nach VALID + lokalem Fund möglich)', () => {
    it('ruft pickupParcel auf und zeigt Erfolg', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      mockDhlService.findParcel.and.returnValue(of(mockFoundParcel()));
      mockDhlService.pickupParcel.and.returnValue(of({ ...mockFoundParcel(), status: 'PICKED_UP' }));

      triggerValidation(VALID_CODE);
      component.findParcel();
      tick();

      component.confirmPickup();
      tick();

      expect(mockDhlService.pickupParcel).toHaveBeenCalledOnceWith(123, jasmine.objectContaining({
        trackingCode: VALID_CODE
      }));
      expect(component.step()).toBe('success');
    }));
  });

  describe('Scanner-UX: neuer Scan ERSETZT alten Code (kein Anhängen)', () => {
    /** Simuliert das erste Zeichen eines neuen HID-Scans auf dem echten <input>. */
    function dispatchFirstScanKeydown(key: string): void {
      const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('.barcode-input-field');
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    it('1) alter INVALID-Code ($DS29PADDING) + neuer Scan → trackingCode === neuer Code (kein Anhängen)', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('$DS29PADDING')));
      triggerValidation('$DS29PADDING');
      expect(component.validationState()).toBe('INVALID');

      // Erstes Zeichen des nächsten Scans trifft auf das (noch $DS29PADDING
      // enthaltende) Feld - der Clear-Guard muss das Feld VORHER leeren.
      dispatchFirstScanKeydown('0');
      expect(component.barcodeInputRef!.value).toBe('');

      // Browser fügt danach Zeichen für Zeichen den neuen Code ein (input-Event).
      component.barcodeInputRef!.onValueChange('00340434664988418341');
      tick(400);

      expect(component.trackingCode).toBe('00340434664988418341');
    }));

    it('2) kein String-Anhängen: alter Code darf NICHT mehr im Feld vorkommen', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('$DS29PADDING')));
      triggerValidation('$DS29PADDING');

      dispatchFirstScanKeydown('0');
      component.barcodeInputRef!.onValueChange('00340434664988418341');
      tick(400);

      expect(component.trackingCode).not.toContain('$DS29');
      expect(component.trackingCode.length).toBe('00340434664988418341'.length);
    }));

    it('3) alter VALID-Code + neuer Scan → VALID sofort weg, neuer Code ersetzt alten, erneute DHL-Prüfung', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);
      expect(component.validationState()).toBe('VALID');
      expect(component.trackingCode).toBe(VALID_CODE);

      const NEW_CODE = '00340434664988418342';
      dispatchFirstScanKeydown('0');
      expect(component.barcodeInputRef!.value).toBe('');

      // onValueChange löst denselben Handler wie ein echtes Scan-Event aus.
      component.barcodeInputRef!.onValueChange(NEW_CODE);

      // Alter VALID-Status ist sofort weg (siehe onTrackingCodeChange)
      expect(component.validationState()).toBe('IDLE');
      expect(component.trackingCode).toBe(NEW_CODE);

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse({ trackingCode: NEW_CODE, pieceCode: NEW_CODE })));
      tick(400);

      expect(mockDhlService.validateTrackingCode).toHaveBeenCalledWith(123, NEW_CODE);
      expect(component.validationState()).toBe('VALID');
    }));

    it('4) TECHNICAL_ERROR → neuer Scan ersetzt alten Code ebenfalls (kein Anhängen)', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { errorCode: 'DHL_CONNECTIVITY_ERROR', message: 'Timeout' },
        status: 504,
        statusText: 'Gateway Timeout'
      });
      mockDhlErrorService.classifyTrackingValidationError.and.returnValue('TECHNICAL_ERROR');
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation(VALID_CODE);
      expect(component.validationState()).toBe('TECHNICAL_ERROR');

      const NEW_CODE = '00340434664988418342';
      dispatchFirstScanKeydown('0');
      expect(component.barcodeInputRef!.value).toBe('');

      mockDhlErrorService.classifyTrackingValidationError.calls.reset();
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse({ trackingCode: NEW_CODE, pieceCode: NEW_CODE })));
      component.barcodeInputRef!.onValueChange(NEW_CODE);
      tick(400);

      expect(component.trackingCode).toBe(NEW_CODE);
      expect(component.validationState()).toBe('VALID');
    }));
  });

  describe('reset()', () => {
    it('setzt validationState auf IDLE und validatedResult auf null zurück', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);
      expect(component.validationState()).toBe('VALID');

      component.reset();

      expect(component.validationState()).toBe('IDLE');
      expect(component.validatedResult()).toBeNull();
      expect(component.trackingCode).toBe('');
      expect(component.step()).toBe('scan');
    }));
  });
});
