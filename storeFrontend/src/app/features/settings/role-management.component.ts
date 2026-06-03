import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '@app/core/services/role.service';
import { StoreRole, DomainRole, UserRole, ROLE_PERMISSIONS_MAP } from '@app/core/models';
import { AdminLayoutComponent } from '@app/shared/components/admin-layout/admin-layout.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import {
  ResponsiveDataListComponent,
  ColumnConfig,
  ActionConfig
} from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLayoutComponent, PageHeaderComponent, ResponsiveDataListComponent],
  template: `
    <app-admin-layout>
      <div class="role-management-container">
        <app-page-header
          [title]="'Rollen-Verwaltung'"
          [subtitle]="'Verwalten Sie Store- und Domain-Rollen für Benutzer'"
          [breadcrumbs]="breadcrumbItems"
          [showBackButton]="true"
          [actions]="headerActions"
        ></app-page-header>

        <div class="content">
          <!-- ===== SHOP-ROLLEN ===== -->
          <section class="section">
            <div class="section-header">
              <h2>🏪 Shop-Rollen</h2>
              <span class="badge">{{ storeRoles.length }}</span>
            </div>

            <app-responsive-data-list
              [items]="storeRoles"
              [columns]="storeColumns"
              [actions]="storeActions"
              [loading]="loadingStore"
              searchPlaceholder="Shop-Rolle suchen..."
              emptyIcon="🏪"
              emptyMessage="Noch keine Shop-Rollen definiert"
            ></app-responsive-data-list>

            <!-- Neue Shop-Rolle -->
            <div class="add-form">
              <h3>Neue Shop-Rolle hinzufügen</h3>
              <form (ngSubmit)="addStoreRole()" #storeForm="ngForm">
                <div class="form-row">
                  <div class="form-group">
                    <label>Rolle</label>
                    <select [(ngModel)]="newStoreRole.role" name="role" class="form-control" required
                            (change)="onNewStoreRoleChange()">
                      @for (r of availableRoles; track r.key) {
                        <option [value]="r.key">{{ r.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Shop-ID</label>
                    <input [(ngModel)]="newStoreRole.storeId" name="storeId" type="number"
                           placeholder="z.B. 1" required class="form-control">
                  </div>
                  <div class="form-group">
                    <label>User-ID</label>
                    <input [(ngModel)]="newStoreRole.userId" name="userId" type="number"
                           placeholder="z.B. 5" required class="form-control">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary"
                        [disabled]="!storeForm.valid || savingStore">
                  {{ savingStore ? 'Wird hinzugefügt...' : '+ Hinzufügen' }}
                </button>
              </form>
            </div>
          </section>

          <!-- ===== DOMAIN-ROLLEN ===== -->
          <section class="section">
            <div class="section-header">
              <h2>🌐 Domain-Rollen</h2>
              <span class="badge">{{ domainRoles.length }}</span>
            </div>

            <app-responsive-data-list
              [items]="domainRoles"
              [columns]="domainColumns"
              [actions]="domainActions"
              [loading]="loadingDomain"
              searchPlaceholder="Domain-Rolle suchen..."
              emptyIcon="🌐"
              emptyMessage="Noch keine Domain-Rollen definiert"
            ></app-responsive-data-list>

            <!-- Neue Domain-Rolle -->
            <div class="add-form">
              <h3>Neue Domain-Rolle hinzufügen</h3>
              <form (ngSubmit)="addDomainRole()" #domainForm="ngForm">
                <div class="form-row">
                  <div class="form-group">
                    <label>Rolle</label>
                    <select [(ngModel)]="newDomainRole.role" name="domainRole" class="form-control" required>
                      @for (r of availableRoles; track r.key) {
                        <option [value]="r.key">{{ r.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Domain-ID</label>
                    <input [(ngModel)]="newDomainRole.domainId" name="domainId" type="number"
                           placeholder="z.B. 1" required class="form-control">
                  </div>
                  <div class="form-group">
                    <label>User-ID</label>
                    <input [(ngModel)]="newDomainRole.userId" name="domainUserId" type="number"
                           placeholder="z.B. 5" required class="form-control">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary"
                        [disabled]="!domainForm.valid || savingDomain">
                  {{ savingDomain ? 'Wird hinzugefügt...' : '+ Hinzufügen' }}
                </button>
              </form>
            </div>
          </section>
        </div>

        <!-- Edit Store Role Modal -->
        @if (editingStoreRole) {
          <div class="modal-overlay" (click)="cancelEditStore()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>✏️ Shop-Rolle bearbeiten</h3>
                <button class="modal-close" (click)="cancelEditStore()">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>Neue Rolle</label>
                  <select [(ngModel)]="editStoreRoleValue" class="form-control">
                    @for (r of availableRoles; track r.key) {
                      <option [value]="r.key">{{ r.label }}</option>
                    }
                  </select>
                </div>
                <div class="perm-preview">
                  <label>Berechtigungen ({{ getPermsForRole(editStoreRoleValue).length }})</label>
                  <div class="perm-tags">
                    @for (p of getPermsForRole(editStoreRoleValue); track p) {
                      <span class="perm-tag">{{ roleService.getPermissionLabel(p) }}</span>
                    }
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="saveStoreEdit()" [disabled]="savingStore">
                  {{ savingStore ? 'Speichern...' : '✓ Speichern' }}
                </button>
                <button class="btn btn-secondary" (click)="cancelEditStore()">Abbrechen</button>
              </div>
            </div>
          </div>
        }

        <!-- Edit Domain Role Modal -->
        @if (editingDomainRole) {
          <div class="modal-overlay" (click)="cancelEditDomain()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>✏️ Domain-Rolle bearbeiten</h3>
                <button class="modal-close" (click)="cancelEditDomain()">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>Neue Rolle</label>
                  <select [(ngModel)]="editDomainRoleValue" class="form-control">
                    @for (r of availableRoles; track r.key) {
                      <option [value]="r.key">{{ r.label }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="saveDomainEdit()" [disabled]="savingDomain">
                  {{ savingDomain ? 'Speichern...' : '✓ Speichern' }}
                </button>
                <button class="btn btn-secondary" (click)="cancelEditDomain()">Abbrechen</button>
              </div>
            </div>
          </div>
        }

        <!-- Toast -->
        @if (toast) {
          <div class="toast" [class.toast--success]="toast.type === 'success'" [class.toast--error]="toast.type === 'error'">
            {{ toast.message }}
          </div>
        }
      </div>
    </app-admin-layout>
  `,
  styles: [`
    .role-management-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .content { display: flex; flex-direction: column; gap: 2rem; }
    .section { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #e5e7eb; }
    .section-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #1f2937; }
    .badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 0.2rem 0.7rem; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }
    .add-form { border-top: 2px solid #e5e7eb; padding-top: 1.5rem; margin-top: 1.5rem; }
    .add-form h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; color: #374151; }
    .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-weight: 600; font-size: 0.8rem; color: #374151; }
    .form-control { padding: 0.6rem 0.9rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
    .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .btn { padding: 0.6rem 1.25rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.3); }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .perm-preview { margin-top: 1rem; }
    .perm-preview label { font-size: 0.8rem; font-weight: 600; color: #6b7280; display: block; margin-bottom: 0.5rem; }
    .perm-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .perm-tag { background: #ede9fe; color: #7c3aed; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 500; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 12px; width: 500px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .modal-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280; }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 1.25rem 1.5rem; border-top: 1px solid #e5e7eb; }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; z-index: 9999; animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .toast--success { background: #10b981; color: white; }
    .toast--error { background: #ef4444; color: white; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } .role-management-container { padding: 1rem; } }
  `]
})
export class RoleManagementComponent implements OnInit {
  storeRoles: StoreRole[] = [];
  domainRoles: DomainRole[] = [];
  loadingStore = false;
  loadingDomain = false;
  savingStore = false;
  savingDomain = false;

  editingStoreRole: StoreRole | null = null;
  editStoreRoleValue = '';
  editingDomainRole: DomainRole | null = null;
  editDomainRoleValue = '';

  toast: { message: string; type: 'success' | 'error' } | null = null;

  userId = 1;
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  newStoreRole = { role: UserRole.STORE_MANAGER, storeId: 0, userId: 0 };
  newDomainRole = { role: UserRole.STORE_ADMIN, domainId: 0, userId: 0 };

  availableRoles = [
    { key: UserRole.STORE_OWNER, label: '👑 Shop-Besitzer' },
    { key: UserRole.STORE_ADMIN, label: '🛡️ Shop-Admin' },
    { key: UserRole.STORE_MANAGER, label: '📋 Shop-Manager' },
    { key: UserRole.STORE_STAFF, label: '👤 Mitarbeiter' },
    { key: UserRole.STORE_EMPLOYEE, label: '🔑 Angestellter' },
    { key: UserRole.CUSTOMER, label: '🛒 Kunde' }
  ];

  storeColumns: ColumnConfig[] = [
    { key: 'userId', label: 'User-ID', type: 'number', width: '80px' },
    { key: 'storeId', label: 'Shop-ID', type: 'number', width: '80px' },
    {
      key: 'role', label: 'Rolle', type: 'badge',
      badgeClass: (v) => this.roleService.getRoleBadgeClass(v),
      formatFn: (v) => this.roleService.getRoleLabel(v)
    },
    {
      key: 'permissions', label: 'Berechtigungen', type: 'text',
      formatFn: (v: string[]) => `${v?.length ?? 0} Rechte`
    }
  ];

  domainColumns: ColumnConfig[] = [
    { key: 'userId', label: 'User-ID', type: 'number', width: '80px' },
    { key: 'domainId', label: 'Domain-ID', type: 'number', width: '80px' },
    {
      key: 'role', label: 'Rolle', type: 'badge',
      badgeClass: (v) => this.roleService.getRoleBadgeClass(v),
      formatFn: (v) => this.roleService.getRoleLabel(v)
    },
    {
      key: 'permissions', label: 'Berechtigungen', type: 'text',
      formatFn: (v: string[]) => `${v?.length ?? 0} Rechte`
    }
  ];

  storeActions: ActionConfig[] = [
    { icon: '✏️', label: 'Bearbeiten', handler: (item: StoreRole) => this.editStoreRole(item) },
    { icon: '🗑️', label: 'Löschen', class: 'danger', handler: (item: StoreRole) => this.deleteStoreRole(item) }
  ];

  domainActions: ActionConfig[] = [
    { icon: '✏️', label: 'Bearbeiten', handler: (item: DomainRole) => this.editDomainRole(item) },
    { icon: '🗑️', label: 'Löschen', class: 'danger', handler: (item: DomainRole) => this.deleteDomainRole(item) }
  ];

  constructor(public roleService: RoleService) {}

  ngOnInit(): void {
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'navigation.settings', route: '/settings', icon: '⚙️' },
      { label: 'Rollen-Verwaltung', icon: '👥' }
    ];
    this.loadData();
  }

  loadData(): void {
    this.loadingStore = true;
    this.roleService.getStoreRoles(this.userId).subscribe({
      next: roles => { this.storeRoles = roles; this.loadingStore = false; },
      error: () => this.loadingStore = false
    });

    this.loadingDomain = true;
    this.roleService.getDomainRoles(this.userId).subscribe({
      next: roles => { this.domainRoles = roles; this.loadingDomain = false; },
      error: () => this.loadingDomain = false
    });
  }

  getPermsForRole(role: string): string[] {
    return (ROLE_PERMISSIONS_MAP[role as UserRole] ?? []) as string[];
  }

  onNewStoreRoleChange(): void { /* auto-update via binding */ }

  addStoreRole(): void {
    this.savingStore = true;
    const perms = this.getPermsForRole(this.newStoreRole.role.toString());
    const role: StoreRole = {
      userId: this.newStoreRole.userId,
      storeId: this.newStoreRole.storeId,
      role: this.newStoreRole.role.toString(),
      permissions: perms
    };
    this.roleService.addStoreRole(role).subscribe({
      next: saved => {
        this.storeRoles = [...this.storeRoles, saved];
        this.newStoreRole = { role: UserRole.STORE_MANAGER, storeId: 0, userId: 0 };
        this.savingStore = false;
        this.showToast('Shop-Rolle hinzugefügt', 'success');
      },
      error: () => { this.savingStore = false; this.showToast('Fehler beim Hinzufügen', 'error'); }
    });
  }

  addDomainRole(): void {
    this.savingDomain = true;
    const perms = this.getPermsForRole(this.newDomainRole.role.toString());
    const role: DomainRole = {
      userId: this.newDomainRole.userId,
      domainId: this.newDomainRole.domainId,
      role: this.newDomainRole.role.toString(),
      permissions: perms
    };
    this.roleService.addDomainRole(role).subscribe({
      next: saved => {
        this.domainRoles = [...this.domainRoles, saved];
        this.newDomainRole = { role: UserRole.STORE_ADMIN, domainId: 0, userId: 0 };
        this.savingDomain = false;
        this.showToast('Domain-Rolle hinzugefügt', 'success');
      },
      error: () => { this.savingDomain = false; this.showToast('Fehler beim Hinzufügen', 'error'); }
    });
  }

  editStoreRole(role: StoreRole): void {
    this.editingStoreRole = { ...role };
    this.editStoreRoleValue = role.role;
  }

  cancelEditStore(): void {
    this.editingStoreRole = null;
    this.editStoreRoleValue = '';
  }

  saveStoreEdit(): void {
    if (!this.editingStoreRole) return;
    this.savingStore = true;
    const updated: StoreRole = {
      ...this.editingStoreRole,
      role: this.editStoreRoleValue,
      permissions: this.getPermsForRole(this.editStoreRoleValue)
    };
    this.roleService.updateStoreRole(updated).subscribe({
      next: saved => {
        this.storeRoles = this.storeRoles.map(r => r.id === saved.id ? saved : r);
        this.cancelEditStore();
        this.savingStore = false;
        this.showToast('Rolle aktualisiert', 'success');
      },
      error: () => { this.savingStore = false; this.showToast('Fehler beim Speichern', 'error'); }
    });
  }

  deleteStoreRole(role: StoreRole): void {
    if (!confirm(`User #${role.userId} aus Shop #${role.storeId} entfernen?`)) return;
    this.roleService.removeStoreRole(role.storeId, role.userId).subscribe({
      next: () => {
        this.storeRoles = this.storeRoles.filter(r => !(r.storeId === role.storeId && r.userId === role.userId));
        this.showToast('Rolle entfernt', 'success');
      },
      error: () => this.showToast('Fehler beim Löschen', 'error')
    });
  }

  editDomainRole(role: DomainRole): void {
    this.editingDomainRole = { ...role };
    this.editDomainRoleValue = role.role;
  }

  cancelEditDomain(): void {
    this.editingDomainRole = null;
    this.editDomainRoleValue = '';
  }

  saveDomainEdit(): void {
    if (!this.editingDomainRole) return;
    this.savingDomain = true;
    const updated: DomainRole = {
      ...this.editingDomainRole,
      role: this.editDomainRoleValue,
      permissions: this.getPermsForRole(this.editDomainRoleValue)
    };
    this.roleService.updateDomainRole(updated).subscribe({
      next: saved => {
        this.domainRoles = this.domainRoles.map(r =>
          r.userId === saved.userId && r.domainId === saved.domainId ? saved : r
        );
        this.cancelEditDomain();
        this.savingDomain = false;
        this.showToast('Domain-Rolle aktualisiert', 'success');
      },
      error: () => { this.savingDomain = false; this.showToast('Fehler beim Speichern', 'error'); }
    });
  }

  deleteDomainRole(role: DomainRole): void {
    if (!confirm(`User #${role.userId} aus Domain #${role.domainId} entfernen?`)) return;
    this.roleService.removeDomainRole(role.domainId, role.userId).subscribe({
      next: () => {
        this.domainRoles = this.domainRoles.filter(r => !(r.domainId === role.domainId && r.userId === role.userId));
        this.showToast('Domain-Rolle entfernt', 'success');
      },
      error: () => this.showToast('Fehler beim Löschen', 'error')
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => this.toast = null, 3500);
  }
}
