import { Observable, of, delay, throwError } from 'rxjs';
import {
  UserRole,
  Permission,
  StoreRole,
  DomainAccess,
  ROLE_PERMISSIONS_MAP
} from '../models';

// Mock-Daten für Store-Rollen
let mockStoreRoles: StoreRole[] = [
  {
    id: 1,
    userId: 1,
    storeId: 1,
    role: UserRole.STORE_OWNER,
    permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_OWNER],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 2,
    storeId: 1,
    role: UserRole.STORE_ADMIN,
    permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_ADMIN],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    userId: 3,
    storeId: 1,
    role: UserRole.STORE_MANAGER,
    permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_MANAGER],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    userId: 4,
    storeId: 2,
    role: UserRole.STORE_OWNER,
    permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_OWNER],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock-Daten für Domain-Zugriffe
let mockDomainAccess: DomainAccess[] = [
  {
    id: 1,
    userId: 1,
    domainId: 1,
    role: UserRole.STORE_OWNER,
    canManage: true,
    canVerify: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 2,
    domainId: 1,
    role: UserRole.STORE_ADMIN,
    canManage: true,
    canVerify: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    userId: 3,
    domainId: 1,
    role: UserRole.STORE_MANAGER,
    canManage: false,
    canVerify: false,
    createdAt: new Date().toISOString()
  }
];

let nextStoreRoleId = 5;
let nextDomainAccessId = 4;

export class MockRoleService {
  /**
   * Gibt alle Store-Rollen für einen bestimmten Store zurück
   */
  getStoreRoles(storeId: number): Observable<StoreRole[]> {
    const roles = mockStoreRoles.filter(r => r.storeId === storeId);
    return of(roles).pipe(delay(300));
  }

  /**
   * Gibt die Rolle eines Users für einen bestimmten Store zurück
   */
  getUserStoreRole(userId: number, storeId: number): Observable<StoreRole | null> {
    const role = mockStoreRoles.find(r => r.userId === userId && r.storeId === storeId);
    return of(role || null).pipe(delay(200));
  }

  /**
   * Weist einem User eine Rolle für einen Store zu
   */
  assignStoreRole(userId: number, storeId: number, role: UserRole): Observable<StoreRole> {
    // Prüfe ob bereits eine Rolle existiert
    const existingRole = mockStoreRoles.find(r => r.userId === userId && r.storeId === storeId);

    if (existingRole) {
      // Update existing role
      existingRole.role = role;
      existingRole.permissions = ROLE_PERMISSIONS_MAP[role];
      existingRole.updatedAt = new Date().toISOString();
      return of(existingRole).pipe(delay(300));
    }

    // Create new role
    const newRole: StoreRole = {
      id: nextStoreRoleId++,
      userId,
      storeId,
      role,
      permissions: ROLE_PERMISSIONS_MAP[role],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockStoreRoles.push(newRole);
    return of(newRole).pipe(delay(300));
  }

  /**
   * Entfernt die Rolle eines Users für einen Store
   */
  removeStoreRole(userId: number, storeId: number): Observable<void> {
    const index = mockStoreRoles.findIndex(r => r.userId === userId && r.storeId === storeId);

    if (index === -1) {
      return throwError(() => new Error('Rolle nicht gefunden'));
    }

    mockStoreRoles.splice(index, 1);
    return of(void 0).pipe(delay(200));
  }

  /**
   * Prüft ob ein User eine bestimmte Berechtigung für einen Store hat
   */
  hasPermission(userId: number, storeId: number, permission: Permission): Observable<boolean> {
    const role = mockStoreRoles.find(r => r.userId === userId && r.storeId === storeId);

    if (!role) {
      return of(false).pipe(delay(100));
    }

    const hasPermission = role.permissions.includes(permission);
    return of(hasPermission).pipe(delay(100));
  }

  /**
   * Prüft ob ein User mehrere Berechtigungen hat
   */
  hasPermissions(userId: number, storeId: number, permissions: Permission[]): Observable<boolean> {
    const role = mockStoreRoles.find(r => r.userId === userId && r.storeId === storeId);

    if (!role) {
      return of(false).pipe(delay(100));
    }

    const hasAllPermissions = permissions.every(p => role.permissions.includes(p));
    return of(hasAllPermissions).pipe(delay(100));
  }

  /**
   * Gibt alle Berechtigungen eines Users für einen Store zurück
   */
  getUserPermissions(userId: number, storeId: number): Observable<Permission[]> {
    const role = mockStoreRoles.find(r => r.userId === userId && r.storeId === storeId);

    if (!role) {
      return of([]).pipe(delay(100));
    }

    return of(role.permissions).pipe(delay(100));
  }

  /**
   * Domain-Zugriff: Gibt alle Domain-Zugriffe für eine Domain zurück
   */
  getDomainAccess(domainId: number): Observable<DomainAccess[]> {
    const access = mockDomainAccess.filter(a => a.domainId === domainId);
    return of(access).pipe(delay(300));
  }

  /**
   * Domain-Zugriff: Gibt den Domain-Zugriff eines Users zurück
   */
  getUserDomainAccess(userId: number, domainId: number): Observable<DomainAccess | null> {
    const access = mockDomainAccess.find(a => a.userId === userId && a.domainId === domainId);
    return of(access || null).pipe(delay(200));
  }

  /**
   * Domain-Zugriff: Gewährt einem User Zugriff auf eine Domain
   */
  grantDomainAccess(
    userId: number,
    domainId: number,
    role: UserRole,
    canManage: boolean = false,
    canVerify: boolean = false
  ): Observable<DomainAccess> {
    // Prüfe ob bereits Zugriff existiert
    const existingAccess = mockDomainAccess.find(a => a.userId === userId && a.domainId === domainId);

    if (existingAccess) {
      // Update existing access
      existingAccess.role = role;
      existingAccess.canManage = canManage;
      existingAccess.canVerify = canVerify;
      return of(existingAccess).pipe(delay(300));
    }

    // Create new access
    const newAccess: DomainAccess = {
      id: nextDomainAccessId++,
      userId,
      domainId,
      role,
      canManage,
      canVerify,
      createdAt: new Date().toISOString()
    };

    mockDomainAccess.push(newAccess);
    return of(newAccess).pipe(delay(300));
  }

  /**
   * Domain-Zugriff: Entzieht einem User den Zugriff auf eine Domain
   */
  revokeDomainAccess(userId: number, domainId: number): Observable<void> {
    const index = mockDomainAccess.findIndex(a => a.userId === userId && a.domainId === domainId);

    if (index === -1) {
      return throwError(() => new Error('Domain-Zugriff nicht gefunden'));
    }

    mockDomainAccess.splice(index, 1);
    return of(void 0).pipe(delay(200));
  }

  /**
   * Domain-Zugriff: Prüft ob ein User eine Domain verwalten kann
   */
  canManageDomain(userId: number, domainId: number): Observable<boolean> {
    const access = mockDomainAccess.find(a => a.userId === userId && a.domainId === domainId);
    return of(access?.canManage || false).pipe(delay(100));
  }

  /**
   * Domain-Zugriff: Prüft ob ein User eine Domain verifizieren kann
   */
  canVerifyDomain(userId: number, domainId: number): Observable<boolean> {
    const access = mockDomainAccess.find(a => a.userId === userId && a.domainId === domainId);
    return of(access?.canVerify || false).pipe(delay(100));
  }

  /**
   * Gibt alle verfügbaren Rollen zurück
   */
  getAvailableRoles(): Observable<UserRole[]> {
    return of([
      UserRole.SUPER_ADMIN,
      UserRole.STORE_OWNER,
      UserRole.STORE_ADMIN,
      UserRole.STORE_MANAGER,
      UserRole.STORE_STAFF,
      UserRole.CUSTOMER
    ]).pipe(delay(100));
  }

  /**
   * Gibt alle Berechtigungen einer Rolle zurück
   */
  getRolePermissions(role: UserRole): Observable<Permission[]> {
    return of(ROLE_PERMISSIONS_MAP[role] || []).pipe(delay(100));
  }

  /**
   * Beschreibung einer Rolle
   */
  getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'Super Administrator - Vollständiger Systemzugriff',
      [UserRole.STORE_OWNER]: 'Shop-Besitzer - Vollständige Kontrolle über den Shop',
      [UserRole.STORE_ADMIN]: 'Shop-Administrator - Fast vollständige Shop-Verwaltung',
      [UserRole.STORE_MANAGER]: 'Shop-Manager - Produkt- und Bestellverwaltung',
      [UserRole.STORE_STAFF]: 'Shop-Mitarbeiter - Eingeschränkter Zugriff',
      [UserRole.CUSTOMER]: 'Kunde - Nur Shop-Ansicht und Bestellungen'
    };
    return descriptions[role];
  }

  /**
   * Beschreibung einer Berechtigung
   */
  getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      [Permission.STORE_CREATE]: 'Shop erstellen',
      [Permission.STORE_READ]: 'Shop ansehen',
      [Permission.STORE_UPDATE]: 'Shop bearbeiten',
      [Permission.STORE_DELETE]: 'Shop löschen',
      [Permission.STORE_MANAGE_SETTINGS]: 'Shop-Einstellungen verwalten',
      [Permission.DOMAIN_CREATE]: 'Domain hinzufügen',
      [Permission.DOMAIN_READ]: 'Domain ansehen',
      [Permission.DOMAIN_UPDATE]: 'Domain bearbeiten',
      [Permission.DOMAIN_DELETE]: 'Domain löschen',
      [Permission.DOMAIN_VERIFY]: 'Domain verifizieren',
      [Permission.PRODUCT_CREATE]: 'Produkt erstellen',
      [Permission.PRODUCT_READ]: 'Produkt ansehen',
      [Permission.PRODUCT_UPDATE]: 'Produkt bearbeiten',
      [Permission.PRODUCT_DELETE]: 'Produkt löschen',
      [Permission.CATEGORY_CREATE]: 'Kategorie erstellen',
      [Permission.CATEGORY_READ]: 'Kategorie ansehen',
      [Permission.CATEGORY_UPDATE]: 'Kategorie bearbeiten',
      [Permission.CATEGORY_DELETE]: 'Kategorie löschen',
      [Permission.ORDER_CREATE]: 'Bestellung erstellen',
      [Permission.ORDER_READ]: 'Bestellung ansehen',
      [Permission.ORDER_UPDATE]: 'Bestellung bearbeiten',
      [Permission.ORDER_DELETE]: 'Bestellung löschen',
      [Permission.ORDER_MANAGE]: 'Bestellungen verwalten',
      [Permission.STAFF_CREATE]: 'Mitarbeiter hinzufügen',
      [Permission.STAFF_READ]: 'Mitarbeiter ansehen',
      [Permission.STAFF_UPDATE]: 'Mitarbeiter bearbeiten',
      [Permission.STAFF_DELETE]: 'Mitarbeiter entfernen',
      [Permission.MEDIA_UPLOAD]: 'Medien hochladen',
      [Permission.MEDIA_READ]: 'Medien ansehen',
      [Permission.MEDIA_DELETE]: 'Medien löschen'
    };
    return descriptions[permission];
  }
}

