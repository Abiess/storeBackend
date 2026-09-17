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

  describe('MANAGED-User mit mehreren Entitlements verschiedener Apps', () => {
    it('leitet bei >1 verfügbaren Apps auf den generischen App-Launcher (/apps)', () => {
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

      // 2 distinct Apps (SHOP, DHL) → App-Launcher, nicht direkt in eine App.
      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
    });
  });

  describe('MANAGED-User mit ausschließlich MARITIME (Faktortest: 2. Consumer)', () => {
    it('leitet direkt auf die app-zentrische MARITIME-Startseite (GLOBAL-Scope, kein storeId)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.MARITIME, storeId: null, enabled: true }]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/maritime');
    });

    it('erlaubt sowohl die neue app-zentrische Route als auch die Legacy-Route /tools/maritime', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.MARITIME, storeId: null, enabled: true }]
        })
      );

      expect(service.isUrlAllowed('/apps/maritime')).toBeTrue();
      expect(service.isUrlAllowed('/apps/maritime/account')).toBeTrue();
      expect(service.isUrlAllowed('/tools/maritime')).toBeTrue();
    });
  });

  describe('MANAGED-User mit DHL + MARITIME', () => {
    it('leitet auf den App-Launcher (2 distinct Apps), beide Apps sind verfügbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.DHL, storeId: 121, enabled: true },
            { app: AppKey.MARITIME, storeId: null, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.DHL, AppKey.MARITIME]));
      expect(service.getAvailableApps().length).toBe(2);
    });

    it('resolveAppEntryUrl(MARITIME) führt direkt auf /apps/maritime (Klick auf die Launcher-Karte)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.DHL, storeId: 121, enabled: true },
            { app: AppKey.MARITIME, storeId: null, enabled: true }
          ]
        })
      );

      expect(service.resolveAppEntryUrl(AppKey.MARITIME)).toBe('/apps/maritime');
    });
  });

  describe('MANAGED-User: 0 verfügbare Apps', () => {
    it('leitet auf die sichere No-Access-Seite', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({ appAccessMode: AppAccessMode.MANAGED, apps: [] })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/no-access');
    });

    it('leitet auch bei ausschließlich deaktivierten Entitlements auf die No-Access-Seite', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.DHL, storeId: 121, enabled: false }]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/no-access');
      expect(service.isUrlAllowed('/apps/dhl/121')).toBeFalse();
    });
  });

  describe('MANAGED-User: genau 1 App mit mehreren Contexts (Stores)', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.DHL, storeId: 121, enabled: true },
            { app: AppKey.DHL, storeId: 135, enabled: true }
          ]
        })
      );
    });

    it('springt NICHT direkt in einen zufälligen Context, sondern öffnet die App-Context-Auswahl', () => {
      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/dhl');
    });

    it('erlaubt die bare App-Route (Context-Auswahl) und beide konkreten Contexts', () => {
      expect(service.isUrlAllowed('/apps/dhl')).toBeTrue();
      expect(service.isUrlAllowed('/apps/dhl/121')).toBeTrue();
      expect(service.isUrlAllowed('/apps/dhl/135')).toBeTrue();
    });
  });

  describe('MANAGED-User mit ausschließlich LOYALTY/Store 121 (Faktortest: 2. STORE-scoped Consumer)', () => {
    it('leitet direkt auf die app-zentrische LOYALTY-Startseite (nicht die Shop-/Legacy-Route)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.LOYALTY, storeId: 121, enabled: true }]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/loyalty/121');
    });

    it('erlaubt die neue app-zentrische LOYALTY-Route sowie den Legacy-Alias /stores/121/loyalty', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.LOYALTY, storeId: 121, enabled: true }]
        })
      );

      expect(service.isUrlAllowed('/apps/loyalty/121')).toBeTrue();
      expect(service.isUrlAllowed('/stores/121/loyalty')).toBeTrue();
    });

    it('blockiert LOYALTY für einen anderen Store (weder app-zentrisch noch Legacy)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.LOYALTY, storeId: 121, enabled: true }]
        })
      );

      expect(service.isUrlAllowed('/apps/loyalty/999')).toBeFalse();
      expect(service.isUrlAllowed('/stores/999/loyalty')).toBeFalse();
    });
  });

  describe('MANAGED-User: LOYALTY mit mehreren Contexts (Stores 121 + 122)', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.LOYALTY, storeId: 121, enabled: true },
            { app: AppKey.LOYALTY, storeId: 122, enabled: true }
          ]
        })
      );
    });

    it('springt NICHT direkt in einen zufälligen Context, sondern öffnet die generische Context-Auswahl (/apps/loyalty)', () => {
      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/loyalty');
    });

    it('erlaubt die bare App-Route (Context-Auswahl) und beide konkreten Contexts', () => {
      expect(service.isUrlAllowed('/apps/loyalty')).toBeTrue();
      expect(service.isUrlAllowed('/apps/loyalty/121')).toBeTrue();
      expect(service.isUrlAllowed('/apps/loyalty/122')).toBeTrue();
    });
  });

  describe('MANAGED-User mit DHL + LOYALTY (zwei STORE-scoped Apps gleichzeitig)', () => {
    it('leitet auf den App-Launcher (/apps) – beide Apps sind sichtbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.DHL, storeId: 121, enabled: true },
            { app: AppKey.LOYALTY, storeId: 121, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.DHL, AppKey.LOYALTY]));
      expect(service.getAvailableApps().length).toBe(2);
    });
  });

  describe('MANAGED-User mit MARITIME + LOYALTY (GLOBAL + STORE-scoped gleichzeitig)', () => {
    it('leitet auf den App-Launcher (/apps) – beide Apps sind sichtbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.MARITIME, storeId: null, enabled: true },
            { app: AppKey.LOYALTY, storeId: 121, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.MARITIME, AppKey.LOYALTY]));
      expect(service.getAvailableApps().length).toBe(2);
    });
  });

  describe('MANAGED-User mit ausschließlich SHOP/Store 121 (SHOP Factory Phase 1: 3. STORE-scoped Consumer)', () => {
    it('leitet direkt auf die app-zentrische SHOP-Startseite (/apps/shop/121)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.SHOP, storeId: 121, enabled: true }]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/shop/121');
    });

    it('erlaubt die neue app-zentrische SHOP-Route sowie den bestehenden Legacy-Store-Admin (/stores/121/...)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.SHOP, storeId: 121, enabled: true }]
        })
      );

      expect(service.isUrlAllowed('/apps/shop/121')).toBeTrue();
      expect(service.isUrlAllowed('/stores/121')).toBeTrue();
      expect(service.isUrlAllowed('/stores/121/products')).toBeTrue();
    });

    it('blockiert SHOP für einen anderen Store (weder app-zentrisch noch Legacy)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [{ app: AppKey.SHOP, storeId: 121, enabled: true }]
        })
      );

      expect(service.isUrlAllowed('/apps/shop/999')).toBeFalse();
      expect(service.isUrlAllowed('/stores/999')).toBeFalse();
    });
  });

  describe('MANAGED-User: SHOP mit mehreren Contexts (Stores 121 + 122)', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.SHOP, storeId: 121, enabled: true },
            { app: AppKey.SHOP, storeId: 122, enabled: true }
          ]
        })
      );
    });

    it('springt NICHT direkt in einen zufälligen Context, sondern öffnet die generische Context-Auswahl (/apps/shop)', () => {
      expect(service.getPrimaryAppHomeUrl()).toBe('/apps/shop');
    });

    it('erlaubt die bare App-Route (Context-Auswahl) und beide konkreten Contexts', () => {
      expect(service.isUrlAllowed('/apps/shop')).toBeTrue();
      expect(service.isUrlAllowed('/apps/shop/121')).toBeTrue();
      expect(service.isUrlAllowed('/apps/shop/122')).toBeTrue();
    });
  });

  describe('MANAGED-User mit SHOP + DHL (zwei STORE-scoped Apps gleichzeitig)', () => {
    it('leitet auf den App-Launcher (/apps) – beide Apps sind sichtbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.SHOP, storeId: 121, enabled: true },
            { app: AppKey.DHL, storeId: 121, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.SHOP, AppKey.DHL]));
      expect(service.getAvailableApps().length).toBe(2);
    });
  });

  describe('MANAGED-User mit SHOP + LOYALTY (zwei STORE-scoped Apps gleichzeitig)', () => {
    it('leitet auf den App-Launcher (/apps) – beide Apps sind sichtbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.SHOP, storeId: 121, enabled: true },
            { app: AppKey.LOYALTY, storeId: 121, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.SHOP, AppKey.LOYALTY]));
      expect(service.getAvailableApps().length).toBe(2);
    });
  });

  describe('MANAGED-User mit SHOP + MARITIME (STORE + GLOBAL gleichzeitig)', () => {
    it('leitet auf den App-Launcher (/apps) – beide Apps sind sichtbar', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({
          appAccessMode: AppAccessMode.MANAGED,
          apps: [
            { app: AppKey.SHOP, storeId: 121, enabled: true },
            { app: AppKey.MARITIME, storeId: null, enabled: true }
          ]
        })
      );

      expect(service.getPrimaryAppHomeUrl()).toBe('/apps');
      expect(service.getAvailableApps()).toEqual(jasmine.arrayContaining([AppKey.SHOP, AppKey.MARITIME]));
      expect(service.getAvailableApps().length).toBe(2);
    });
  });

  describe('LEGACY-User mit SHOP-Daten (unverändertes Verhalten)', () => {
    it('LEGACY-User bleibt von der SHOP-App-Klassifizierung unbeeinflusst (voller Zugriff, keine Entitlement-Prüfung)', () => {
      mockAuthService.getCurrentUser.and.returnValue(
        buildUser({ appAccessMode: AppAccessMode.LEGACY })
      );

      expect(service.isUrlAllowed('/stores/121')).toBeTrue();
      expect(service.isUrlAllowed('/stores/121/products')).toBeTrue();
      expect(service.isUrlAllowed('/apps/shop/121')).toBeTrue();
    });
  });
});

