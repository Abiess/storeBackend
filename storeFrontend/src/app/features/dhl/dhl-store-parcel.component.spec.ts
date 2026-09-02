import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { DhlStoreParcelComponent } from './dhl-store-parcel.component';
import { DhlService, DhlTrackingValidationResponse, DhlParcel } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { TranslationService } from '@app/core/services/translation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * TEIL 1 - Einlagerungs-UX: TrackingValidationState-Modell.
 *
 * Diese Tests ersetzen die alte "auto-submit-on-click" Testsuite komplett,
 * weil die Komponente jetzt fail-closed ist:
 *
 * - Der "Paket einlagern"-Button ist AUSSCHLIESSLICH bei validationState()
 *   === 'VALID' aktiv.
 * - Validierung läuft automatisch (debounced) im Hintergrund, unabhängig
 *   vom Button-Klick.
 * - Ein Tracking-Code-Wechsel verwirft sofort einen vorherigen VALID-Status.
 */
describe('DhlStoreParcelComponent - TEIL 1 TrackingValidationState', () => {
  let component: DhlStoreParcelComponent;
  let fixture: ComponentFixture<DhlStoreParcelComponent>;
  let mockDhlService: jasmine.SpyObj<DhlService>;
  let mockDhlErrorService: jasmine.SpyObj<DhlErrorService>;
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

  function mockStoredParcel(): DhlParcel {
    return {
      id: 1,
      storeId: 123,
      trackingCode: VALID_CODE,
      shelfLocation: 'A1',
      receivedAt: '2026-09-01T15:00:00Z',
      status: 'STORED',
      createdAt: '2026-09-01T15:00:00Z',
      updatedAt: '2026-09-01T15:00:00Z'
    };
  }

  beforeEach(async () => {
    mockDhlService = jasmine.createSpyObj('DhlService', [
      'validateTrackingCode',
      'storeParcelV2',
      'getSlots'
    ]);
    mockDhlErrorService = jasmine.createSpyObj('DhlErrorService', ['handleError']);
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['translate']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/stores/123/dhl/store' });

    mockTranslationService.translate.and.callFake((key: string) => key);
    mockDhlService.getSlots.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DhlStoreParcelComponent],
      providers: [
        { provide: DhlService, useValue: mockDhlService },
        { provide: DhlErrorService, useValue: mockDhlErrorService },
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

    fixture = TestBed.createComponent(DhlStoreParcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Löst die (debounced) automatische Validierung für einen Code aus. */
  function triggerValidation(code: string, manual = false): void {
    component.onTrackingCodeChange(code, manual);
    tick(400); // debounceTime(400)
  }

  describe('canSubmit() - fail-closed pro Zustand', () => {
    it('IDLE → disabled', () => {
      expect(component.validationState()).toBe('IDLE');
      expect(component.canSubmit()).toBe(false);
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
      expect(component.canSubmit()).toBe(false);

      resolveFn(mockValidResponse());
      tick();
      expect(component.validationState()).toBe('VALID');
      expect(component.canSubmit()).toBe(true);
    }));

    it('VALID → enabled', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(component.validationState()).toBe('VALID');
      expect(component.canSubmit()).toBe(true);
    }));

    it('INVALID (NOT_FOUND) → disabled', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('HDHSJ27373')));
      triggerValidation('HDHSJ27373');

      expect(component.validationState()).toBe('INVALID');
      expect(component.canSubmit()).toBe(false);
    }));

    it('TECHNICAL_ERROR → disabled', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { code: 'DHL_CONNECTIVITY_ERROR', message: 'Timeout' },
        status: 504,
        statusText: 'Gateway Timeout'
      });
      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));
      triggerValidation(VALID_CODE);

      expect(component.validationState()).toBe('TECHNICAL_ERROR');
      expect(component.canSubmit()).toBe(false);
      expect(mockDhlErrorService.handleError).toHaveBeenCalledWith(mockError);
    }));

    it('Codelänge >= 10 allein aktiviert den Button NICHT (kein Bypass ohne DHL-Bestätigung)', () => {
      component.trackingCode = 'HDHSJ27373PADDING'; // >= 10 Zeichen, aber niemals validiert
      expect(component.validationState()).toBe('IDLE');
      expect(component.canSubmit()).toBe(false);
    });
  });

  describe('VALID → Tracking-Code geändert → sofort IDLE + disabled', () => {
    it('verwirft VALID sofort, sobald sich der Code ändert', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);
      expect(component.validationState()).toBe('VALID');
      expect(component.canSubmit()).toBe(true);

      // Benutzer ändert eine Ziffer
      component.onTrackingCodeChange('00340434664988418342');

      expect(component.validationState()).toBe('IDLE');
      expect(component.validatedResult()).toBeNull();
      expect(component.canSubmit()).toBe(false);
    }));
  });

  describe('INVALID → nächster Scanner-Code ersetzt alten Code', () => {
    it('selektiert den abgelehnten Code im Scanner-Feld für Auto-Replace', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      const selectAllSpy = jasmine.createSpy('selectAll');
      (component as any).barcodeInputRef = { selectAll: selectAllSpy };

      triggerValidation('VDBDBJDJDUD');
      tick(); // setTimeout in prepareForNextScan()

      expect(component.validationState()).toBe('INVALID');
      expect(component.trackingCode).toBe('VDBDBJDJDUD'); // Code bleibt sichtbar
      expect(selectAllSpy).toHaveBeenCalled();
    }));

    it('ein nachfolgender Scan-Wert ersetzt den alten Code und validiert neu', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse('VDBDBJDJDUD')));
      triggerValidation('VDBDBJDJDUD');
      expect(component.validationState()).toBe('INVALID');

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      triggerValidation(VALID_CODE);

      expect(component.trackingCode).toBe(VALID_CODE);
      expect(component.validationState()).toBe('VALID');
      expect(component.canSubmit()).toBe(true);
    }));
  });

  describe('VALID response → productName/weight anzeigbar', () => {
    it('speichert validatedResult() mit Produkt/Gewicht aus der DHL-Antwort', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse({
        productName: 'DHL PAKET',
        weight: 1.76
      })));
      triggerValidation(VALID_CODE);

      expect(component.validatedResult()?.productName).toBe('DHL PAKET');
      expect(component.validatedResult()?.weight).toBe(1.76);
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

    it('storeParcel() ohne vorherige VALID-Validierung ruft niemals storeParcelV2() auf', () => {
      component.trackingCode = 'HDHSJ27373PADDING';
      component.storeParcel();

      expect(mockDhlService.storeParcelV2).not.toHaveBeenCalled();
    });
  });

  describe('Erfolgreiche Einlagerung (nur nach VALID möglich)', () => {
    it('ruft storeParcelV2 mit dem kanonischen pieceCode auf und zeigt Erfolg', fakeAsync(() => {
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidResponse()));
      mockDhlService.storeParcelV2.and.returnValue(of(mockStoredParcel()));

      triggerValidation(VALID_CODE);
      expect(component.canSubmit()).toBe(true);

      component.storeParcel();
      tick();

      expect(mockDhlService.storeParcelV2).toHaveBeenCalledOnceWith(123, jasmine.objectContaining({
        trackingCode: VALID_CODE
      }));
      expect(component.success()).toBe(true);
      expect(component.storedParcel()?.shelfLocation).toBe('A1');
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
    }));
  });
});
