import { TestBed } from '@angular/core/testing';
import { AppAccessService } from './app-access.service';
import { AuthService } from './auth.service';
import { AppAccessMode, AppKey, User } from '../models';

/**
 * AppAccessService Tests
 *
 * Deckt die konkrete Korrektur ab: DHL ist eine eigenständige App und wird
 * NICHT mehr über "Meine Stores" erreicht. Ein MANAGED-User mit
 * DHL/storeId 121/enabled=true muss nach Login direkt auf die app-zentrische
 * DHL-Route (/apps/dhl/121) geleitet werden, nicht auf /stores/121/dhl.
 *
 * Zusätzlich: die bisherige /stores/:id/dhl-Route bleibt als Legacy-Alias
 * weiterhin nutzbar (kein Breaking-Change für bestehende Bookmarks/Links).
 */
describe('AppAccessService', () => {
  let service: AppAccessService;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  function buildUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      email: 'test@example.com',
      roles: [],
      createdAt: '',
      updatedAt: '',
      ...overrides
    } as User;
  }

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      providers: [
        AppAccessService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(AppAccessService);
  });

  describe('LEGACY-User', () => {
    it('erlaubt jede URL unverändert (kein appAccessMode gesetzt)', () => {
      mockAuthService.getCurrentUser.and.returnValue(buildUser());

      expect(service.isUrlAllowed('/stores/121/dhl')).toBeTrue();
      expect(service.isUrlAllowed('/apps/dhl/121')).toBeTrue();
      expect(service.isUrlAllowed('/dashboard')).toBeTrue();
      expect(service.isUrlAllowed('/tools/maritime')).toBeTrue();
    });
  });

  describe('MANAGED-User mit ausschließlich DHL/Store 121', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.DHL, storeId: 121, enabled: true }]
        })
      );
    });

    it('liefert die app-zentrische DHL-Startseite (nicht die Shop-Route)', () => {
      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/dhl/121');
    });

    it('erlaubt die neue app-zentrische DHL-Route für Store 121', () => {
      expect(service.isUrlAllowed('/apps/dhl/121')).toBeTrue();
      expect(service.isUrlAllowed('/apps/dhl/121/store')).toBeTrue();
    });

    it('erlaubt weiterhin die Legacy-Alias-Route /stores/121/dhl', () => {
      expect(service.isUrlAllowed('/stores/121/dhl')).toBeTrue();
    });

    it('blockiert DHL für einen anderen Store (weder app-zentrisch noch Legacy)', () => {
      expect(service.isUrlAllowed('/apps/dhl/999')).toBeFalse();
      expect(service.isUrlAllowed('/stores/999/dhl')).toBeFalse();
    });

    it('blockiert die normale "Meine Stores"/Shop-Oberfläche', () => {
      expect(service.isUrlAllowed('/dashboard')).toBeFalse();
      expect(service.isUrlAllowed('/stores/121/products')).toBeFalse();
      expect(service.isUrlAllowed('/stores/121')).toBeFalse();
    });

    it('blockiert andere Apps (Loyalty, Maritime, Issue-Analysis)', () => {
      expect(service.isUrlAllowed('/stores/121/loyalty')).toBeFalse();
      expect(service.isUrlAllowed('/tools/maritime')).toBeFalse();
      expect(service.isUrlAllowed('/tools/issue-analysis')).toBeFalse();
    });

    it('lässt neutrale Routen (Profil/Einstellungen) weiterhin zu', () => {
      expect(service.isUrlAllowed('/settings')).toBeTrue();
      expect(service.isUrlAllowed('/login')).toBeTrue();
    });
  });

  describe('MANAGED-User mit mehreren Entitlements', () => {
    it('wählt deterministisch DHL vor SHOP (Priorität), bei mehreren DHL-Stores die niedrigere storeId', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.SHOP, storeId: 5, enabled: true },
            { app: AppKey.DHL, storeId: 200, enabled: true },
            { app: AppKey.DHL, storeId: 121, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/dhl/121');
    });
  });
});
