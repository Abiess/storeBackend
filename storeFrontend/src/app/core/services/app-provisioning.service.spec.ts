import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppProvisioningService } from './app-provisioning.service';
import { environment } from '../../../environments/environment';
import { AppKey, AppAccessMode } from '../models';

/**
 * App Provisioning Phase 1 - Vertragstest für den Angular-HTTP-Client
 * gegen `/api/admin/app-provisioning/**` (siehe `AppProvisioningController`).
 */
describe('AppProvisioningService', () => {
  let service: AppProvisioningService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin/app-provisioning`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppProvisioningService]
    });
    service = TestBed.inject(AppProvisioningService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('searchUsers() calls GET /users?query=...', () => {
    service.searchUsers('owner').subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].appAccessMode).toBe(AppAccessMode.LEGACY);
    });

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/users` && r.params.get('query') === 'owner');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, email: 'owner@example.com', name: 'Owner', appAccessMode: AppAccessMode.LEGACY }]);
  });

  it('getUserEntitlements() calls GET /users/{id}/entitlements', () => {
    service.getUserEntitlements(1).subscribe(result => {
      expect(result.userId).toBe(1);
      expect(result.entitlements.length).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/users/1/entitlements`);
    expect(req.request.method).toBe('GET');
    req.flush({ userId: 1, userEmail: 'owner@example.com', appAccessMode: AppAccessMode.LEGACY, entitlements: [] });
  });

  it('upsertEntitlement() calls PUT /users/{id}/entitlements with the request body', () => {
    service.upsertEntitlement(1, { app: AppKey.SHOP, storeId: 121, enabled: true }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/1/entitlements`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ app: AppKey.SHOP, storeId: 121, enabled: true });
    req.flush({
      id: 99, app: AppKey.SHOP, scope: 'STORE', storeId: 121, storeName: 'Store 121',
      enabled: true, createdAt: '', updatedAt: ''
    });
  });

  it('patchEntitlement() calls PATCH /users/{id}/entitlements/{entitlementId}', () => {
    service.patchEntitlement(1, 99, false).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/1/entitlements/99`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({
      id: 99, app: AppKey.SHOP, scope: 'STORE', storeId: 121, storeName: 'Store 121',
      enabled: false, createdAt: '', updatedAt: ''
    });
  });

  it('searchStores() calls GET /stores?query=...', () => {
    service.searchStores('121').subscribe(result => {
      expect(result[0].id).toBe(121);
    });

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/stores` && r.params.get('query') === '121');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 121, name: 'Store 121', slug: 'store-121', ownerEmail: 'owner@example.com', businessType: 'SHOP' }]);
  });
});
