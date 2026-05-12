import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserRolesComponent } from './user-roles.component';
import { RoleManagementComponent } from './role-management.component';
import { AuditLogComponent } from './audit-log.component';
import { AuthService } from '@app/core/services/auth.service';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';

interface SettingsCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  route?: string;
  tab?: string;
  badge?: string;
  badgeClass?: string;
}

interface SettingsSection {
  title: string;
  icon: string;
  cards: SettingsCard[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, UserRolesComponent, RoleManagementComponent, AuditLogComponent, PageHeaderComponent],
  template: `
    <div class="settings-container">
      <app-page-header
        [title]="'settings.title'"
        [subtitle]="'settings.subtitle'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!--  OVERVIEW MODE – Kachel-Navigation                    -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div class="settings-overview" *ngIf="!activeTab">

        <!-- Benutzerkonto Quick-Info -->
        <div class="account-banner" *ngIf="userName">
          <div class="account-avatar">{{ userInitials }}</div>
          <div class="account-info">
            <h3>{{ userName }}</h3>
            <p>{{ userEmail }}</p>
          </div>
          <div class="account-role" *ngIf="userRole">
            <span class="role-pill">{{ userRole }}</span>
          </div>
        </div>

        <div class="sections-grid" *ngFor="let section of settingsSections">
          <h2 class="section-title">
            <span class="section-icon">{{ section.icon }}</span>
            {{ section.title }}
          </h2>
          <div class="cards-grid">
            <div
              *ngFor="let card of section.cards"
              class="settings-card"
              (click)="openCard(card)"
              tabindex="0"
              (keydown.enter)="openCard(card)"
              [attr.aria-label]="card.title">
              <div class="card-icon-wrapper">
                <span class="card-icon">{{ card.icon }}</span>
              </div>
              <div class="card-content">
                <h3>{{ card.title }}</h3>
                <p>{{ card.description }}</p>
              </div>
              <span *ngIf="card.badge" class="card-badge" [ngClass]="card.badgeClass || ''">
                {{ card.badge }}
              </span>
              <span class="card-chevron">›</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!--  DETAIL MODE – Eingebetteter Tab-Inhalt                -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div class="settings-detail" *ngIf="activeTab">
        <button class="back-to-overview" (click)="activeTab = null">
          ← Zurück zur Übersicht
        </button>

        <div class="detail-header">
          <span class="detail-icon">{{ getActiveIcon() }}</span>
          <h2>{{ getActiveTitle() }}</h2>
        </div>

        <div class="detail-content">
          <!-- Benutzerrollen -->
          <app-user-roles *ngIf="activeTab === 'roles'"></app-user-roles>

          <!-- Berechtigungen -->
          <app-role-management *ngIf="activeTab === 'permissions'"></app-role-management>

          <!-- Audit-Log -->
          <app-audit-log *ngIf="activeTab === 'audit'" [storeId]="currentStoreId"></app-audit-log>

          <!-- Profil – Platzhalter -->
          <div *ngIf="activeTab === 'profile'" class="placeholder-card">
            <div class="placeholder-icon">👤</div>
            <h3>Profil bearbeiten</h3>
            <p>Ändern Sie Ihren Namen, Ihre E-Mail-Adresse und Ihr Profilbild.</p>
            <div class="placeholder-form">
              <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-control" [value]="userName" readonly placeholder="Ihr Name" />
              </div>
              <div class="form-group">
                <label>E-Mail</label>
                <input type="email" class="form-control" [value]="userEmail" readonly placeholder="Ihre E-Mail" />
              </div>
              <p class="info-hint">✏️ Profilbearbeitung ist über die Kontoverwaltung möglich.</p>
            </div>
          </div>

          <!-- Sicherheit – Platzhalter -->
          <div *ngIf="activeTab === 'security'" class="placeholder-card">
            <div class="placeholder-icon">🔒</div>
            <h3>Sicherheit & Passwort</h3>
            <div class="security-options">
              <div class="security-item">
                <div class="security-item-info">
                  <h4>Passwort ändern</h4>
                  <p>Aktualisieren Sie Ihr Passwort regelmäßig für optimale Sicherheit.</p>
                </div>
                <button class="btn btn-outline">Ändern</button>
              </div>
              <div class="security-item">
                <div class="security-item-info">
                  <h4>Zwei-Faktor-Authentifizierung</h4>
                  <p>Schützen Sie Ihr Konto mit einer zusätzlichen Sicherheitsebene.</p>
                </div>
                <span class="status-badge status-inactive">Nicht aktiv</span>
              </div>
              <div class="security-item">
                <div class="security-item-info">
                  <h4>Aktive Sitzungen</h4>
                  <p>Verwalten Sie Geräte, auf denen Sie angemeldet sind.</p>
                </div>
                <span class="session-count">1 Gerät</span>
              </div>
            </div>
          </div>

          <!-- Benachrichtigungen – Platzhalter -->
          <div *ngIf="activeTab === 'notifications'" class="placeholder-card">
            <div class="placeholder-icon">🔔</div>
            <h3>Benachrichtigungseinstellungen</h3>
            <div class="notification-options">
              <div class="notification-item">
                <div class="notification-info">
                  <h4>Neue Bestellungen</h4>
                  <p>Erhalten Sie eine Nachricht bei jeder neuen Bestellung.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" checked disabled />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-item">
                <div class="notification-info">
                  <h4>Geringe Lagerbestände</h4>
                  <p>Warnung wenn ein Produkt unter den Mindestbestand fällt.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" checked disabled />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-item">
                <div class="notification-info">
                  <h4>Kundenbewertungen</h4>
                  <p>Benachrichtigung bei neuen Bewertungen.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" disabled />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-item">
                <div class="notification-info">
                  <h4>Marketing-Berichte</h4>
                  <p>Wöchentliche Zusammenfassung der Shop-Performance.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" disabled />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <p class="info-hint">💡 Diese Einstellungen werden bald vollständig konfigurierbar sein.</p>
          </div>

          <!-- Sprache & Region – Platzhalter -->
          <div *ngIf="activeTab === 'language'" class="placeholder-card">
            <div class="placeholder-icon">🌍</div>
            <h3>Sprache & Region</h3>
            <div class="language-options">
              <div class="language-option" [class.active]="true">
                <span class="lang-flag">🇩🇪</span>
                <span class="lang-name">Deutsch</span>
                <span class="lang-check" *ngIf="true">✓</span>
              </div>
              <div class="language-option">
                <span class="lang-flag">🇬🇧</span>
                <span class="lang-name">English</span>
              </div>
              <div class="language-option">
                <span class="lang-flag">🇸🇦</span>
                <span class="lang-name">العربية (RTL)</span>
              </div>
            </div>
            <div class="region-info">
              <h4>Zeitzone</h4>
              <p>Europe/Berlin (UTC+1)</p>
              <h4>Währung</h4>
              <p>EUR (€)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════════ */
    /*  Container & Layout                                    */
    /* ═══════════════════════════════════════════════════════ */
    .settings-container {
      padding: 1.5rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Account Banner                                        */
    /* ═══════════════════════════════════════════════════════ */
    .account-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      margin-bottom: 2rem;
      color: white;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }

    .account-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      flex-shrink: 0;
      backdrop-filter: blur(4px);
    }

    .account-info h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .account-info p {
      margin: 0.15rem 0 0;
      font-size: 0.85rem;
      opacity: 0.85;
    }

    .account-role {
      margin-left: auto;
    }

    .role-pill {
      background: rgba(255,255,255,0.2);
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Section Grid                                           */
    /* ═══════════════════════════════════════════════════════ */
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .section-icon {
      font-size: 1.1rem;
    }

    .sections-grid {
      margin-bottom: 2rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 0.875rem;
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Settings Cards                                         */
    /* ═══════════════════════════════════════════════════════ */
    .settings-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.125rem 1.25rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .settings-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.12);
      transform: translateY(-1px);
    }

    .settings-card:focus-visible {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    .card-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .settings-card:hover .card-icon-wrapper {
      background: linear-gradient(135deg, #667eea15, #764ba215);
    }

    .card-icon {
      font-size: 1.35rem;
    }

    .card-content {
      flex: 1;
      min-width: 0;
    }

    .card-content h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
    }

    .card-content p {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .card-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 10px;
      background: #667eea;
      color: white;
      white-space: nowrap;
    }

    .card-badge.badge-new {
      background: #10b981;
    }

    .card-badge.badge-pro {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    .card-chevron {
      font-size: 1.25rem;
      color: #d1d5db;
      font-weight: 300;
      transition: color 0.2s, transform 0.2s;
      flex-shrink: 0;
    }

    .settings-card:hover .card-chevron {
      color: #667eea;
      transform: translateX(2px);
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Detail Mode                                            */
    /* ═══════════════════════════════════════════════════════ */
    .back-to-overview {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: none;
      border: none;
      color: #667eea;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.5rem 0;
      margin-bottom: 1rem;
      transition: color 0.2s;
    }

    .back-to-overview:hover {
      color: #764ba2;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .detail-icon {
      font-size: 1.5rem;
    }

    .detail-header h2 {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 700;
      color: #1f2937;
    }

    .detail-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      overflow: hidden;
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Placeholder Cards (Profile, Security, etc.)            */
    /* ═══════════════════════════════════════════════════════ */
    .placeholder-card {
      padding: 2rem;
    }

    .placeholder-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .placeholder-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem;
    }

    .placeholder-card > p {
      color: #6b7280;
      margin: 0 0 1.5rem;
    }

    .placeholder-form {
      max-width: 500px;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      font-size: 0.85rem;
      color: #374151;
      margin-bottom: 0.4rem;
    }

    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .info-hint {
      font-size: 0.825rem;
      color: #6b7280;
      margin-top: 1.25rem;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }

    /* ─── Security ─── */
    .security-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .security-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.125rem 1.25rem;
      background: #f9fafb;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
    }

    .security-item-info h4 {
      margin: 0 0 0.2rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
    }

    .security-item-info p {
      margin: 0;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .btn-outline {
      padding: 0.45rem 1rem;
      border: 1.5px solid #667eea;
      background: none;
      color: #667eea;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .status-badge {
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-inactive {
      background: #f3f4f6;
      color: #6b7280;
    }

    .session-count {
      font-size: 0.85rem;
      font-weight: 600;
      color: #667eea;
    }

    /* ─── Notifications ─── */
    .notification-options {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 1rem;
    }

    .notification-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-info h4 {
      margin: 0 0 0.15rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: #1f2937;
    }

    .notification-info p {
      margin: 0;
      font-size: 0.78rem;
      color: #6b7280;
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #d1d5db;
      border-radius: 24px;
      transition: 0.3s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }

    .toggle-switch input:checked + .toggle-slider {
      background: #667eea;
    }

    .toggle-switch input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    /* ─── Language ─── */
    .language-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
      max-width: 400px;
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .language-option:hover {
      border-color: #667eea;
    }

    .language-option.active {
      border-color: #667eea;
      background: #667eea08;
    }

    .lang-flag {
      font-size: 1.5rem;
    }

    .lang-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1f2937;
      flex: 1;
    }

    .lang-check {
      color: #667eea;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .region-info {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #e5e7eb;
    }

    .region-info h4 {
      margin: 0 0 0.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .region-info p {
      margin: 0 0 1rem;
      font-size: 0.95rem;
      color: #1f2937;
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Responsive                                             */
    /* ═══════════════════════════════════════════════════════ */
    @media (max-width: 768px) {
      .settings-container {
        padding: 1rem;
      }

      .account-banner {
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .account-role {
        margin-left: 0;
        width: 100%;
      }

      .cards-grid {
        grid-template-columns: 1fr;
      }

      .security-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .notification-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
    }

    /* ═══════════════════════════════════════════════════════ */
    /*  Animation                                              */
    /* ═══════════════════════════════════════════════════════ */
    .settings-overview,
    .settings-detail {
      animation: fadeSlideIn 0.25s ease-out;
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: string | null = null;
  currentStoreId: number | null = null;
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  userName: string = '';
  userEmail: string = '';
  userInitials: string = '';
  userRole: string = '';

  settingsSections: SettingsSection[] = [
    {
      title: 'Konto',
      icon: '👤',
      cards: [
        {
          id: 'profile',
          icon: '👤',
          title: 'Mein Profil',
          description: 'Name, E-Mail und Profilbild verwalten',
          tab: 'profile'
        },
        {
          id: 'security',
          icon: '🔒',
          title: 'Sicherheit & Passwort',
          description: 'Passwort, 2FA und aktive Sitzungen',
          tab: 'security'
        },
        {
          id: 'notifications',
          icon: '🔔',
          title: 'Benachrichtigungen',
          description: 'E-Mail- und Push-Benachrichtigungen konfigurieren',
          tab: 'notifications'
        },
        {
          id: 'language',
          icon: '🌍',
          title: 'Sprache & Region',
          description: 'Sprache, Zeitzone und Währung einstellen',
          tab: 'language'
        }
      ]
    },
    {
      title: 'Team & Zugriff',
      icon: '👥',
      cards: [
        {
          id: 'roles',
          icon: '👥',
          title: 'Benutzerrollen',
          description: 'Ihre Rollen und Berechtigungen anzeigen',
          tab: 'roles'
        },
        {
          id: 'permissions',
          icon: '🔐',
          title: 'Rollenverwaltung',
          description: 'Shop- und Domain-Rollen für Teammitglieder verwalten',
          tab: 'permissions'
        },
        {
          id: 'audit',
          icon: '📋',
          title: 'Änderungsprotokoll',
          description: 'Alle Aktionen und Änderungen nachverfolgen',
          tab: 'audit'
        }
      ]
    },
    {
      title: 'Abonnement & Abrechnung',
      icon: '💳',
      cards: [
        {
          id: 'subscription',
          icon: '💎',
          title: 'Abo & Tarif',
          description: 'Aktuellen Plan verwalten, upgraden oder kündigen',
          route: '/subscription',
          badge: 'PRO',
          badgeClass: 'badge-pro'
        }
      ]
    }
  ];

  private tabMeta: Record<string, { icon: string; title: string }> = {
    profile:       { icon: '👤', title: 'Mein Profil' },
    security:      { icon: '🔒', title: 'Sicherheit & Passwort' },
    notifications: { icon: '🔔', title: 'Benachrichtigungen' },
    language:      { icon: '🌍', title: 'Sprache & Region' },
    roles:         { icon: '👥', title: 'Benutzerrollen' },
    permissions:   { icon: '🔐', title: 'Rollenverwaltung' },
    audit:         { icon: '📋', title: 'Änderungsprotokoll' }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'settings.title', icon: '⚙️' }
    ];

    // Store-ID aus Route extrahieren (3-stufig gemäß Anweisung)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }

    if (id && !isNaN(Number(id))) {
      this.currentStoreId = Number(id);
    } else {
      this.currentStoreId = null;
    }

    // Benutzerinformationen laden
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name || '';
        this.userEmail = user.email || '';
        this.userInitials = this.getInitials(user.name || user.email || '?');
        this.userRole = (user.roles && user.roles.length > 0)
          ? this.formatRole(user.roles[0])
          : '';
      }
    });
  }

  openCard(card: SettingsCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
    } else if (card.tab) {
      this.activeTab = card.tab;
    }
  }

  getActiveIcon(): string {
    return this.tabMeta[this.activeTab || '']?.icon || '⚙️';
  }

  getActiveTitle(): string {
    return this.tabMeta[this.activeTab || '']?.title || 'Einstellungen';
  }

  private getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  private formatRole(role: string): string {
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
    return labels[role] || role.replace(/_/g, ' ').toLowerCase();
  }
}
