import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DhlService, DhlTrackingValidationResponse } from './dhl.service';
import { environment } from '../../../environments/environment';

describe('DhlService - SCHRITT 3 Tracking Validation', () => {
  let service: DhlService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;
  const storeId = 123;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DhlService]
    });
    service = TestBed.inject(DhlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('validateTrackingCode()', () => {
    it('should call correct endpoint with trimmed tracking code', () => {
      const trackingCode = '  00340434664988418341  ';
      const expectedBody = { trackingCode: '00340434664988418341' };

      service.validateTrackingCode(storeId, trackingCode).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(expectedBody);
    });

    it('should return VALID response with pieceCode', (done) => {
      const trackingCode = '00340434664988418341';
      const mockResponse: DhlTrackingValidationResponse = {
        status: 'VALID',
        trackingCode: '00340434664988418341',
        pieceCode: '00340434664988418341',
        pieceIdentifier: '340434664988418341',
        shipmentStatus: 'In transit',
        standardEventCode: 'ZF',
        productName: 'DHL PAKET',
        weightKg: 2.5,
        dhlResponseCode: '0',
        valid: true
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: (response) => {
          expect(response.status).toBe('VALID');
          expect(response.valid).toBe(true);
          expect(response.pieceCode).toBe('00340434664988418341');
          expect(response.dhlResponseCode).toBe('0');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockResponse);
    });

    it('should return NOT_FOUND response when DHL code=100', (done) => {
      const trackingCode = '99999999999999999999';
      const mockResponse: DhlTrackingValidationResponse = {
        status: 'NOT_FOUND',
        trackingCode: '99999999999999999999',
        dhlResponseCode: '100',
        dhlErrorMessage: 'Tracking code not found in DHL system',
        valid: false
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: (response) => {
          expect(response.status).toBe('NOT_FOUND');
          expect(response.valid).toBe(false);
          expect(response.dhlResponseCode).toBe('100');
          expect(response.pieceCode).toBeUndefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockResponse);
    });

    it('should handle DHL authentication error (503)', (done) => {
      const trackingCode = '00340434664988418341';
      const mockError = {
        timestamp: '2026-09-01T15:00:00Z',
        status: 503,
        code: 'DHL_AUTHENTICATION_ERROR',
        message: 'Invalid DHL credentials'
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: () => fail('Should have failed with 503'),
        error: (error) => {
          expect(error.status).toBe(503);
          expect(error.error.code).toBe('DHL_AUTHENTICATION_ERROR');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockError, { status: 503, statusText: 'Service Unavailable' });
    });

    it('should handle DHL connectivity error (504)', (done) => {
      const trackingCode = '00340434664988418341';
      const mockError = {
        timestamp: '2026-09-01T15:00:00Z',
        status: 504,
        code: 'DHL_CONNECTIVITY_ERROR',
        message: 'Timeout connecting to DHL API'
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: () => fail('Should have failed with 504'),
        error: (error) => {
          expect(error.status).toBe(504);
          expect(error.error.code).toBe('DHL_CONNECTIVITY_ERROR');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockError, { status: 504, statusText: 'Gateway Timeout' });
    });

    it('should handle DHL technical error (500)', (done) => {
      const trackingCode = '00340434664988418341';
      const mockError = {
        timestamp: '2026-09-01T15:00:00Z',
        status: 500,
        code: 'DHL_TECHNICAL_ERROR',
        message: 'DHL internal error'
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: () => fail('Should have failed with 500'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error.code).toBe('DHL_TECHNICAL_ERROR');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockError, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle missing pieceCode with trackingCode fallback', (done) => {
      const trackingCode = '00340434664988418341';
      const mockResponse: DhlTrackingValidationResponse = {
        status: 'VALID',
        trackingCode: '00340434664988418341',
        // pieceCode is undefined
        dhlResponseCode: '0',
        valid: true
      };

      service.validateTrackingCode(storeId, trackingCode).subscribe({
        next: (response) => {
          expect(response.status).toBe('VALID');
          expect(response.pieceCode).toBeUndefined();
          expect(response.trackingCode).toBe('00340434664988418341');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/dhl/tracking/validate`);
      req.flush(mockResponse);
    });
  });
});
