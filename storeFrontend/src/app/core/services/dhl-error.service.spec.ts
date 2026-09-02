import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { DhlErrorService } from './dhl-error.service';
import { TranslationService } from './translation.service';
import { ToastService } from './toast.service';

/**
 * DhlErrorService Tests
 *
 * Deckt zwei Aspekte ab:
 * 1. Der "errorCode" vs. "code" Feldname-Bug: Backend-Endpoints wie
 *    POST /tracking/validate liefern "errorCode", ältere/andere DHL-Endpoints
 *    (z.B. /parcels/store, /parcels/pickup, generische Fehlercodes wie
 *    PARCEL_NOT_FOUND) liefern "code". Beide MÜSSEN korrekt gelesen werden.
 * 2. classifyTrackingValidationError(): einheitliche Klassifizierung
 *    INVALID vs. TECHNICAL_ERROR für Einlagern UND Abholen.
 */
describe('DhlErrorService', () => {
  let service: DhlErrorService;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockTranslation: jasmine.SpyObj<TranslationService>;

  beforeEach(() => {
    mockToast = jasmine.createSpyObj('ToastService', ['error', 'warning', 'success', 'info']);
    mockTranslation = jasmine.createSpyObj('TranslationService', ['translate']);
    mockTranslation.translate.and.callFake((key: string) => key);

    TestBed.configureTestingModule({
      providers: [
        DhlErrorService,
        { provide: ToastService, useValue: mockToast },
        { provide: TranslationService, useValue: mockTranslation }
      ]
    });

    service = TestBed.inject(DhlErrorService);
  });

  describe('handleError() - liest errorCode korrekt', () => {
    it('liest "errorCode" (z.B. von POST /tracking/validate) und zeigt die passende Meldung', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_AUTHENTICATION_ERROR', message: 'invalid credentials' },
        status: 503
      });

      const handled = service.handleError(error);

      expect(handled).toBe(true);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('DHL_VALIDATION_ERROR über "errorCode" wird erkannt (nicht generischer Fehler)', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_VALIDATION_ERROR', message: 'unrecognized response code' },
        status: 422
      });

      const handled = service.handleError(error);

      expect(handled).toBe(true);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('Fallback auf "code" funktioniert weiterhin (ältere/andere DHL-Endpoints, keine Regression)', () => {
      const error = new HttpErrorResponse({
        error: { code: 'PARCEL_NOT_FOUND', message: 'not found' },
        status: 404
      });

      const handled = service.handleError(error);

      expect(handled).toBe(true);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('"errorCode" hat Vorrang vor "code", falls beide gesetzt sind', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_VALIDATION_ERROR', code: 'SOME_OTHER_CODE', message: 'x' },
        status: 422
      });

      service.handleError(error);

      // showDhlValidationError() nutzt validationErrorTitle - Nachweis via translate-Aufruf
      expect(mockTranslation.translate).toHaveBeenCalledWith('dhl.validation.validationErrorTitle');
    });

    it('unbekannter Code ohne HTTP-Status-Fallback-Treffer → generischer Fehler', () => {
      const error = new HttpErrorResponse({
        error: { message: 'boom' },
        status: 599
      });

      const handled = service.handleError(error);

      expect(handled).toBe(false);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('classifyTrackingValidationError() - einheitliche Klassifizierung', () => {
    it('DHL_VALIDATION_ERROR → INVALID', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_VALIDATION_ERROR' },
        status: 422
      });
      expect(service.classifyTrackingValidationError(error)).toBe('INVALID');
    });

    it('DHL_TRACKING_NOT_FOUND → INVALID', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_TRACKING_NOT_FOUND' },
        status: 422
      });
      expect(service.classifyTrackingValidationError(error)).toBe('INVALID');
    });

    it('DHL_CONNECTIVITY_ERROR → TECHNICAL_ERROR', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_CONNECTIVITY_ERROR' },
        status: 504
      });
      expect(service.classifyTrackingValidationError(error)).toBe('TECHNICAL_ERROR');
    });

    it('DHL_TECHNICAL_ERROR → TECHNICAL_ERROR', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_TECHNICAL_ERROR' },
        status: 500
      });
      expect(service.classifyTrackingValidationError(error)).toBe('TECHNICAL_ERROR');
    });

    it('DHL_AUTHENTICATION_ERROR → TECHNICAL_ERROR', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_AUTHENTICATION_ERROR' },
        status: 503
      });
      expect(service.classifyTrackingValidationError(error)).toBe('TECHNICAL_ERROR');
    });

    it('DHL_NOT_CONFIGURED → TECHNICAL_ERROR', () => {
      const error = new HttpErrorResponse({
        error: { errorCode: 'DHL_NOT_CONFIGURED' },
        status: 503
      });
      expect(service.classifyTrackingValidationError(error)).toBe('TECHNICAL_ERROR');
    });

    it('unbekannter/unerwarteter Serverfehler → TECHNICAL_ERROR (fail-closed)', () => {
      const error = new HttpErrorResponse({
        error: { message: 'boom' },
        status: 500
      });
      expect(service.classifyTrackingValidationError(error)).toBe('TECHNICAL_ERROR');
    });
  });
});
