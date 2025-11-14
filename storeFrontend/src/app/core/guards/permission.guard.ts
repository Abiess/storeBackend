import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RoleService } from '../services/role.service';
import { Permission } from '../models';

/**
 * Permission Guard - Prüft ob der User eine bestimmte Berechtigung hat
 *
 * Verwendung in Routes:
 * {
 *   path: 'products/new',
 *   component: ProductFormComponent,
 *   canActivate: [permissionGuard],
 *   data: {
 *     requiredPermission: Permission.PRODUCT_CREATE,
 *     storeId: 1 // oder dynamisch aus Route
 *   }
 * }
 */
export const permissionGuard: CanActivateFn = (route, state) => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  const requiredPermission = route.data['requiredPermission'] as Permission;
  const storeId = route.params['storeId'] || route.data['storeId'];
  const userId = 1; // TODO: Aus AuthService holen

  if (!requiredPermission || !storeId) {
    console.error('Permission Guard: requiredPermission und storeId müssen angegeben werden');
    router.navigate(['/dashboard']);
    return false;
  }

  return roleService.hasPermission(userId, storeId, requiredPermission).pipe(
    map(hasPermission => {
      if (!hasPermission) {
        console.warn(`User ${userId} hat keine Berechtigung: ${requiredPermission}`);
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};

/**
 * Multiple Permissions Guard - Prüft ob der User mehrere Berechtigungen hat
 *
 * Verwendung in Routes:
 * {
 *   path: 'settings',
 *   component: SettingsComponent,
 *   canActivate: [multiplePermissionsGuard],
 *   data: {
 *     requiredPermissions: [Permission.STORE_READ, Permission.STORE_UPDATE],
 *     storeId: 1
 *   }
 * }
 */
export const multiplePermissionsGuard: CanActivateFn = (route, state) => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  const requiredPermissions = route.data['requiredPermissions'] as Permission[];
  const storeId = route.params['storeId'] || route.data['storeId'];
  const userId = 1; // TODO: Aus AuthService holen

  if (!requiredPermissions || !storeId) {
    console.error('Multiple Permissions Guard: requiredPermissions und storeId müssen angegeben werden');
    router.navigate(['/dashboard']);
    return false;
  }

  return roleService.hasPermissions(userId, storeId, requiredPermissions).pipe(
    map(hasPermissions => {
      if (!hasPermissions) {
        console.warn(`User ${userId} hat nicht alle erforderlichen Berechtigungen`);
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};

/**
 * Domain Access Guard - Prüft ob der User Zugriff auf eine Domain hat
 */
export const domainAccessGuard: CanActivateFn = (route, state) => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  const domainId = route.params['domainId'] || route.data['domainId'];
  const userId = 1; // TODO: Aus AuthService holen
  const requireManage = route.data['requireManage'] || false;

  if (!domainId) {
    console.error('Domain Access Guard: domainId muss angegeben werden');
    router.navigate(['/dashboard']);
    return false;
  }

  const checkFn = requireManage
    ? roleService.canManageDomain(userId, domainId)
    : roleService.getUserDomainAccess(userId, domainId).pipe(map(access => !!access));

  return checkFn.pipe(
    map(hasAccess => {
      if (!hasAccess) {
        console.warn(`User ${userId} hat keinen Zugriff auf Domain ${domainId}`);
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};

