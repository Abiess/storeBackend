import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '@app/core/services/role.service';
import { StoreRole, DomainRole } from '@app/core/models';
import { Observable } from 'rxjs';
import { AdminLayoutComponent } from '@app/shared/components/admin-layout/admin-layout.component';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLayoutComponent],
  template: `
    <app-admin-layout>
      <div class="role-management-container">
        <div class="header">
          <h1>👥 Rollen-Verwaltung</h1>
          <p class="subtitle">Verwalten Sie Store- und Domain-Rollen für Benutzer</p>
        </div>

        <div class="content">
          <!-- Shop-Rollen Section -->
          <section class="section">
            <div class="section-header">
              <h2>Shop-Rollen</h2>
              <span class="badge">{{ (storeRoles$ | async)?.length || 0 }}</span>
            </div>
            
            <div class="roles-list">
              <div *ngFor="let role of storeRoles$ | async" class="role-card">
                <div class="role-header">
                  <div class="role-info">
                    <h3>{{ role.role }}</h3>
                    <span class="role-meta">Shop-ID: {{ role.storeId }}</span>
                  </div>
                  <div class="role-actions">
                    <button class="btn btn-secondary btn-sm" (click)="editStoreRole(role)">
                      Bearbeiten
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteStoreRole(role)">
                      Löschen
                    </button>
                  </div>
                </div>
                <div class="role-permissions">
                  <span class="permission-label">Berechtigungen:</span>
                  <div class="permission-tags">
                    <span *ngFor="let perm of role.permissions" class="permission-tag">
                      {{ perm }}
                    </span>
                  </div>
                </div>
              </div>

              <div *ngIf="!(storeRoles$ | async)?.length" class="empty-state">
                <p>Noch keine Shop-Rollen definiert</p>
              </div>
            </div>

            <!-- Neue Shop-Rolle hinzufügen -->
            <div class="add-role-form">
              <h3>Neue Shop-Rolle hinzufügen</h3>
              <form (ngSubmit)="addStoreRole()" class="form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Rolle</label>
                    <input [(ngModel)]="newStoreRole.role" name="role" placeholder="z.B. STORE_MANAGER" required class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Shop-ID</label>
                    <input [(ngModel)]="newStoreRole.storeId" name="storeId" type="number" placeholder="1" required class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Berechtigungen (Komma getrennt)</label>
                  <input [(ngModel)]="newStoreRole.permissionsStr" name="permissions" placeholder="z.B. READ_PRODUCTS, EDIT_PRODUCTS" required class="form-control">
                </div>
                <button type="submit" class="btn btn-primary">Hinzufügen</button>
              </form>
            </div>
          </section>

          <!-- Domain-Rollen Section -->
          <section class="section">
            <div class="section-header">
              <h2>Domain-Rollen</h2>
              <span class="badge">{{ (domainRoles$ | async)?.length || 0 }}</span>
            </div>
            
            <div class="roles-list">
              <div *ngFor="let role of domainRoles$ | async" class="role-card">
                <div class="role-header">
                  <div class="role-info">
                    <h3>{{ role.role }}</h3>
                    <span class="role-meta">Domain-ID: {{ role.domainId }}</span>
                  </div>
                  <div class="role-actions">
                    <button class="btn btn-secondary btn-sm" (click)="editDomainRole(role)">
                      Bearbeiten
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteDomainRole(role)">
                      Löschen
                    </button>
                  </div>
                </div>
                <div class="role-permissions">
                  <span class="permission-label">Berechtigungen:</span>
                  <div class="permission-tags">
                    <span *ngFor="let perm of role.permissions" class="permission-tag">
                      {{ perm }}
                    </span>
                  </div>
                </div>
              </div>

              <div *ngIf="!(domainRoles$ | async)?.length" class="empty-state">
                <p>Noch keine Domain-Rollen definiert</p>
              </div>
            </div>

            <!-- Neue Domain-Rolle hinzufügen -->
            <div class="add-role-form">
              <h3>Neue Domain-Rolle hinzufügen</h3>
              <form (ngSubmit)="addDomainRole()" class="form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Rolle</label>
                    <input [(ngModel)]="newDomainRole.role" name="domainRole" placeholder="z.B. DOMAIN_ADMIN" required class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Domain-ID</label>
                    <input [(ngModel)]="newDomainRole.domainId" name="domainId" type="number" placeholder="1" required class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Berechtigungen (Komma getrennt)</label>
                  <input [(ngModel)]="newDomainRole.permissionsStr" name="domainPermissions" placeholder="z.B. MANAGE_DNS, EDIT_SETTINGS" required class="form-control">
                </div>
                <button type="submit" class="btn btn-primary">Hinzufügen</button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </app-admin-layout>
  `,
  styles: [`
    .role-management-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #1f2937;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .section-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      color: #1f2937;
    }

    .badge {
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .roles-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .role-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.2s;
    }

    .role-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .role-info h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
      color: #1f2937;
    }

    .role-meta {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .role-actions {
      display: flex;
      gap: 0.5rem;
    }

    .role-permissions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .permission-label {
      font-weight: 600;
      color: #4b5563;
      font-size: 0.875rem;
    }

    .permission-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .permission-tag {
      background: #f3f4f6;
      color: #374151;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      background: #f9fafb;
      border: 2px dashed #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
    }

    .add-role-form {
      border-top: 2px solid #e5e7eb;
      padding-top: 2rem;
    }

    .add-role-form h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1f2937;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .form-control {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9375rem;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .role-management-container {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .role-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .role-actions {
        width: 100%;
      }

      .role-actions button {
        flex: 1;
      }
    }
  `]
})
export class RoleManagementComponent {
  storeRoles$: Observable<StoreRole[]>;
  domainRoles$: Observable<DomainRole[]>;
  userId = 1;

  newStoreRole = { role: '', storeId: 0, permissionsStr: '' };
  newDomainRole = { role: '', domainId: 0, permissionsStr: '' };

  constructor(private roleService: RoleService) {
    this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
    this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
  }

  addStoreRole() {
    const permissions = this.newStoreRole.permissionsStr.split(',').map(p => p.trim());
    const role: StoreRole = {
      userId: this.userId,
      storeId: this.newStoreRole.storeId,
      role: this.newStoreRole.role,
      permissions
    };
    this.roleService.addStoreRole(role).subscribe(() => {
      this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
      this.newStoreRole = { role: '', storeId: 0, permissionsStr: '' };
    });
  }

  addDomainRole() {
    const permissions = this.newDomainRole.permissionsStr.split(',').map(p => p.trim());
    const role: DomainRole = {
      userId: this.userId,
      domainId: this.newDomainRole.domainId,
      role: this.newDomainRole.role,
      permissions
    };
    this.roleService.addDomainRole(role).subscribe(() => {
      this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
      this.newDomainRole = { role: '', domainId: 0, permissionsStr: '' };
    });
  }

  editStoreRole(role: StoreRole) {
    // Hier könnte ein Dialog/Feld zum Bearbeiten erscheinen
  }

  deleteStoreRole(role: StoreRole) {
    this.roleService.removeStoreRole(role.storeId, role.userId).subscribe(() => {
      this.storeRoles$ = this.roleService.getStoreRoles(this.userId);
    });
  }

  editDomainRole(role: DomainRole) {
  }

  deleteDomainRole(role: DomainRole) {
    this.roleService.removeDomainRole(role.domainId, role.userId).subscribe(() => {
      this.domainRoles$ = this.roleService.getDomainRoles(this.userId);
    });
  }
}
