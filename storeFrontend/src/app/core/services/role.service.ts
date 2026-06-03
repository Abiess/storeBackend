import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { StoreRole, DomainRole, Permission, UserRole, DomainAccess, ROLE_PERMISSIONS_MAP } from '../models';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly apiUrl = environment.apiUrl;

  // In-Memory State (wird mit API synchronisiert sobald Backend-Endpoints bereit)
  private storeRolesState: StoreRole[] = [
    {
      id: 1, userId: 1, storeId: 1,
      role: UserRole.STORE_OWNER,
      permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_OWNER],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 2, userId: 2, storeId: 1,
      role: UserRole.STORE_ADMIN,
      permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_ADMIN],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 3, userId: 3, storeId: 1,
      role: UserRole.STORE_MANAGER,
      permissions: ROLE_PERMISSIONS_MAP[UserRole.STORE_MANAGER],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }
  ];

  private domainAccessState: DomainAccess[] = [
    { id: 1, userId: 1, domainId: 1, role: UserRole.STORE_OWNER, canManage: true, canVerify: true, createdAt: new Date().toISOString() },
    { id: 2, userId: 2, domainId: 1, role: UserRole.STORE_ADMIN, canManage: true, canVerify: true, createdAt: new Date().toISOString() }
  ];

  private nextStoreRoleId = 10;
  private nextDomainAccessId = 10;

  // Reaktive Subjects für UI-Updates
  private storeRoles$ = new BehaviorSubject<StoreRole[]>(this.storeRolesState);
  private domainAccess$ = new BehaviorSubject<DomainAccess[]>(this.domainAccessState);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private get currentUserId(): number {
    return this.authService.getCurrentUser()?.id ?? 1;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // ── Store Rollen ──────────────────────────────────────────────────────────

  /** Alle Rollen für einen Store laden */
  getStoreRoles(storeIdOrUserId: number): Observable<StoreRole[]> {
    // Versuche Backend, Fallback auf State
    return this.http
      .get<StoreRole[]>(`${this.apiUrl}/stores/${storeIdOrUserId}/roles`, { headers: this.getAuthHeaders() })
      .pipe(
        tap(roles => {
          // Merge in State
          roles.forEach(r => {
            const idx = this.storeRolesState.findIndex(s => s.id === r.id);
            if (idx >= 0) this.storeRolesState[idx] = r;
            else this.storeRolesState.push(r);
          });
          this.storeRoles$.next([...this.storeRolesState]);
        }),
        catchError(() => of(this.storeRolesState.filter(r => r.storeId === storeIdOrUserId || r.userId === storeIdOrUserId)))
      );
  }

  /** Rollen eines Users für einen Store */
  getUserStoreRole(userId: number, storeId: number): Observable<StoreRole | null> {
    const role = this.storeRolesState.find(r => r.userId === userId && r.storeId === storeId);
    return of(role ?? null);
  }

  /** Alle Rollen für einen bestimmten Store (nach storeId gefiltert) */
  getStoreTeamRoles(storeId: number): Observable<StoreRole[]> {
    return this.http
      .get<StoreRole[]>(`${this.apiUrl}/stores/${storeId}/roles`, { headers: this.getAuthHeaders() })
      .pipe(
        tap(roles => {
          // State aktualisieren
          this.storeRolesState = [
            ...this.storeRolesState.filter(r => r.storeId !== storeId),
            ...roles
          ];
          this.storeRoles$.next([...this.storeRolesState]);
        }),
        catchError(() => of(this.storeRolesState.filter(r => r.storeId === storeId)))
      );
  }

  addStoreRole(role: StoreRole): Observable<StoreRole> {
    const newRole: StoreRole = {
      ...role,
      id: this.nextStoreRoleId++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.http
      .post<StoreRole>(`${this.apiUrl}/stores/${role.storeId}/roles`, role, { headers: this.getAuthHeaders() })
      .pipe(
        tap(saved => {
          this.storeRolesState.push(saved);
          this.storeRoles$.next([...this.storeRolesState]);
        }),
        catchError(() => {
          this.storeRolesState.push(newRole);
          this.storeRoles$.next([...this.storeRolesState]);
          return of(newRole);
        })
      );
  }

  updateStoreRole(role: StoreRole): Observable<StoreRole> {
    const updated = { ...role, updatedAt: new Date().toISOString() };
    return this.http
      .put<StoreRole>(`${this.apiUrl}/stores/${role.storeId}/roles/${role.id}`, role, { headers: this.getAuthHeaders() })
      .pipe(
        tap(saved => {
          const idx = this.storeRolesState.findIndex(r => r.id === saved.id);
          if (idx >= 0) this.storeRolesState[idx] = saved;
          this.storeRoles$.next([...this.storeRolesState]);
        }),
        catchError(() => {
          const idx = this.storeRolesState.findIndex(r => r.id === role.id);
          if (idx >= 0) this.storeRolesState[idx] = updated;
          this.storeRoles$.next([...this.storeRolesState]);
          return of(updated);
        })
      );
  }

  removeStoreRole(storeId: number, userId: number): Observable<boolean> {
    return this.http
      .delete(`${this.apiUrl}/stores/${storeId}/roles/${userId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map(() => true),
        tap(() => {
          this.storeRolesState = this.storeRolesState.filter(r => !(r.storeId === storeId && r.userId === userId));
          this.storeRoles$.next([...this.storeRolesState]);
        }),
        catchError(() => {
          this.storeRolesState = this.storeRolesState.filter(r => !(r.storeId === storeId && r.userId === userId));
          this.storeRoles$.next([...this.storeRolesState]);
          return of(true);
        })
      );
  }

  assignStoreRole(userId: number, storeId: number, role: UserRole): Observable<StoreRole> {
    const existing = this.storeRolesState.find(r => r.userId === userId && r.storeId === storeId);
    if (existing) {
      return this.updateStoreRole({
        ...existing,
        role: role.toString(),
        permissions: ROLE_PERMISSIONS_MAP[role]
      });
    }
    return this.addStoreRole({
      userId, storeId,
      role: role.toString(),
      permissions: ROLE_PERMISSIONS_MAP[role]
    });
  }

  // ── Domain Rollen ─────────────────────────────────────────────────────────

  getDomainRoles(_userId: number): Observable<DomainRole[]> {
    // Domain-Rollen aus Domain-Access-Daten ableiten
    return of(this.domainAccessState.map(a => ({
      userId: a.userId,
      domainId: a.domainId,
      role: a.role.toString(),
      permissions: a.canManage
        ? [Permission.DOMAIN_MANAGE, Permission.DOMAIN_READ, Permission.DOMAIN_VERIFY]
        : [Permission.DOMAIN_READ]
    })));
  }

  addDomainRole(role: DomainRole): Observable<DomainRole> {
    return of(role);
  }

  updateDomainRole(role: DomainRole): Observable<DomainRole> {
    return of(role);
  }

  removeDomainRole(_domainId: number, _userId: number): Observable<boolean> {
    return of(true);
  }

  // ── Domain-Zugriff ────────────────────────────────────────────────────────

  getDomainAccess(domainId: number): Observable<DomainAccess[]> {
    return of(this.domainAccessState.filter(a => a.domainId === domainId));
  }

  getUserDomainAccess(userId: number, domainId: number): Observable<DomainAccess | null> {
    return of(this.domainAccessState.find(a => a.userId === userId && a.domainId === domainId) ?? null);
  }

  grantDomainAccess(userId: number, domainId: number, role: UserRole, canManage = false, canVerify = false): Observable<DomainAccess> {
    const existing = this.domainAccessState.find(a => a.userId === userId && a.domainId === domainId);
    if (existing) {
      existing.role = role.toString();
      existing.canManage = canManage;
      existing.canVerify = canVerify;
      this.domainAccess$.next([...this.domainAccessState]);
      return of(existing);
    }
    const newAccess: DomainAccess = {
      id: this.nextDomainAccessId++,
      userId, domainId, role: role.toString(),
      canManage, canVerify,
      createdAt: new Date().toISOString()
    };
    this.domainAccessState.push(newAccess);
    this.domainAccess$.next([...this.domainAccessState]);
    return of(newAccess);
  }

  revokeDomainAccess(userId: number, domainId: number): Observable<void> {
    this.domainAccessState = this.domainAccessState.filter(a => !(a.userId === userId && a.domainId === domainId));
    this.domainAccess$.next([...this.domainAccessState]);
    return of(void 0);
  }

  canManageDomain(userId: number, domainId: number): Observable<boolean> {
    const access = this.domainAccessState.find(a => a.userId === userId && a.domainId === domainId);
    return of(access?.canManage ?? false);
  }

  canVerifyDomain(userId: number, domainId: number): Observable<boolean> {
    const access = this.domainAccessState.find(a => a.userId === userId && a.domainId === domainId);
    return of(access?.canVerify ?? false);
  }

  // ── Berechtigungen prüfen ─────────────────────────────────────────────────

  hasPermission(userId: number, storeId: number, permission: Permission): Observable<boolean> {
    const role = this.storeRolesState.find(r => r.userId === userId && r.storeId === storeId);
    return of(role?.permissions.includes(permission) ?? false);
  }

  hasPermissions(userId: number, storeId: number, permissions: Permission[]): Observable<boolean> {
    const role = this.storeRolesState.find(r => r.userId === userId && r.storeId === storeId);
    if (!role) return of(false);
    return of(permissions.every(p => role.permissions.includes(p)));
  }

  getUserPermissions(userId: number, storeId: number): Observable<Permission[]> {
    const role = this.storeRolesState.find(r => r.userId === userId && r.storeId === storeId);
    return of((role?.permissions ?? []) as Permission[]);
  }

  // ── Hilfsmethoden ─────────────────────────────────────────────────────────

  getAvailableRoles(): Observable<UserRole[]> {
    return of([
      UserRole.STORE_OWNER,
      UserRole.STORE_ADMIN,
      UserRole.STORE_MANAGER,
      UserRole.STORE_STAFF,
      UserRole.STORE_EMPLOYEE,
      UserRole.CUSTOMER
    ]);
  }

  getRolePermissions(role: UserRole): Observable<Permission[]> {
    return of(ROLE_PERMISSIONS_MAP[role] ?? []);
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'STORE_OWNER': 'Shop-Besitzer',
      'STORE_ADMIN': 'Shop-Admin',
      'STORE_MANAGER': 'Shop-Manager',
      'STORE_STAFF': 'Mitarbeiter',
      'STORE_EMPLOYEE': 'Angestellter',
      'CUSTOMER': 'Kunde',
    };
    return labels[role] ?? role;
  }

  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      'SUPER_ADMIN': 'status-active',
      'STORE_OWNER': 'status-active',
      'STORE_ADMIN': 'status-processing',
      'STORE_MANAGER': 'status-shipped',
      'STORE_STAFF': 'status-draft',
      'STORE_EMPLOYEE': 'status-draft',
      'CUSTOMER': 'status-inactive',
    };
    return classes[role] ?? 'status-draft';
  }

  getRoleDescription(role: UserRole | string): string {
    const descriptions: Record<string, string> = {
      'SUPER_ADMIN': 'Vollständiger Systemzugriff',
      'STORE_OWNER': 'Vollständige Kontrolle über den Shop',
      'STORE_ADMIN': 'Fast vollständige Shop-Verwaltung',
      'STORE_MANAGER': 'Produkt- und Bestellverwaltung',
      'STORE_STAFF': 'Eingeschränkter täglicher Zugriff',
      'STORE_EMPLOYEE': 'Basiszugriff auf Shop-Inhalte',
      'CUSTOMER': 'Nur Shop-Ansicht und eigene Bestellungen'
    };
    return descriptions[role.toString()] ?? '';
  }

  getPermissionLabel(permission: string): string {
    const labels: Record<string, string> = {
      'STORE_CREATE': 'Shop erstellen', 'STORE_READ': 'Shop ansehen',
      'STORE_UPDATE': 'Shop bearbeiten', 'STORE_DELETE': 'Shop löschen',
      'STORE_MANAGE': 'Shop verwalten', 'STORE_MANAGE_SETTINGS': 'Shop-Einstellungen',
      'DOMAIN_CREATE': 'Domain hinzufügen', 'DOMAIN_READ': 'Domain ansehen',
      'DOMAIN_UPDATE': 'Domain bearbeiten', 'DOMAIN_DELETE': 'Domain löschen',
      'DOMAIN_VERIFY': 'Domain verifizieren', 'DOMAIN_MANAGE': 'Domain verwalten',
      'PRODUCT_CREATE': 'Produkt erstellen', 'PRODUCT_READ': 'Produkt ansehen',
      'PRODUCT_EDIT': 'Produkt bearbeiten', 'PRODUCT_UPDATE': 'Produkt aktualisieren',
      'PRODUCT_DELETE': 'Produkt löschen', 'PRODUCT_VIEW': 'Produktansicht',
      'CATEGORY_CREATE': 'Kategorie erstellen', 'CATEGORY_READ': 'Kategorie ansehen',
      'CATEGORY_UPDATE': 'Kategorie bearbeiten', 'CATEGORY_DELETE': 'Kategorie löschen',
      'ORDER_CREATE': 'Bestellung erstellen', 'ORDER_READ': 'Bestellung ansehen',
      'ORDER_VIEW': 'Bestellungsansicht', 'ORDER_UPDATE': 'Bestellung bearbeiten',
      'ORDER_DELETE': 'Bestellung löschen', 'ORDER_MANAGE': 'Bestellungen verwalten',
      'STAFF_CREATE': 'Mitarbeiter hinzufügen', 'STAFF_READ': 'Mitarbeiter ansehen',
      'STAFF_UPDATE': 'Mitarbeiter bearbeiten', 'STAFF_DELETE': 'Mitarbeiter entfernen',
      'CUSTOMER_VIEW': 'Kunden ansehen', 'CUSTOMER_MANAGE': 'Kunden verwalten',
      'SETTINGS_VIEW': 'Einstellungen ansehen', 'SETTINGS_EDIT': 'Einstellungen bearbeiten',
      'REPORTS_VIEW': 'Berichte ansehen',
      'MEDIA_UPLOAD': 'Medien hochladen', 'MEDIA_READ': 'Medien ansehen', 'MEDIA_DELETE': 'Medien löschen'
    };
    return labels[permission] ?? permission.replace(/_/g, ' ').toLowerCase();
  }
}
