# Rollen- und Berechtigungssystem für Shops und Domains

Dieses System ermöglicht eine granulare Kontrolle über Zugriffsrechte für Shops und Domains.

## 📋 Übersicht

### Verfügbare Rollen

| Rolle | Beschreibung | Berechtigungen |
|-------|--------------|----------------|
| **SUPER_ADMIN** | Super Administrator | Alle Berechtigungen im gesamten System |
| **STORE_OWNER** | Shop-Besitzer | Volle Kontrolle über eigenen Shop |
| **STORE_ADMIN** | Shop-Administrator | Fast alle Berechtigungen (kann Shop nicht löschen) |
| **STORE_MANAGER** | Shop-Manager | Produkt- und Bestellverwaltung |
| **STORE_STAFF** | Shop-Mitarbeiter | Lesen und Bestellungen bearbeiten |
| **CUSTOMER** | Kunde | Nur Shop-Ansicht und Bestellungen |

### Berechtigungskategorien

#### Shop-Berechtigungen
- `STORE_CREATE` - Shop erstellen
- `STORE_READ` - Shop ansehen
- `STORE_UPDATE` - Shop bearbeiten
- `STORE_DELETE` - Shop löschen
- `STORE_MANAGE_SETTINGS` - Shop-Einstellungen verwalten

#### Domain-Berechtigungen
- `DOMAIN_CREATE` - Domain hinzufügen
- `DOMAIN_READ` - Domain ansehen
- `DOMAIN_UPDATE` - Domain bearbeiten
- `DOMAIN_DELETE` - Domain löschen
- `DOMAIN_VERIFY` - Domain verifizieren

#### Produkt-Berechtigungen
- `PRODUCT_CREATE` - Produkt erstellen
- `PRODUCT_READ` - Produkt ansehen
- `PRODUCT_UPDATE` - Produkt bearbeiten
- `PRODUCT_DELETE` - Produkt löschen

#### Weitere Berechtigungen
- Kategorien (CREATE, READ, UPDATE, DELETE)
- Bestellungen (CREATE, READ, UPDATE, DELETE, MANAGE)
- Mitarbeiter (CREATE, READ, UPDATE, DELETE)
- Medien (UPLOAD, READ, DELETE)

## 🚀 Verwendung

### 1. Service in Komponente verwenden

```typescript
import { Component } from '@angular/core';
import { RoleService } from '@app/core/services/role.service';
import { UserRole, Permission } from '@app/core/models';

export class MyComponent {
  constructor(private roleService: RoleService) {}

  checkPermission() {
    const userId = 1;
    const storeId = 1;
    
    this.roleService.hasPermission(userId, storeId, Permission.PRODUCT_CREATE)
      .subscribe(hasPermission => {
        if (hasPermission) {
          console.log('User kann Produkte erstellen');
        }
      });
  }

  assignRole() {
    this.roleService.assignStoreRole(2, 1, UserRole.STORE_MANAGER)
      .subscribe(role => {
        console.log('Rolle zugewiesen:', role);
      });
  }
}
```

### 2. Permission Guard in Routes verwenden

```typescript
// app.routes.ts
import { permissionGuard } from '@app/core/guards/permission.guard';
import { Permission } from '@app/core/models';

export const routes: Routes = [
  {
    path: 'stores/:storeId/products/new',
    loadComponent: () => import('./product-form.component'),
    canActivate: [permissionGuard],
    data: { 
      requiredPermission: Permission.PRODUCT_CREATE
    }
  },
  {
    path: 'stores/:storeId/settings',
    loadComponent: () => import('./settings.component'),
    canActivate: [multiplePermissionsGuard],
    data: { 
      requiredPermissions: [
        Permission.STORE_READ,
        Permission.STORE_UPDATE
      ]
    }
  }
];
```

### 3. HasPermission Direktive im Template

```html
<!-- Einzelne Berechtigung -->
<button *hasPermission="Permission.PRODUCT_CREATE; storeId: 1">
  Neues Produkt erstellen
</button>

<!-- Mehrere Berechtigungen -->
<div *hasPermission="[Permission.STORE_READ, Permission.STORE_UPDATE]; storeId: storeId">
  <h2>Shop-Einstellungen</h2>
  <!-- Nur sichtbar wenn User beide Berechtigungen hat -->
</div>

<!-- Beispiel mit Template-Variable -->
<ng-container *hasPermission="Permission.DOMAIN_VERIFY; storeId: currentStore.id">
  <button (click)="verifyDomain()">Domain verifizieren</button>
</ng-container>
```

### 4. Domain-Zugriff verwalten

```typescript
// Domain-Zugriff gewähren
this.roleService.grantDomainAccess(
  userId,
  domainId,
  UserRole.STORE_ADMIN,
  true,  // canManage
  true   // canVerify
).subscribe(access => {
  console.log('Domain-Zugriff gewährt:', access);
});

// Prüfen ob User Domain verwalten kann
this.roleService.canManageDomain(userId, domainId)
  .subscribe(canManage => {
    if (canManage) {
      // Domain-Verwaltung anzeigen
    }
  });
```

## 📊 Mock-Daten

Das System enthält vordefinierte Mock-Daten:

### Store-Rollen
- User 1: STORE_OWNER für Store 1
- User 2: STORE_ADMIN für Store 1
- User 3: STORE_MANAGER für Store 1
- User 4: STORE_OWNER für Store 2

### Domain-Zugriffe
- User 1: STORE_OWNER für Domain 1 (kann verwalten & verifizieren)
- User 2: STORE_ADMIN für Domain 1 (kann verwalten & verifizieren)
- User 3: STORE_MANAGER für Domain 1 (nur lesen)

## 🎨 Rollenverwaltungs-UI

Eine vollständige UI-Komponente zur Rollenverwaltung ist verfügbar:

```typescript
// In app.routes.ts
{
  path: 'settings/roles',
  loadComponent: () => import('./role-management.component'),
  canActivate: [permissionGuard],
  data: { requiredPermission: Permission.STAFF_READ }
}
```

Die Komponente bietet:
- ✅ Übersicht aller Store-Rollen
- ✅ Übersicht aller Domain-Zugriffe
- ✅ Rollen zuweisen/entfernen
- ✅ Domain-Zugriffe gewähren/entziehen
- ✅ Rollen-Beschreibungen
- ✅ Berechtigungsübersicht

## 🔧 API-Methoden

### RoleService

#### Store-Rollen
```typescript
getStoreRoles(storeId: number): Observable<StoreRole[]>
getUserStoreRole(userId: number, storeId: number): Observable<StoreRole | null>
assignStoreRole(userId: number, storeId: number, role: UserRole): Observable<StoreRole>
removeStoreRole(userId: number, storeId: number): Observable<void>
```

#### Berechtigungsprüfung
```typescript
hasPermission(userId: number, storeId: number, permission: Permission): Observable<boolean>
hasPermissions(userId: number, storeId: number, permissions: Permission[]): Observable<boolean>
getUserPermissions(userId: number, storeId: number): Observable<Permission[]>
```

#### Domain-Zugriff
```typescript
getDomainAccess(domainId: number): Observable<DomainAccess[]>
getUserDomainAccess(userId: number, domainId: number): Observable<DomainAccess | null>
grantDomainAccess(userId, domainId, role, canManage, canVerify): Observable<DomainAccess>
revokeDomainAccess(userId: number, domainId: number): Observable<void>
canManageDomain(userId: number, domainId: number): Observable<boolean>
canVerifyDomain(userId: number, domainId: number): Observable<boolean>
```

#### Hilfsmethoden
```typescript
getAvailableRoles(): Observable<UserRole[]>
getRolePermissions(role: UserRole): Observable<Permission[]>
getRoleDescription(role: UserRole): string
getPermissionDescription(permission: Permission): string
```

## 🎯 Best Practices

1. **Immer Berechtigungen prüfen** vor kritischen Aktionen
2. **Guards verwenden** für Route-Protection
3. **Direktiven nutzen** für bedingte UI-Elemente
4. **Granulare Berechtigungen** statt nur Rollen prüfen
5. **Mock-Service verwenden** für Entwicklung und Tests

## 🔄 Mock-Modus aktivieren

Im `environment.ts`:
```typescript
export const environment = {
  production: false,
  useMockData: true,  // Mock-Daten aktivieren
  // ...
};
```

## 📝 Beispiel-Szenarios

### Szenario 1: Produkt nur für Manager+ erstellen
```typescript
<button 
  *hasPermission="Permission.PRODUCT_CREATE; storeId: storeId"
  (click)="createProduct()"
>
  Neues Produkt
</button>
```

### Szenario 2: Domain-Verifizierung nur für Owner/Admin
```typescript
if (await this.roleService.canVerifyDomain(userId, domainId).toPromise()) {
  this.verifyDomain();
}
```

### Szenario 3: Mitarbeiter-Liste nur für bestimmte Rollen
```typescript
<div *hasPermission="Permission.STAFF_READ; storeId: storeId">
  <app-staff-list></app-staff-list>
</div>
```

## 🚨 Fehlerbehebung

### "Permission denied" Fehler
- Überprüfen Sie die User-Rolle im Mock-Service
- Stellen Sie sicher, dass die storeId korrekt übergeben wird
- Prüfen Sie ROLE_PERMISSIONS_MAP für die korrekte Berechtigung

### Guards funktionieren nicht
- Stelle sicher, dass der Guard in den Routes korrekt konfiguriert ist
- Überprüfe die `data` Property in der Route-Konfiguration
- userId muss aus AuthService kommen (aktuell hardcoded als 1)

## 📚 Weitere Ressourcen

- [Angular Guards](https://angular.io/guide/router#preventing-unauthorized-access)
- [Structural Directives](https://angular.io/guide/structural-directives)
- [RxJS Operators](https://rxjs.dev/guide/operators)

