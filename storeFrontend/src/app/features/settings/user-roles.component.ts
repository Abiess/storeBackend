import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/core/services/auth.service';
import { RoleService } from '@app/core/services/role.service';
import { User, UserRole, Permission, StoreRole } from '@app/core/models';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-roles-section">
      <div class="info-card">
        <h3>👤 Benutzerinformationen</h3>
        <div class="user-info" *ngIf="currentUser">
          <div class="info-row">
            <span class="label">ID:</span>
            <span class="value">{{ currentUser.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">{{ currentUser.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">E-Mail:</span>
            <span class="value">{{ currentUser.email }}</span>
          </div>
          <div class="info-row">
            <span class="label">Hauptrolle:</span>
            <span class="value">
              <span class="role-badge" *ngFor="let role of currentUser.roles" [ngClass]="'role-' + role.toLowerCase()">
                {{ getRoleLabel(role) }}
              </span>
            </span>
          </div>
        </div>
        <div *ngIf="!currentUser" class="no-data">
          <p>Keine Benutzerinformationen verfügbar</p>
        </div>
      </div>

      <div class="info-card">
        <h3>🏪 Shop-Rollen</h3>
        <div *ngIf="storeRoles.length > 0">
          <div class="roles-list">
            <div *ngFor="let storeRole of storeRoles" class="role-item">
              <div class="role-header">
                <span class="role-badge" [ngClass]="'role-' + storeRole.role.toLowerCase()">
                  {{ getRoleLabel(storeRole.role) }}
                </span>
                <span class="store-id">Shop ID: {{ storeRole.storeId }}</span>
              </div>
              <div class="permissions-section">
                <h4>Berechtigungen ({{ storeRole.permissions.length }})</h4>
                <div class="permissions-grid">
                  <span *ngFor="let permission of storeRole.permissions.slice(0, 8)"
                        class="permission-badge">
                    {{ getPermissionLabel(permission) }}
                  </span>
                  <span *ngIf="storeRole.permissions.length > 8" class="permission-badge more">
                    +{{ storeRole.permissions.length - 8 }} weitere
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div *ngIf="storeRoles.length === 0 && !loading" class="no-data">
          <p>Keine Shop-Rollen zugewiesen</p>
        </div>
      </div>

      <div class="info-card">
        <h3>📋 Verfügbare Rollen</h3>
        <div class="role-descriptions">
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-super_admin">SUPER ADMIN</span>
              <span class="permission-count">~20 Berechtigungen</span>
            </div>
            <p>Vollständiger Zugriff auf alle Funktionen und Einstellungen der Plattform.</p>
          </div>
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-store_owner">SHOP-BESITZER</span>
              <span class="permission-count">~18 Berechtigungen</span>
            </div>
            <p>Besitzer eines Shops mit allen Verwaltungsrechten für den eigenen Shop.</p>
          </div>
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-store_admin">SHOP-ADMIN</span>
              <span class="permission-count">~15 Berechtigungen</span>
            </div>
            <p>Administrator eines Shops mit erweiterten Verwaltungsrechten.</p>
          </div>
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-store_manager">SHOP-MANAGER</span>
              <span class="permission-count">~10 Berechtigungen</span>
            </div>
            <p>Manager eines Shops mit Rechten für Produkte, Bestellungen und Kategorien.</p>
          </div>
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-store_staff">MITARBEITER</span>
              <span class="permission-count">~5 Berechtigungen</span>
            </div>
            <p>Mitarbeiter mit eingeschränkten Rechten für tägliche Aufgaben.</p>
          </div>
          <div class="role-desc-item">
            <div class="role-desc-header">
              <span class="role-badge role-customer">KUNDE</span>
              <span class="permission-count">~2 Berechtigungen</span>
            </div>
            <p>Standardkunde mit Rechten zum Einkaufen und Bestellungen verwalten.</p>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Lade Benutzerinformationen...</p>
      </div>
    </div>
  `,
  styles: [`
    .user-roles-section { display: flex; flex-direction: column; gap: 24px; }
    .info-card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }
    .info-card h3 { margin: 0 0 20px 0; color: #333; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .user-info { display: flex; flex-direction: column; gap: 16px; }
    .info-row { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; }
    .info-row .label { font-weight: 600; color: #666; }
    .info-row .value { color: #333; display: flex; gap: 8px; flex-wrap: wrap; }
    .role-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .role-super_admin { background: #dc3545; color: white; }
    .role-store_owner { background: #667eea; color: white; }
    .role-store_admin { background: #764ba2; color: white; }
    .role-store_manager { background: #28a745; color: white; }
    .role-store_staff { background: #ffc107; color: #333; }
    .role-customer { background: #6c757d; color: white; }
    .roles-list { display: flex; flex-direction: column; gap: 16px; }
    .role-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; background: #f8f9fa; }
    .role-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .store-id { font-size: 12px; color: #666; font-weight: 500; }
    .permissions-section h4 { margin: 0 0 12px 0; font-size: 14px; color: #666; }
    .permissions-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .permission-badge { background: #e3f2fd; color: #1976d2; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .permission-badge.more { background: #667eea; color: white; font-weight: 600; }
    .role-descriptions { display: flex; flex-direction: column; gap: 16px; }
    .role-desc-item { border-left: 4px solid #667eea; padding: 12px 16px; background: #f8f9fa; border-radius: 4px; }
    .role-desc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .permission-count { font-size: 12px; color: #666; font-weight: 500; }
    .role-desc-item p { margin: 0; color: #666; font-size: 14px; line-height: 1.5; }
    .no-data { text-align: center; padding: 40px 20px; color: #666; }
    .no-data p { margin: 0; font-size: 14px; }
    .loading { text-align: center; padding: 60px 20px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @media (max-width: 768px) { .info-row { grid-template-columns: 1fr; gap: 8px; } }
  `]
})
export class UserRolesComponent implements OnInit {
  currentUser: User | null = null;
  storeRoles: StoreRole[] = [];
  loading = false;

  constructor(
    private authService: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.loading = true;
    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.loadStoreRoles(user.id);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
        this.loading = false;
      }
    });
  }

  loadStoreRoles(userId: number): void {
    this.roleService.getStoreRoles(1).subscribe({
      next: (roles) => {
        this.storeRoles = roles.filter(r => r.userId === userId);
      },
      error: (error) => {
        console.error('Fehler beim Laden der Store-Rollen:', error);
      }
    });
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'STORE_OWNER': 'Shop-Besitzer',
      'STORE_ADMIN': 'Shop-Admin',
      'STORE_MANAGER': 'Shop-Manager',
      'STORE_STAFF': 'Mitarbeiter',
      'CUSTOMER': 'Kunde',
      'ROLE_SUPER_ADMIN': 'Super Admin',
      'ROLE_STORE_OWNER': 'Shop-Besitzer',
      'ROLE_ADMIN': 'Admin',
      'ROLE_USER': 'Benutzer'
    };
    return labels[role] || role;
  }

  getPermissionLabel(permission: string): string {
    return permission.replace(/_/g, ' ').toLowerCase();
  }
}
