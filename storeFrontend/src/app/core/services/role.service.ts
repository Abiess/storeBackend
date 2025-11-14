import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { StoreRole, DomainRole, Permission, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  getStoreRoles(_userId: number): Observable<StoreRole[]> {
    return of([
      {
        userId: 1,
        storeId: 101,
        role: 'STORE_OWNER',
        permissions: ['EDIT_PRODUCTS', 'VIEW_ORDERS', 'MANAGE_USERS', 'EDIT_SETTINGS', 'VIEW_REPORTS', 'MANAGE_DISCOUNTS', 'VIEW_CUSTOMERS', 'EDIT_CATEGORIES', 'EXPORT_DATA', 'IMPORT_DATA']
      },
      {
        userId: 1,
        storeId: 102,
        role: 'STORE_MANAGER',
        permissions: ['EDIT_PRODUCTS', 'VIEW_ORDERS', 'VIEW_CUSTOMERS', 'EDIT_CATEGORIES']
      }
    ]);
  }

  getDomainRoles(_userId: number): Observable<DomainRole[]> {
    return of([
      {
        userId: 1,
        domainId: 201,
        role: 'DOMAIN_ADMIN',
        permissions: ['MANAGE_SHOPS', 'VIEW_DOMAINS', 'EDIT_DOMAIN_SETTINGS', 'MANAGE_USERS']
      },
      {
        userId: 1,
        domainId: 202,
        role: 'DOMAIN_USER',
        permissions: ['VIEW_DOMAINS']
      }
    ]);
  }

  addStoreRole(role: StoreRole): Observable<StoreRole> {
    // Mock: Rückgabe des hinzugefügten Roles
    return of(role);
  }

  updateStoreRole(role: StoreRole): Observable<StoreRole> {
    // Mock: Rückgabe des aktualisierten Roles
    return of(role);
  }

  removeStoreRole(_storeId: number, _userId: number): Observable<boolean> {
    // Mock: Rückgabe true bei Erfolg
    return of(true);
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

  hasPermission(_userId: number, _storeId: number, _permission: Permission): Observable<boolean> {
    // Mock: Prüft ob User eine bestimmte Berechtigung hat
    return of(true);
  }

  assignStoreRole(userId: number, storeId: number, role: UserRole): Observable<StoreRole> {
    // Mock: Weist einem User eine Store-Rolle zu
    const newRole: StoreRole = {
      userId,
      storeId,
      role: role.toString(),
      permissions: ['PRODUCT_VIEW', 'ORDER_VIEW']
    };
    return of(newRole);
  }

  canManageDomain(_userId: number, _domainId: number): Observable<boolean> {
    // Mock: Prüft ob User eine Domain verwalten kann
    return of(true);
  }
}
