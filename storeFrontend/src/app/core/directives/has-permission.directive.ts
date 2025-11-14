import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { RoleService } from '../services/role.service';
import { Permission } from '../models';

/**
 * Direktive zum Anzeigen von Elementen basierend auf Berechtigungen
 *
 * Verwendung im Template:
 * <button *hasPermission="Permission.PRODUCT_CREATE; storeId: 1">
 *   Produkt erstellen
 * </button>
 *
 * Oder mit mehreren Berechtigungen:
 * <div *hasPermission="[Permission.STORE_READ, Permission.STORE_UPDATE]; storeId: 1">
 *   Einstellungen bearbeiten
 * </div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permission: Permission | Permission[] | null = null;
  private storeId: number | null = null;
  private userId: number = 1; // TODO: Aus AuthService holen
  private destroy$ = new Subject<void>();

  @Input() set hasPermission(permission: Permission | Permission[]) {
    this.permission = permission;
    this.updateView();
  }

  @Input() set hasPermissionStoreId(storeId: number) {
    this.storeId = storeId;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (!this.permission || !this.storeId) {
      return;
    }

    // Array von Berechtigungen
    if (Array.isArray(this.permission)) {
      this.roleService.hasPermissions(this.userId, this.storeId, this.permission)
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.viewContainer.clear();
          if (hasPermission) {
            this.viewContainer.createEmbeddedView(this.templateRef);
          }
        });
    }
    // Einzelne Berechtigung
    else {
      this.roleService.hasPermission(this.userId, this.storeId, this.permission)
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.viewContainer.clear();
          if (hasPermission) {
            this.viewContainer.createEmbeddedView(this.templateRef);
          }
        });
    }
  }
}

