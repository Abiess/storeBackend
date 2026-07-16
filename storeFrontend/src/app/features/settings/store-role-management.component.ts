import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RoleService } from '@app/core/services/role.service';
import { TeamInvitationService } from '@app/core/services/team-invitation.service';
import { StoreRole, UserRole, ROLE_PERMISSIONS_MAP, TeamInvitation, CreateTeamInvitationRequest } from '@app/core/models';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import {
  ResponsiveDataListComponent,
  ColumnConfig,
  ActionConfig
} from '@app/shared/components/responsive-data-list/responsive-data-list.component';

interface TeamMemberForm {
  userId: number | null;
  email: string;
  role: UserRole | string;
  permissions: string[];
}

@Component({
  selector: 'app-store-role-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    ResponsiveDataListComponent
  ],
  template: `
    <div class="role-page">
        <app-page-header
          title="Team & Rollen"
          subtitle="Verwalten Sie Teammitglieder und deren Berechtigungen für diesen Shop"
          [breadcrumbs]="breadcrumbs"
          [showBackButton]="true"
          [actions]="headerActions"
        ></app-page-header>

        <!-- Rollen-Übersicht Cards -->
        <div class="role-overview">
          @for (role of availableRoles; track role.key) {
            <div class="role-card" [class.active]="newMember.role === role.key">
              <div class="role-card-header">
                <span class="role-icon">{{ role.icon }}</span>
                <div>
                  <div class="role-name">{{ role.label }}</div>
                  <div class="role-count">{{ getMemberCount(role.key) }} Mitglied(er)</div>
                </div>
              </div>
              <div class="role-desc">{{ role.description }}</div>
              <div class="role-perms-count">{{ role.permCount }} Berechtigungen</div>
            </div>
          }
        </div>

        <!-- Team-Mitglieder Liste -->
        <div class="section">
          <div class="section-header">
            <h2>👥 Team-Mitglieder</h2>
            <button class="btn btn-primary btn-sm" (click)="showAddForm = !showAddForm">
              {{ showAddForm ? '✕ Abbrechen' : '+ Mitglied einladen' }}
            </button>
          </div>

          <!-- Einladeformular -->
          @if (showAddForm) {
            <div class="add-member-form">
              <h3>Neues Teammitglied hinzufügen</h3>
              <form (ngSubmit)="addMember()" #memberForm="ngForm">
                <div class="form-grid">
                  <div class="form-group">
                    <label>User-ID oder E-Mail</label>
                    <input
                      [(ngModel)]="newMember.email"
                      name="email"
                      type="text"
                      placeholder="user@email.com oder User-ID"
                      class="form-control"
                      required>
                  </div>
                  <div class="form-group">
                    <label>Rolle</label>
                    <select [(ngModel)]="newMember.role" name="role" class="form-control" required
                            (change)="onRoleChange()">
                      @for (role of availableRoles; track role.key) {
                        <option [value]="role.key">{{ role.label }}</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Berechtigungs-Vorschau -->
                <div class="permissions-preview" *ngIf="newMember.role">
                  <label>Berechtigungen für {{ getRoleLabel(newMember.role) }}:</label>
                  <div class="permission-tags">
                    @for (perm of getPermissionsForRole(newMember.role); track perm) {
                      <span class="perm-tag">{{ roleService.getPermissionLabel(perm) }}</span>
                    }
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary" [disabled]="!memberForm.valid || saving">
                    {{ saving ? 'Wird hinzugefügt...' : '✓ Hinzufügen' }}
                  </button>
                  <button type="button" class="btn btn-secondary" (click)="showAddForm = false">
                    Abbrechen
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Datentabelle -->
          <app-responsive-data-list
            [items]="teamMembers"
            [columns]="columns"
            [actions]="actions"
            [loading]="loading"
            searchPlaceholder="Mitglied suchen..."
            emptyIcon="👥"
            emptyMessage="Noch keine Teammitglieder"
          ></app-responsive-data-list>
        </div>

        <!-- Edit-Modal -->
        @if (editingMember) {
          <div class="modal-overlay" (click)="closeEdit()">
            <div class="modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Rolle bearbeiten</h3>
                <button class="modal-close" (click)="closeEdit()">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>User-ID</label>
                  <input class="form-control" [value]="editingMember.userId" readonly>
                </div>
                <div class="form-group">
                  <label>Rolle</label>
                  <select [(ngModel)]="editRole" class="form-control" (change)="onEditRoleChange()">
                    @for (role of availableRoles; track role.key) {
                      <option [value]="role.key">{{ role.label }}</option>
                    }
                  </select>
                </div>
                <div class="permissions-preview">
                  <label>Berechtigungen ({{ getPermissionsForRole(editRole).length }}):</label>
                  <div class="permission-tags">
                    @for (perm of getPermissionsForRole(editRole); track perm) {
                      <span class="perm-tag">{{ roleService.getPermissionLabel(perm) }}</span>
                    }
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving">
                  {{ saving ? 'Speichern...' : '✓ Speichern' }}
                </button>
                <button class="btn btn-secondary" (click)="closeEdit()">Abbrechen</button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Confirm Modal -->
        @if (deletingMember) {
          <div class="modal-overlay" (click)="cancelDelete()">
            <div class="modal modal--danger" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>⚠️ Mitglied entfernen</h3>
                <button class="modal-close" (click)="cancelDelete()">✕</button>
              </div>
              <div class="modal-body">
                <p>Soll <strong>User #{{ deletingMember.userId }}</strong> ({{ getRoleLabel(deletingMember.role) }})
                wirklich aus dem Team entfernt werden?</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="saving">
                  {{ saving ? 'Wird entfernt...' : '🗑 Entfernen' }}
                </button>
                <button class="btn btn-secondary" (click)="cancelDelete()">Abbrechen</button>
              </div>
            </div>
          </div>
        }

        <!-- Toast Notification -->
        @if (toast) {
          <div class="toast" [class.toast--success]="toast.type === 'success'" [class.toast--error]="toast.type === 'error'">
            {{ toast.message }}
          </div>
        }

        <!-- Offene Einladungen -->
        <div class="section" *ngIf="pendingInvitations.length > 0 || loading">
          <div class="section-header">
            <h2>📬 Offene Einladungen</h2>
          </div>

          <table class="invitations-table" *ngIf="!loading && pendingInvitations.length > 0" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">E-Mail</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Rolle</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Status</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Eingeladen am</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Läuft ab</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of pendingInvitations" style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">{{ inv.email }}</td>
                <td style="padding: 12px;">{{ getRoleLabel(inv.role) }}</td>
                <td style="padding: 12px;">
                  <span [ngClass]="{
                    'badge': true,
                    'badge-pending': inv.status === 'PENDING',
                    'badge-accepted': inv.status === 'ACCEPTED',
                    'badge-expired': inv.status === 'EXPIRED',
                    'badge-revoked': inv.status === 'REVOKED'
                  }" style="padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                    {{ inv.status }}
                  </span>
                </td>
                <td style="padding: 12px;">{{ inv.createdAt | date:'short' }}</td>
                <td style="padding: 12px;">{{ inv.expiresAt | date:'short' }}</td>
                <td style="padding: 12px;">
                  <button 
                    type="button"
                    class="btn btn-sm"
                    (click)="resendInvitation(inv.id)"
                    [disabled]="inv.status !== 'PENDING'"
                    *ngIf="inv.status === 'PENDING'"
                    style="margin-right: 8px; padding: 6px 12px; font-size: 0.875rem;">
                    🔄 Erneut
                  </button>
                  <button 
                    type="button"
                    class="btn btn-sm btn-danger"
                    (click)="revokeInvitation(inv.id)"
                    [disabled]="inv.status !== 'PENDING'"
                    *ngIf="inv.status === 'PENDING'"
                    style="padding: 6px 12px; font-size: 0.875rem;">
                    ✕ Widerrufen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
  `,
  styles: [`
    .role-page { padding: 2rem; max-width: 1200px; margin: 0 auto; min-height: 100vh; background: #f6f6f7; }

    /* Rollen-Übersicht */
    .role-overview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .role-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role-card:hover, .role-card.active {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102,126,234,0.15);
    }
    .role-card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .role-icon { font-size: 1.75rem; }
    .role-name { font-weight: 700; color: #1f2937; font-size: 0.9rem; }
    .role-count { font-size: 0.75rem; color: #667eea; font-weight: 600; }
    .role-desc { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem; line-height: 1.4; }
    .role-perms-count { font-size: 0.75rem; color: #9ca3af; }

    /* Section */
    .section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .section-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937; }

    /* Add Form */
    .add-member-form {
      background: #f8faff;
      border: 1px solid #e0e7ff;
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .add-member-form h3 { margin: 0 0 1rem; font-size: 1rem; color: #374151; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-weight: 600; font-size: 0.85rem; color: #374151; }
    .form-control {
      padding: 0.6rem 0.9rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: all 0.2s;
      background: white;
    }
    .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }

    /* Permission Preview */
    .permissions-preview { margin-bottom: 1rem; }
    .permissions-preview label { font-weight: 600; font-size: 0.8rem; color: #6b7280; display: block; margin-bottom: 0.5rem; }
    .permission-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .perm-tag {
      background: #ede9fe;
      color: #7c3aed;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    /* Buttons */
    .btn {
      padding: 0.6rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.3); }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover:not(:disabled) { background: #dc2626; }
    .btn-sm { padding: 0.4rem 0.9rem; font-size: 0.8rem; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: white;
      border-radius: 12px;
      width: 520px;
      max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal--danger .modal-header { border-bottom-color: #fee2e2; }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
    .modal-close {
      background: none; border: none; font-size: 1.25rem;
      cursor: pointer; color: #6b7280; padding: 0.25rem;
    }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .modal-body p { margin: 0; color: #374151; }
    .modal-footer {
      display: flex; gap: 0.75rem; justify-content: flex-end;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 2rem; right: 2rem;
      padding: 0.875rem 1.5rem;
      border-radius: 8px;
      font-weight: 600; font-size: 0.9rem;
      z-index: 9999;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toast--success { background: #10b981; color: white; }
    .toast--error { background: #ef4444; color: white; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    @media (max-width: 768px) {
      .role-page { padding: 1rem; }
      .form-grid { grid-template-columns: 1fr; }
      .role-overview { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class StoreRoleManagementComponent implements OnInit {
  storeId!: number;
  teamMembers: StoreRole[] = [];
  loading = false;
  saving = false;
  showAddForm = false;

  editingMember: StoreRole | null = null;
  editRole = '';
  deletingMember: StoreRole | null = null;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  
  pendingInvitations: TeamInvitation[] = [];

  newMember: TeamMemberForm = {
    userId: null,
    email: '',
    role: UserRole.STORE_STAFF,
    permissions: []
  };

  breadcrumbs: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  availableRoles = [
    {
      key: UserRole.STORE_OWNER,
      label: 'Shop-Besitzer',
      icon: '👑',
      description: 'Vollständige Kontrolle über den Shop',
      permCount: ROLE_PERMISSIONS_MAP[UserRole.STORE_OWNER].length
    },
    {
      key: UserRole.STORE_ADMIN,
      label: 'Shop-Admin',
      icon: '🛡️',
      description: 'Fast vollständige Verwaltungsrechte',
      permCount: ROLE_PERMISSIONS_MAP[UserRole.STORE_ADMIN].length
    },
    {
      key: UserRole.STORE_MANAGER,
      label: 'Shop-Manager',
      icon: '📋',
      description: 'Produkt- und Bestellverwaltung',
      permCount: ROLE_PERMISSIONS_MAP[UserRole.STORE_MANAGER].length
    },
    {
      key: UserRole.STORE_STAFF,
      label: 'Mitarbeiter',
      icon: '👤',
      description: 'Eingeschränkter täglicher Zugriff',
      permCount: ROLE_PERMISSIONS_MAP[UserRole.STORE_STAFF].length
    },
    {
      key: UserRole.STORE_EMPLOYEE,
      label: 'Angestellter',
      icon: '🔑',
      description: 'Basiszugriff auf Shop-Inhalte',
      permCount: ROLE_PERMISSIONS_MAP[UserRole.STORE_EMPLOYEE].length
    }
  ];

  columns: ColumnConfig[] = [
    {
      key: 'userId',
      label: 'User-ID',
      type: 'number',
      width: '80px'
    },
    {
      key: 'role',
      label: 'Rolle',
      type: 'badge',
      badgeClass: (value) => this.roleService.getRoleBadgeClass(value),
      formatFn: (value) => this.roleService.getRoleLabel(value)
    },
    {
      key: 'permissions',
      label: 'Berechtigungen',
      type: 'text',
      formatFn: (value: string[]) => `${value?.length ?? 0} Rechte`
    },
    {
      key: 'createdAt',
      label: 'Hinzugefügt',
      type: 'date',
      hideOnMobile: true
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (item: StoreRole) => this.openEdit(item)
    },
    {
      icon: '🗑️',
      label: 'Entfernen',
      class: 'danger',
      handler: (item: StoreRole) => this.openDelete(item)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public roleService: RoleService,
    private teamInvitationService: TeamInvitationService
  ) {}

  ngOnInit(): void {
    // StoreId 3-stufig extrahieren (Workspace-Standard)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }
    this.storeId = id ? +id : 0;

    this.breadcrumbs = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'Stores', route: '/dashboard', icon: '🏪' },
      { label: 'Team & Rollen', icon: '👥' }
    ];

    this.headerActions = [
      {
        label: '+ Mitglied einladen',
        onClick: () => { this.showAddForm = true; }
      }
    ];

    this.loadTeam();
    this.loadInvitations();
  }

  loadTeam(): void {
    this.loading = true;
    this.roleService.getStoreTeamRoles(this.storeId).subscribe({
      next: roles => {
        this.teamMembers = roles;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getMemberCount(roleKey: string): number {
    return this.teamMembers.filter(m => m.role === roleKey).length;
  }

  getRoleLabel(role: string): string {
    return this.roleService.getRoleLabel(role);
  }

  getPermissionsForRole(role: string): string[] {
    return (ROLE_PERMISSIONS_MAP[role as UserRole] ?? []) as string[];
  }

  onRoleChange(): void {
    this.newMember.permissions = this.getPermissionsForRole(this.newMember.role);
  }

  onEditRoleChange(): void {
    // Vorschau aktualisiert sich automatisch durch editRole-Binding
  }

  addMember(): void {
    if (!this.newMember.email || !this.newMember.role) {
      this.showToast('E-Mail und Rolle sind erforderlich', 'error');
      return;
    }
    
    if (this.newMember.role === UserRole.STORE_OWNER) {
      this.showToast('STORE_OWNER kann nicht über Einladung vergeben werden', 'error');
      return;
    }
    
    this.saving = true;
    
    const request: CreateTeamInvitationRequest = {
      email: this.newMember.email.trim().toLowerCase(),
      role: this.newMember.role
    };
    
    this.teamInvitationService.createInvitation(this.storeId!, request).subscribe({
      next: () => {
        this.showToast('Einladung erfolgreich versendet', 'success');
        this.newMember = { userId: null, email: '', role: UserRole.STORE_STAFF, permissions: [] };
        this.showAddForm = false;
        this.loadInvitations();
        this.saving = false;
      },
      error: (err) => {
        const errorMsg = err.error?.error || err.error?.message || 'Einladung fehlgeschlagen';
        this.showToast(errorMsg, 'error');
        this.saving = false;
      }
    });
  }
  
  loadInvitations(): void {
    if (!this.storeId) return;
    this.teamInvitationService.getInvitations(this.storeId).subscribe({
      next: (invitations) => {
        this.pendingInvitations = invitations;
      },
      error: (err) => {
        console.error('Failed to load invitations', err);
      }
    });
  }
  
  resendInvitation(id: number): void {
    this.teamInvitationService.resendInvitation(this.storeId!, id).subscribe({
      next: () => {
        this.showToast('Einladung erneut versendet', 'success');
        this.loadInvitations();
      },
      error: (err) => {
        this.showToast('Fehler beim Versenden', 'error');
      }
    });
  }
  
  revokeInvitation(id: number): void {
    if (!confirm('Einladung wirklich widerrufen?')) return;
    this.teamInvitationService.revokeInvitation(this.storeId!, id).subscribe({
      next: () => {
        this.showToast('Einladung widerrufen', 'success');
        this.loadInvitations();
      },
      error: (err) => {
        this.showToast('Fehler beim Widerrufen', 'error');
      }
    });
  }

  openEdit(member: StoreRole): void {
    this.editingMember = { ...member };
    this.editRole = member.role;
  }

  closeEdit(): void {
    this.editingMember = null;
    this.editRole = '';
  }

  saveEdit(): void {
    if (!this.editingMember) return;
    this.saving = true;

    // ✅ DEBUG: Detaillierte Fehleranalyse
    console.log('🔍 UPDATE Request:', {
      storeId: this.editingMember.storeId,
      userId: this.editingMember.userId,
      roleId: this.editingMember.id,
      newRole: this.editRole
    });

    const updated: StoreRole = {
      ...this.editingMember,
      role: this.editRole,
      permissions: this.getPermissionsForRole(this.editRole)
    };

    this.roleService.updateStoreRole(updated).subscribe({
      next: saved => {
        this.teamMembers = this.teamMembers.map(m => m.id === saved.id ? saved : m);
        this.closeEdit();
        this.saving = false;
        this.showToast('Rolle erfolgreich aktualisiert', 'success');
      },
      error: (err) => {
        console.error('❌ UPDATE FAILED:', {
          status: err.status,
          statusText: err.statusText,
          errorBody: err.error,
          requestPayload: updated,
          url: err.url
        });
        this.saving = false;
        this.showToast('Fehler beim Aktualisieren der Rolle: ' + (err.error?.message || err.statusText), 'error');
      }
    });
  }

  openDelete(member: StoreRole): void {
    this.deletingMember = member;
  }

  cancelDelete(): void {
    this.deletingMember = null;
  }

  confirmDelete(): void {
    if (!this.deletingMember) return;
    this.saving = true;

    this.roleService.removeStoreRole(this.deletingMember.storeId, this.deletingMember.userId).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(
          m => !(m.storeId === this.deletingMember!.storeId && m.userId === this.deletingMember!.userId)
        );
        this.deletingMember = null;
        this.saving = false;
        this.showToast('Mitglied erfolgreich entfernt', 'success');
      },
      error: () => {
        this.saving = false;
        this.showToast('Fehler beim Entfernen des Mitglieds', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => this.toast = null, 3500);
  }
}

