import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DhlActivityLogService } from './dhl-activity-log.service';
import { environment } from '@env/environment';

describe('DhlActivityLogService', () => {
  let service: DhlActivityLogService;
  let httpMock: HttpTestingController;

  const storeId = 121;
  const baseUrl = `${environment.apiUrl}/stores/${storeId}/dhl/activity-log`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DhlActivityLogService]
    });

    service = TestBed.inject(DhlActivityLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // A) userId = null → URL enthält KEIN userId
  it('sendet KEINEN userId Query-Parameter, wenn userId null ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, undefined, null).subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.has('userId')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  // B) userId = 1 → userId=1
  it('sendet userId=1, wenn userId gesetzt ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, undefined, 1).subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.get('userId')).toBe('1');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  // C) action = null → URL enthält KEIN action
  it('sendet KEINEN action Query-Parameter, wenn action nicht gesetzt ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, undefined, undefined).subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.has('action')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  // D) action = 'MANUAL_SEARCH' → action=MANUAL_SEARCH
  it('sendet action=MANUAL_SEARCH, wenn action gesetzt ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, 'MANUAL_SEARCH').subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.get('action')).toBe('MANUAL_SEARCH');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  // E) beide null → nur page + size
  it('sendet nur page und size, wenn action und userId beide null sind', () => {
    service.getActivityLog(storeId, 0, 20, undefined, undefined, null).subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('action')).toBeFalse();
    expect(req.request.params.has('userId')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  // Defensiv: literale Strings "null"/"undefined" (z.B. durch einen fehlerhaften
  // Template-Binding-Bug) dürfen ebenfalls NIEMALS als Query-Parameter landen.
  it('sendet KEINEN userId Parameter, wenn userId versehentlich der String "null" ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, undefined, 'null' as unknown as number).subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.has('userId')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('sendet KEINEN action Parameter, wenn action versehentlich der String "null" ist', () => {
    service.getActivityLog(storeId, 0, 20, undefined, 'null').subscribe();

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.method === 'GET'
    );
    expect(req.request.params.has('action')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });
});
