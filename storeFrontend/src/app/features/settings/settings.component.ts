import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserRolesComponent } from './user-roles.component';
import { RoleManagementComponent } from './role-management.component';
import { AuditLogComponent } from './audit-log.component';
import { AuthService } from '@app/core/services/auth.service';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, UserRolesComponent, RoleManagementComponent, AuditLogComponent, PageHeaderComponent],
  template: `
    <div class="settings-container">
      <app-page-header
        [title]="'Einstellungen'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>
      
      <div class="settings-tabs">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'roles'"
          (click)="activeTab = 'roles'">
          👥 Benutzerrollen
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'permissions'"
          (click)="activeTab = 'permissions'">
          🔐 Berechtigungen
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'audit'"
          (click)="activeTab = 'audit'">
          📋 Änderungsprotokoll
        </button>
      </div>

      <div class="settings-content">
        <div *ngIf="activeTab === 'roles'" class="tab-content">
          <app-user-roles></app-user-roles>
        </div>

        <div *ngIf="activeTab === 'permissions'" class="tab-content">
          <app-role-management></app-role-management>
        </div>

        <div *ngIf="activeTab === 'audit'" class="tab-content">
          <app-audit-log [storeId]="currentStoreId"></app-audit-log>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 2rem;
      font-size: 2rem;
      color: #2c3e50;
    }

    .settings-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid #e9ecef;
      flex-wrap: wrap;
    }

    .tab-button {
      padding: 1rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-weight: 600;
      font-size: 1rem;
      color: #7f8c8d;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .tab-button:hover {
      color: #667eea;
      background: #f8f9fa;
    }

    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .settings-content {
      background: white;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .settings-container {
        padding: 1rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .settings-tabs {
        overflow-x: auto;
      }

      .tab-button {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: 'roles' | 'permissions' | 'audit' = 'roles';
  currentStoreId: number | null = null; // FIXED: Kann null sein, wenn keine Store-ID vorhanden ist
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Breadcrumbs initialisieren
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'Einstellungen', icon: '⚙️' }
    ];

    // Hole die aktuelle Store-ID aus dem Store-Context oder Route
    const storeId = this.route.snapshot.paramMap.get('storeId');
    if (storeId && !isNaN(Number(storeId))) {
      this.currentStoreId = Number(storeId);
    } else {
      // FIXED: Keine Store-ID verfügbar - AuditLog sollte nicht geladen werden
      this.currentStoreId = null;
      console.warn('⚠️ Keine gültige Store-ID in /settings Route. Audit-Log wird nicht geladen.');
    }
  }
}
