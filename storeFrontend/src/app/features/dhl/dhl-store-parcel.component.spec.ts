import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DestroyRef, signal } from '@angular/core';
import { of, throwError, delay } from 'rxjs';
import { DhlStoreParcelComponent } from './dhl-store-parcel.component';
import { DhlService, DhlTrackingValidationResponse, DhlParcel, DhlStoreParcelRequestV2 } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { TranslationService } from '@app/core/services/translation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

describe('DhlStoreParcelComponent - SCHRITT 3 Tracking Validation', () => {
  let component: DhlStoreParcelComponent;
  let fixture: ComponentFixture<DhlStoreParcelComponent>;
  let mockDhlService: jasmine.SpyObj<DhlService>;
  let mockDhlErrorService: jasmine.SpyObj<DhlErrorService>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockDestroyRef: jasmine.SpyObj<DestroyRef>;

  beforeEach(async () => {
    mockDhlService = jasmine.createSpyObj('DhlService', [
      'validateTrackingCode',
      'storeParcelV2',
      'getSlots'
    ]);
    mockDhlErrorService = jasmine.createSpyObj('DhlErrorService', ['handleError']);
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['translate']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/stores/123/dhl/store' });
    mockDestroyRef = jasmine.createSpyObj('DestroyRef', ['onDestroy']);

    // Default translations
    mockTranslationService.translate.and.callFake((key: string) => {
      const translations: Record<string, string> = {
        'dhl.validation.checking': 'DHL-Sendung wird geprüft...',
        'dhl.validation.validShipment': '✓ DHL-Sendung erkannt',
        'dhl.validation.notAShipment': 'Kein DHL-Sendungscode erkannt',
        'dhl.validation.scanAnotherBarcode': 'Bitte einen anderen Barcode auf dem Paket scannen',
        'dhl.errors.invalidTrackingCode': 'Ungültiger Tracking-Code'
      };
      return translations[key] || key;
    });

    mockDhlService.getSlots.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DhlStoreParcelComponent],
      providers: [
        { provide: DhlService, useValue: mockDhlService },
        { provide: DhlErrorService, useValue: mockDhlErrorService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: Router, useValue: mockRouter },
        { provide: DestroyRef, useValue: mockDestroyRef },
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

  describe('VALID tracking code', () => {
    it('should use pieceCode from DHL response and proceed with storage', fakeAsync(() => {
      const mockValidationResponse: DhlTrackingValidationResponse = {
        status: 'VALID',
        trackingCode: '00340434664988418341',
        pieceCode: '00340434664988418341',
        pieceIdentifier: '340434664988418341',
        dhlResponseCode: '0',
        valid: true
      };

      const mockParcel: DhlParcel = {
        id: 1,
        storeId: 123,
        trackingCode: '00340434664988418341',
        shelfLocation: 'A1',
        receivedAt: '2026-09-01T15:00:00Z',
        status: 'STORED',
        createdAt: '2026-09-01T15:00:00Z',
        updatedAt: '2026-09-01T15:00:00Z'
      };

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidationResponse));
      mockDhlService.storeParcelV2.and.returnValue(of(mockParcel));

      component.trackingCode = '00340434664988418341';
      component.storeParcel();
      tick();

      expect(mockDhlService.validateTrackingCode).toHaveBeenCalledWith(123, '00340434664988418341');
      expect(component.trackingCode).toBe('00340434664988418341'); // pieceCode übernommen
      expect(mockDhlService.storeParcelV2).toHaveBeenCalledOnceWith(123, jasmine.objectContaining({
        trackingCode: '00340434664988418341'
      } as DhlStoreParcelRequestV2));
      expect(component.success()).toBe(true);
      expect(component.storedParcel()?.shelfLocation).toBe('A1');
      expect(component.validating()).toBe(false);
      expect(component.loading()).toBe(false);
    }));

    it('should use trackingCode fallback if pieceCode is missing', fakeAsync(() => {
      const mockValidationResponse: DhlTrackingValidationResponse = {
        status: 'VALID',
        trackingCode: '00340434664988418341',
        // pieceCode is undefined
        dhlResponseCode: '0',
        valid: true
      };

      const mockParcel: DhlParcel = {
        id: 1,
        storeId: 123,
        trackingCode: '00340434664988418341',
        shelfLocation: 'A1',
        receivedAt: '2026-09-01T15:00:00Z',
        status: 'STORED',
        createdAt: '2026-09-01T15:00:00Z',
        updatedAt: '2026-09-01T15:00:00Z'
      };

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidationResponse));
      mockDhlService.storeParcelV2.and.returnValue(of(mockParcel));

      component.trackingCode = '00340434664988418341';
      component.storeParcel();
      tick();

      expect(component.trackingCode).toBe('00340434664988418341'); // trackingCode als Fallback
      expect(mockDhlService.storeParcelV2).toHaveBeenCalled();
    }));
  });

  describe('NOT_FOUND tracking code', () => {
    it('should NOT call storeParcelV2 and clear input field', fakeAsync(() => {
      const mockValidationResponse: DhlTrackingValidationResponse = {
        status: 'NOT_FOUND',
        trackingCode: '99999999999999999999',
        dhlResponseCode: '100',
        dhlErrorMessage: 'Not found',
        valid: false
      };

      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidationResponse));

      component.trackingCode = '99999999999999999999';
      component.storeParcel();
      tick();

      expect(mockDhlService.validateTrackingCode).toHaveBeenCalled();
      expect(mockDhlService.storeParcelV2).not.toHaveBeenCalled();
      expect(component.trackingCode).toBe(''); // Eingabe geleert
      expect(component.validationMessage()).toContain('Kein DHL-Sendungscode erkannt');
      expect(component.validating()).toBe(false);
      expect(component.loading()).toBe(false);
      expect(component.success()).toBe(false);
    }));

    it('should allow retry after NOT_FOUND', fakeAsync(() => {
      const mockNotFoundResponse: DhlTrackingValidationResponse = {
        status: 'NOT_FOUND',
        trackingCode: '99999999999999999999',
        dhlResponseCode: '100',
        valid: false
      };

      mockDhlService.validateTrackingCode.and.returnValue(of(mockNotFoundResponse));

      component.trackingCode = '99999999999999999999';
      component.storeParcel();
      tick();

      expect(component.validating()).toBe(false);
      expect(component.trackingCode).toBe('');
      
      // Zweiter Scan möglich
      component.trackingCode = '00340434664988418341';
      const canSubmit = component.canSubmit();
      expect(canSubmit).toBe(true);
    }));
  });

  describe('Technical errors', () => {
    it('should handle DHL authentication error via DhlErrorService', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { code: 'DHL_AUTHENTICATION_ERROR', message: 'Auth failed' },
        status: 503,
        statusText: 'Service Unavailable'
      });

      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));

      component.trackingCode = '00340434664988418341';
      component.storeParcel();
      tick();

      expect(mockDhlErrorService.handleError).toHaveBeenCalledWith(mockError);
      expect(mockDhlService.storeParcelV2).not.toHaveBeenCalled();
      expect(component.validating()).toBe(false);
      expect(component.loading()).toBe(false);
      expect(component.validationMessage()).toBe(''); // Fehler-Message über Toast
    }));

    it('should handle DHL connectivity error (timeout)', fakeAsync(() => {
      const mockError = new HttpErrorResponse({
        error: { code: 'DHL_CONNECTIVITY_ERROR', message: 'Timeout' },
        status: 504,
        statusText: 'Gateway Timeout'
      });

      mockDhlService.validateTrackingCode.and.returnValue(throwError(() => mockError));

      component.trackingCode = '00340434664988418341';
      component.storeParcel();
      tick();

      expect(mockDhlErrorService.handleError).toHaveBeenCalled();
      expect(mockDhlService.storeParcelV2).not.toHaveBeenCalled();
      expect(component.validating()).toBe(false);
    }));
  });

  describe('Doppelscan-Schutz', () => {
    it('should prevent duplicate validation requests while validating', fakeAsync(() => {
      const mockValidationResponse: DhlTrackingValidationResponse = {
        status: 'VALID',
        trackingCode: '00340434664988418341',
        dhlResponseCode: '0',
        valid: true
      };
      
      const mockParcel: DhlParcel = {
        id: 1,
        storeId: 123,
        trackingCode: '00340434664988418341',
        shelfLocation: 'A1',
        receivedAt: '2026-09-01T15:00:00Z',
        status: 'STORED',
        createdAt: '2026-09-01T15:00:00Z',
        updatedAt: '2026-09-01T15:00:00Z'
      };

      // Validation verzögert, damit validating() noch true ist
      mockDhlService.validateTrackingCode.and.returnValue(of(mockValidationResponse).pipe(delay(100)));
      mockDhlService.storeParcelV2.and.returnValue(of(mockParcel));
      
      component.trackingCode = '00340434664988418341';
      component.storeParcel(); // Erster Aufruf
      
      tick(10); // Kurz warten
      expect(component.validating()).toBe(true);
      
      // Zweiter Aufruf während validation läuft
      component.storeParcel();
      tick(200); // Validation abwarten
      
      // Nur EIN Validation Request
      expect(mockDhlService.validateTrackingCode).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Local validation', () => {
    it('should reject tracking codes shorter than 10 characters via canSubmit', () => {
      component.trackingCode = '123';
      
      // canSubmit() should return false for short codes
      expect(component.canSubmit()).toBe(false);
      
      // storeParcel() should return early without calling DHL API
      component.storeParcel();
      expect(mockDhlService.validateTrackingCode).not.toHaveBeenCalled();
    });
  });

  describe('Component lifecycle', () => {
    it('should reset validation state on reset()', () => {
      component.validating.set(true);
      component.validationMessage.set('Some message');
      component.trackingCode = '00340434664988418341';

      component.reset();

      expect(component.validating()).toBe(false);
      expect(component.validationMessage()).toBe('');
      expect(component.trackingCode).toBe('');
    });
  });
});
