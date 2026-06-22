import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserRolesComponent } from './user-roles.component';
import { RoleManagementComponent } from './role-management.component';
import { AuditLogComponent } from './audit-log.component';
import { AuthService } from '@app/core/services/auth.service';
import { TranslationService, SupportedLanguage } from '@app/core/services/translation.service';
import { UsageService, UsageStats, UsageItem } from '@app/core/services/usage.service';
import { StoreService } from '@app/core/services/store.service';
import { Store } from '@app/core/models';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

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
  imports: [CommonModule, FormsModule, UserRolesComponent, RoleManagementComponent, AuditLogComponent, PageHeaderComponent, TranslatePipe],
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
      <!--  OVERVIEW MODE                                         -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div class="settings-overview" *ngIf="!activeTab">

        <!-- Account-Banner mit live Daten -->
        <div class="account-banner" *ngIf="userName">
          <div class="account-avatar">{{ userInitials }}</div>
          <div class="account-info">
            <h3>{{ userName }}</h3>
            <p *ngIf="userEmail">{{ userEmail }}</p>
            <p *ngIf="!userEmail" class="anon-hint" (click)="openCard({id:'profile',tab:'profile'})">
              ⚠️ {{ 'settings.noEmailHint' | translate }}
            </p>
          </div>
          <div class="account-meta">
            <span class="role-pill" *ngIf="userRole">{{ userRole }}</span>
            <span class="plan-pill" *ngIf="usageStats">{{ usageStats.plan | uppercase }}</span>
          </div>
        </div>

        <!-- ─── Usage-Übersicht (live aus Backend) ─── -->
        <div class="usage-overview" *ngIf="usageStats">
          <h2 class="section-title"><span class="section-icon">📊</span> {{ 'settings.usage' | translate }}</h2>
          <div class="usage-grid">
            <div class="usage-card" *ngFor="let item of usageItems">
              <div class="usage-header">
                <span class="usage-icon">{{ item.icon }}</span>
                <span class="usage-label">{{ item.label }}</span>
              </div>
              <div class="usage-value">
                {{ item.used }}<span class="usage-limit" *ngIf="item.limit !== null && item.limit !== -1"> / {{ item.limit }}</span>
                <span class="usage-unlimited" *ngIf="item.limit === -1">∞</span>
              </div>
              <div class="usage-bar" *ngIf="item.percent !== null">
                <div class="usage-bar-fill"
                     [style.width.%]="item.percent"
                     [class.warn]="item.percent > 75"
                     [class.critical]="item.percent > 90"></div>
              </div>
              <span class="usage-percent" *ngIf="item.percent !== null">{{ item.percent }}%</span>
            </div>
          </div>
        </div>
        <div class="usage-loading" *ngIf="usageLoading">
          <div class="shimmer-bar"></div>
          <div class="shimmer-bar short"></div>
        </div>

        <!-- ─── Meine Stores (live) ─── -->
        <div class="stores-overview" *ngIf="myStores.length > 0">
          <h2 class="section-title"><span class="section-icon">🏪</span> {{ 'settings.myStores' | translate }}</h2>
          <div class="stores-grid">
            <div class="store-card" *ngFor="let store of myStores" (click)="navigateToStore(store)">
              <div class="store-logo" *ngIf="store.logoUrl">
                <img [src]="store.logoUrl" [alt]="store.name" />
              </div>
              <div class="store-logo placeholder" *ngIf="!store.logoUrl">
                {{ store.name.charAt(0) }}
              </div>
              <div class="store-info">
                <h4>{{ store.name }}</h4>
                <span class="store-slug">{{ store.slug }}.markt.ma</span>
              </div>
              <span class="store-status" [ngClass]="'status-' + store.status.toLowerCase()">
                {{ ('status.' + store.status.toLowerCase()) | translate }}
              </span>
              <span class="card-chevron">›</span>
            </div>
          </div>
        </div>

        <!-- ─── Settings-Kacheln ─── -->
        <div class="sections-grid" *ngFor="let section of settingsSections">
          <h2 class="section-title">
            <span class="section-icon">{{ section.icon }}</span>
            {{ section.title | translate }}
          </h2>
          <div class="cards-grid">
            <div *ngFor="let card of section.cards"
                 class="settings-card"
                 (click)="openCard(card)"
                 tabindex="0"
                 (keydown.enter)="openCard(card)">
              <div class="card-icon-wrapper">
                <span class="card-icon">{{ card.icon }}</span>
              </div>
              <div class="card-content">
                <h3>{{ card.title | translate }}</h3>
                <p>{{ card.description | translate }}</p>
              </div>
              <span *ngIf="card.badge" class="card-badge" [ngClass]="card.badgeClass || ''">{{ card.badge }}</span>
              <span class="card-chevron">›</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!--  DETAIL MODE                                           -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div class="settings-detail" *ngIf="activeTab">
        <button class="back-to-overview" (click)="activeTab = null">
          ← {{ 'common.back' | translate }}
        </button>
        <div class="detail-header">
          <span class="detail-icon">{{ getActiveIcon() }}</span>
          <h2>{{ getActiveTitle() }}</h2>
        </div>
        <div class="detail-content">

          <!-- ═══ Benutzerrollen (existierende Komponente) ═══ -->
          <app-user-roles *ngIf="activeTab === 'roles'"></app-user-roles>

          <!-- ═══ Rollenverwaltung (existierende Komponente) ═══ -->
          <app-role-management *ngIf="activeTab === 'permissions'"></app-role-management>

          <!-- ═══ Audit-Log (existierende Komponente) ═══ -->
          <app-audit-log *ngIf="activeTab === 'audit'" [storeId]="currentStoreId"></app-audit-log>

          <!-- ═══ PROFIL – echte Daten + Aktionen ═══ -->
          <div *ngIf="activeTab === 'profile'" class="detail-section">
            <div class="profile-header-card">
              <div class="profile-avatar-big">{{ userInitials }}</div>
              <div>
                <h3>{{ userName || 'Unbekannt' }}</h3>
                <p class="text-muted" *ngIf="userEmail">{{ userEmail }}</p>
                <p class="text-muted anon-hint" *ngIf="!userEmail">⚠️ {{ 'settings.noEmailHint' | translate }}</p>
                <p class="text-muted small" *ngIf="userCreatedAt">Mitglied seit {{ userCreatedAt | date:'MMMM yyyy' }}</p>
              </div>
            </div>

            <div class="form-section">
              <h4>Account-Informationen</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" class="form-control" [value]="userName" readonly />
                </div>
                <div class="form-group">
                  <label>E-Mail</label>
                  <input *ngIf="userEmail" type="email" class="form-control" [value]="userEmail" readonly />
                  <span *ngIf="!userEmail" class="anon-no-email">{{ 'settings.noEmailSet' | translate }}</span>
                </div>
                <div class="form-group">
                  <label>Rollen</label>
                  <div class="role-tags">
                    <span class="role-tag" *ngFor="let r of userRoles">{{ formatRole(r) }}</span>
                    <span class="role-tag empty" *ngIf="userRoles.length === 0">Keine Rollen</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>Shops</label>
                  <span class="form-value">{{ myStores.length }} Shop(s) verknüpft</span>
                </div>
              </div>
            </div>

            <div class="form-section" *ngIf="usageStats">
              <h4>Plan & Nutzung</h4>
              <div class="plan-info-row">
                <span class="plan-badge">{{ usageStats.plan }}</span>
                <span>{{ usageStats.products.used }} Produkte · {{ usageStats.stores.used }} Stores · {{ formatStorageMb(usageStats.storageMb.used) }} Speicher</span>
              </div>
              <button class="btn btn-outline" (click)="router.navigate(['/subscription'])">Tarif ändern →</button>
            </div>

            <div class="danger-zone">
              <h4>⚠️ Gefahrenzone</h4>
              <div class="danger-row">
                <div>
                  <strong>Abmelden</strong>
                  <p>Sie werden auf allen Geräten abgemeldet.</p>
                </div>
                <button class="btn btn-danger-outline" (click)="onLogout()">Abmelden</button>
              </div>
            </div>
          </div>

          <!-- ═══ SICHERHEIT – echte Token-Info ═══ -->
          <div *ngIf="activeTab === 'security'" class="detail-section">
            <div class="security-options">
              <div class="security-item">
                <div class="security-item-info">
                  <h4>Anmeldestatus</h4>
                  <p>{{ authService.isAuthenticated() ? 'Sie sind eingeloggt' : 'Nicht eingeloggt' }}</p>
                </div>
                <span class="status-badge" [class.status-active]="authService.isAuthenticated()"
                      [class.status-inactive]="!authService.isAuthenticated()">
                  {{ authService.isAuthenticated() ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>

              <div class="security-item">
                <div class="security-item-info">
                  <h4>Auth-Token</h4>
                  <p *ngIf="tokenInfo">Typ: JWT · Länge: {{ tokenInfo.length }} Zeichen</p>
                  <p *ngIf="!tokenInfo">Kein Token vorhanden</p>
                </div>
                <span class="status-badge" [class.status-active]="tokenInfo" [class.status-inactive]="!tokenInfo">
                  {{ tokenInfo ? 'Gültig' : '—' }}
                </span>
              </div>

              <div class="security-item">
                <div class="security-item-info">
                  <h4>Passwort ändern</h4>
                  <p>Aktualisieren Sie Ihr Passwort regelmäßig für optimale Sicherheit.</p>
                </div>
                <button class="btn btn-outline" disabled title="Backend-Endpoint noch nicht verfügbar">Ändern</button>
              </div>

              <div class="security-item">
                <div class="security-item-info">
                  <h4>Zwei-Faktor-Authentifizierung</h4>
                  <p>Schützen Sie Ihr Konto mit einer zusätzlichen Sicherheitsebene.</p>
                </div>
                <span class="status-badge status-inactive">Nicht verfügbar</span>
              </div>

              <div class="security-item">
                <div class="security-item-info">
                  <h4>Alle Sitzungen beenden</h4>
                  <p>Melden Sie sich von allen Geräten ab und setzen den Token zurück.</p>
                </div>
                <button class="btn btn-danger-outline" (click)="onLogout()">Alle beenden</button>
              </div>
            </div>
          </div>

          <!-- ═══ BENACHRICHTIGUNGEN – echte Toggle-Logik ═══ -->
          <div *ngIf="activeTab === 'notifications'" class="detail-section">
            <p class="section-desc">Steuern Sie, welche Benachrichtigungen Sie per E-Mail erhalten.</p>
            <div class="notification-options">
              <div class="notification-item" *ngFor="let n of notificationSettings">
                <div class="notification-info">
                  <h4>{{ n.label }}</h4>
                  <p>{{ n.description }}</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="n.enabled" (change)="onNotificationChange(n)" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="save-row" *ngIf="notificationsDirty">
              <button class="btn btn-primary" (click)="saveNotifications()">
                Änderungen speichern
              </button>
              <span class="save-hint">Lokale Einstellungen – werden im Browser gespeichert.</span>
            </div>
          </div>

          <!-- ═══ SPRACHE – echtes Umschalten ═══ -->
          <div *ngIf="activeTab === 'language'" class="detail-section">
            <p class="section-desc">Wählen Sie Ihre bevorzugte Sprache. Die Änderung wird sofort wirksam.</p>
            <div class="language-options">
              <div class="language-option"
                   *ngFor="let lang of availableLanguages"
                   [class.active]="lang.code === currentLanguage"
                   (click)="switchLanguage(lang.code)">
                <span class="lang-flag">{{ lang.flag }}</span>
                <div class="lang-details">
                  <span class="lang-name">{{ lang.name }}</span>
                  <span class="lang-native">{{ lang.nativeName }}</span>
                </div>
                <span class="lang-dir" *ngIf="lang.rtl">RTL</span>
                <span class="lang-check" *ngIf="lang.code === currentLanguage">✓</span>
              </div>
            </div>
            <div class="region-info">
              <div class="region-row">
                <div>
                  <h4>Textrichtung</h4>
                  <p>{{ translationService.isRTL() ? 'Rechts-nach-Links (RTL)' : 'Links-nach-Rechts (LTR)' }}</p>
                </div>
                <div>
                  <h4>Zeitzone</h4>
                  <p>{{ userTimezone }}</p>
                </div>
                <div>
                  <h4>Währung</h4>
                  <p>EUR (€)</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }

    /* ─── Account Banner ─── */
    .account-banner {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px; margin-bottom: 1.5rem; color: white;
      box-shadow: 0 4px 20px rgba(102,126,234,0.3);
    }
    .account-avatar {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,0.2); display: flex; align-items: center;
      justify-content: center; font-size: 1.25rem; font-weight: 700; flex-shrink: 0;
    }
    .account-info h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .account-info p { margin: 0.15rem 0 0; font-size: 0.85rem; opacity: 0.85; }
    .account-meta { margin-left: auto; display: flex; gap: 0.5rem; align-items: center; }
    .role-pill, .plan-pill {
      background: rgba(255,255,255,0.2); padding: 0.35rem 0.85rem;
      border-radius: 20px; font-size: 0.78rem; font-weight: 600; white-space: nowrap;
    }
    .plan-pill { background: rgba(255,255,255,0.35); }

    /* ─── Usage Overview ─── */
    .usage-overview { margin-bottom: 2rem; }
    .usage-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;
    }
    .usage-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1rem 1.125rem; display: flex; flex-direction: column; gap: 0.4rem;
    }
    .usage-header { display: flex; align-items: center; gap: 0.4rem; }
    .usage-icon { font-size: 1.1rem; }
    .usage-label { font-size: 0.78rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
    .usage-value { font-size: 1.35rem; font-weight: 700; color: #1f2937; }
    .usage-limit { font-size: 0.85rem; font-weight: 400; color: #9ca3af; }
    .usage-unlimited { font-size: 0.85rem; color: #10b981; margin-left: 0.25rem; }
    .usage-bar {
      height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; margin-top: 0.15rem;
    }
    .usage-bar-fill {
      height: 100%; background: #667eea; border-radius: 3px; transition: width 0.6s ease;
    }
    .usage-bar-fill.warn { background: #f59e0b; }
    .usage-bar-fill.critical { background: #ef4444; }
    .usage-percent { font-size: 0.72rem; color: #9ca3af; }
    .usage-loading { margin-bottom: 2rem; }
    .shimmer-bar {
      height: 80px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; margin-bottom: 0.5rem;
    }
    .shimmer-bar.short { width: 60%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ─── Stores Overview ─── */
    .stores-overview { margin-bottom: 2rem; }
    .stores-grid { display: flex; flex-direction: column; gap: 0.5rem; }
    .store-card {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 0.875rem 1.125rem; background: white; border: 1px solid #e5e7eb;
      border-radius: 10px; cursor: pointer; transition: all 0.2s;
    }
    .store-card:hover { border-color: #667eea; box-shadow: 0 2px 12px rgba(102,126,234,0.1); }
    .store-logo {
      width: 38px; height: 38px; border-radius: 8px; overflow: hidden; flex-shrink: 0;
      background: #f3f4f6; display: flex; align-items: center; justify-content: center;
    }
    .store-logo img { width: 100%; height: 100%; object-fit: cover; }
    .store-logo.placeholder { font-weight: 700; font-size: 1.1rem; color: #667eea; background: #667eea12; }
    .store-info { flex: 1; min-width: 0; }
    .store-info h4 { margin: 0; font-size: 0.9rem; font-weight: 600; color: #1f2937; }
    .store-slug { font-size: 0.75rem; color: #9ca3af; }
    .store-status {
      font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 10px;
    }
    .status-active { background: #dcfce7; color: #166534; }
    .status-inactive { background: #f3f4f6; color: #6b7280; }

    /* ─── Section / Cards ─── */
    .section-title {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.9rem; font-weight: 600; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.05em;
      margin: 0 0 0.875rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;
    }
    .section-icon { font-size: 1rem; }
    .sections-grid { margin-bottom: 1.75rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 0.75rem; }
    .settings-card {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 1rem 1.125rem; background: white; border: 1px solid #e5e7eb;
      border-radius: 12px; cursor: pointer; transition: all 0.2s;
    }
    .settings-card:hover { border-color: #667eea; box-shadow: 0 4px 16px rgba(102,126,234,0.1); transform: translateY(-1px); }
    .settings-card:focus-visible { outline: 2px solid #667eea; outline-offset: 2px; }
    .card-icon-wrapper {
      width: 42px; height: 42px; border-radius: 10px; background: #f3f4f6;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s;
    }
    .settings-card:hover .card-icon-wrapper { background: linear-gradient(135deg, #667eea15, #764ba215); }
    .card-icon { font-size: 1.25rem; }
    .card-content { flex: 1; min-width: 0; }
    .card-content h3 { margin: 0; font-size: 0.9rem; font-weight: 600; color: #1f2937; }
    .card-content p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #6b7280; line-height: 1.3; }
    .card-badge { font-size: 0.68rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 10px; background: #667eea; color: white; white-space: nowrap; }
    .card-badge.badge-pro { background: linear-gradient(135deg, #667eea, #764ba2); }
    .card-chevron { font-size: 1.25rem; color: #d1d5db; font-weight: 300; transition: all 0.2s; flex-shrink: 0; }
    .settings-card:hover .card-chevron, .store-card:hover .card-chevron { color: #667eea; transform: translateX(2px); }

    /* ─── Detail Mode ─── */
    .back-to-overview {
      display: inline-flex; align-items: center; gap: 0.25rem;
      background: none; border: none; color: #667eea; font-weight: 600;
      font-size: 0.9rem; cursor: pointer; padding: 0.5rem 0; margin-bottom: 1rem;
    }
    .back-to-overview:hover { color: #764ba2; }
    .detail-header {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb;
    }
    .detail-icon { font-size: 1.4rem; }
    .detail-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #1f2937; }
    .detail-content { background: white; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; }
    .detail-section { padding: 1.75rem 2rem; }
    .section-desc { color: #6b7280; font-size: 0.88rem; margin: 0 0 1.25rem; }

    /* ─── Profile ─── */
    .profile-header-card {
      display: flex; align-items: center; gap: 1.25rem;
      padding-bottom: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f3f4f6;
    }
    .profile-avatar-big {
      width: 68px; height: 68px; border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 700; flex-shrink: 0;
    }
    .profile-header-card h3 { margin: 0 0 0.15rem; font-size: 1.2rem; }
    .text-muted { color: #6b7280; margin: 0; font-size: 0.88rem; }
    .text-muted.small { font-size: 0.78rem; margin-top: 0.2rem; }
    .anon-hint {
      color: #d97706 !important;
      cursor: pointer;
      font-size: 0.82rem !important;
      &:hover { text-decoration: underline; }
    }
    .anon-no-email {
      display: inline-block;
      padding: 0.5rem 0.75rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      color: #92400e;
      font-size: 0.82rem;
    }
    .form-section { margin-bottom: 1.75rem; }
    .form-section h4 { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; color: #374151; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-weight: 600; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
    .form-control {
      width: 100%; padding: 0.6rem 0.85rem; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 0.88rem; background: #f9fafb; box-sizing: border-box;
    }
    .form-value { font-size: 0.9rem; color: #1f2937; font-weight: 500; padding-top: 0.35rem; }
    .role-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; padding-top: 0.2rem; }
    .role-tag {
      background: #667eea15; color: #667eea; padding: 0.3rem 0.7rem; border-radius: 6px;
      font-size: 0.78rem; font-weight: 600;
    }
    .role-tag.empty { background: #f3f4f6; color: #9ca3af; }
    .plan-info-row {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
      font-size: 0.88rem; color: #4b5563;
    }
    .plan-badge {
      background: linear-gradient(135deg, #667eea, #764ba2); color: white;
      padding: 0.3rem 0.85rem; border-radius: 8px; font-weight: 700; font-size: 0.82rem;
    }

    /* ─── Danger Zone ─── */
    .danger-zone {
      margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #fee2e2;
    }
    .danger-zone h4 { margin: 0 0 1rem; color: #991b1b; font-size: 0.95rem; }
    .danger-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
    }
    .danger-row strong { font-size: 0.9rem; color: #991b1b; }
    .danger-row p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #b91c1c; }
    .btn-danger-outline {
      padding: 0.45rem 1rem; border: 1.5px solid #ef4444; background: none;
      color: #ef4444; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer;
    }
    .btn-danger-outline:hover { background: #ef4444; color: white; }

    /* ─── Security ─── */
    .security-options { display: flex; flex-direction: column; gap: 0.75rem; }
    .security-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.125rem; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;
    }
    .security-item-info h4 { margin: 0 0 0.15rem; font-size: 0.9rem; font-weight: 600; color: #1f2937; }
    .security-item-info p { margin: 0; font-size: 0.78rem; color: #6b7280; }
    .status-badge {
      padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
    }
    .status-badge.status-active { background: #dcfce7; color: #166534; }
    .status-badge.status-inactive { background: #f3f4f6; color: #6b7280; }
    .btn-outline, .btn-primary {
      padding: 0.45rem 1rem; border: 1.5px solid #667eea; background: none;
      color: #667eea; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-outline:hover { background: #667eea; color: white; }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline:disabled:hover { background: none; color: #667eea; }
    .btn-primary { background: #667eea; color: white; border-color: #667eea; }
    .btn-primary:hover { background: #5568d3; }

    /* ─── Notifications ─── */
    .notification-options { display: flex; flex-direction: column; gap: 0; }
    .notification-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.125rem; border-bottom: 1px solid #f3f4f6;
    }
    .notification-item:last-child { border-bottom: none; }
    .notification-info h4 { margin: 0 0 0.1rem; font-size: 0.88rem; font-weight: 600; color: #1f2937; }
    .notification-info p { margin: 0; font-size: 0.75rem; color: #6b7280; }
    .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background: #d1d5db; border-radius: 24px; transition: 0.3s;
    }
    .toggle-slider::before {
      content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px;
      background: white; border-radius: 50%; transition: 0.3s;
    }
    .toggle-switch input:checked + .toggle-slider { background: #667eea; }
    .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
    .save-row {
      display: flex; align-items: center; gap: 1rem;
      margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;
    }
    .save-hint { font-size: 0.78rem; color: #9ca3af; }

    /* ─── Language ─── */
    .language-options { display: flex; flex-direction: column; gap: 0.5rem; max-width: 460px; }
    .language-option {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.9rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px;
      cursor: pointer; transition: all 0.2s;
    }
    .language-option:hover { border-color: #667eea; }
    .language-option.active { border-color: #667eea; background: #667eea08; box-shadow: 0 0 0 3px rgba(102,126,234,0.08); }
    .lang-flag { font-size: 1.5rem; }
    .lang-details { flex: 1; display: flex; flex-direction: column; }
    .lang-name { font-weight: 600; font-size: 0.9rem; color: #1f2937; }
    .lang-native { font-size: 0.75rem; color: #9ca3af; }
    .lang-dir {
      font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px;
      background: #fef3c7; color: #92400e;
    }
    .lang-check { color: #667eea; font-weight: 700; font-size: 1.1rem; }
    .region-info { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb; }
    .region-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .region-info h4 {
      margin: 0 0 0.2rem; font-size: 0.75rem; font-weight: 600; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .region-info p { margin: 0; font-size: 0.9rem; color: #1f2937; font-weight: 500; }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .settings-container { padding: 1rem; }
      .account-banner { flex-wrap: wrap; }
      .account-meta { margin-left: 0; width: 100%; }
      .cards-grid, .usage-grid { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .region-row { grid-template-columns: 1fr; }
      .security-item, .notification-item, .danger-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    }

    /* ─── Animation ─── */
    .settings-overview, .settings-detail { animation: fadeSlideIn 0.25s ease-out; }
    @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  activeTab: string | null = null;
  currentStoreId: number | null = null;
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  // User
  userName = '';
  userEmail = '';
  isAnonymous = false;
  userInitials = '';
  userRole = '';
  userRoles: string[] = [];
  userCreatedAt: string | null = null;
  tokenInfo: string | null = null;

  // Usage (live vom Backend)
  usageStats: UsageStats | null = null;
  usageLoading = false;
  usageItems: { icon: string; label: string; used: number; limit: number | null; percent: number | null }[] = [];

  // Stores (live vom Backend)
  myStores: Store[] = [];

  // Sprache (funktioniert echt!)
  currentLanguage: SupportedLanguage = 'de';
  availableLanguages = [
    { code: 'de' as SupportedLanguage, name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
    { code: 'en' as SupportedLanguage, name: 'Englisch', nativeName: 'English', flag: '🇬🇧', rtl: false },
    { code: 'ar' as SupportedLanguage, name: 'Arabisch', nativeName: 'العربية', flag: '🇸🇦', rtl: true }
  ];
  userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Benachrichtigungen (localStorage-Persistenz)
  notificationSettings = [
    { key: 'notify_orders', label: 'Neue Bestellungen', description: 'E-Mail bei jeder neuen Bestellung erhalten.', enabled: true },
    { key: 'notify_stock', label: 'Geringe Lagerbestände', description: 'Warnung wenn ein Produkt unter den Mindestbestand fällt.', enabled: true },
    { key: 'notify_reviews', label: 'Kundenbewertungen', description: 'Benachrichtigung bei neuen Bewertungen.', enabled: false },
    { key: 'notify_marketing', label: 'Marketing-Berichte', description: 'Wöchentliche Zusammenfassung der Shop-Performance.', enabled: false },
    { key: 'notify_security', label: 'Sicherheitshinweise', description: 'Warnung bei verdächtigen Login-Versuchen.', enabled: true }
  ];
  notificationsDirty = false;

  settingsSections: SettingsSection[] = [
    {
      title: 'settings.account',
      icon: '👤',
      cards: [
        { id: 'profile', icon: '👤', title: 'settings.profile.title', description: 'settings.profile.description', tab: 'profile' },
        { id: 'security', icon: '🔒', title: 'settings.security.title', description: 'settings.security.description', tab: 'security' },
        { id: 'notifications', icon: '🔔', title: 'settings.notifications.title', description: 'settings.notifications.description', tab: 'notifications' },
        { id: 'language', icon: '🌍', title: 'settings.language.title', description: 'settings.language.description', tab: 'language' }
      ]
    },
    {
      title: 'settings.teamAccess',
      icon: '👥',
      cards: [
        { id: 'roles', icon: '👥', title: 'settings.roles.title', description: 'settings.roles.description', tab: 'roles' },
        { id: 'permissions', icon: '🔐', title: 'settings.permissions.title', description: 'settings.permissions.description', tab: 'permissions' },
        { id: 'audit', icon: '📋', title: 'settings.audit.title', description: 'settings.audit.description', tab: 'audit' }
      ]
    },
    {
      title: 'settings.subscription',
      icon: '💳',
      cards: [
        { id: 'subscription', icon: '💎', title: 'settings.subscriptionCard.title', description: 'settings.subscriptionCard.description', route: '/subscription', badge: 'PRO', badgeClass: 'badge-pro' }
      ]
    }
  ];

  private tabMeta: Record<string, { icon: string; titleKey: string }> = {
    profile: { icon: '👤', titleKey: 'settings.profile.title' },
    security: { icon: '🔒', titleKey: 'settings.security.title' },
    notifications: { icon: '🔔', titleKey: 'settings.notifications.title' },
    language: { icon: '🌍', titleKey: 'settings.language.title' },
    roles: { icon: '👥', titleKey: 'settings.roles.title' },
    permissions: { icon: '🔐', titleKey: 'settings.permissions.title' },
    audit: { icon: '📋', titleKey: 'settings.audit.title' }
  };

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public authService: AuthService,
    public translationService: TranslationService,
    private usageService: UsageService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'settings.title', icon: '⚙️' }
    ];

    // ── Store-ID extrahieren (3-stufig) ──
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }
    this.currentStoreId = id && !isNaN(Number(id)) ? Number(id) : null;

    // ── User-Daten laden ──
    this.subs.push(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.userName = user.name || '';
          const email = user.email || '';
          // Anonyme Fake-Emails nicht anzeigen
          this.userEmail = email.startsWith('anon-') ? '' : email;
          this.isAnonymous = email.startsWith('anon-');
          this.userInitials = this.getInitials(user.name || (this.userEmail || '?'));
          this.userRoles = user.roles || [];
          this.userRole = this.userRoles.length > 0 ? this.formatRole(this.userRoles[0]) : '';
          this.userCreatedAt = user.createdAt || null;
        }
      })
    );

    // ── Token-Info ──
    const token = this.authService.getToken();
    this.tokenInfo = token ? token : null;

    // ── Sprache ──
    this.currentLanguage = this.translationService.currentLang();

    // ── Benachrichtigungen aus localStorage laden ──
    this.loadNotificationSettings();

    // ── Usage-Daten vom Backend ──
    this.loadUsageStats();

    // ── Meine Stores laden ──
    this.loadMyStores();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ═══ USAGE ═══
  private loadUsageStats(): void {
    this.usageLoading = true;
    this.subs.push(
      this.usageService.getMyUsage().subscribe({
        next: (stats) => {
          this.usageStats = stats;
          this.usageItems = this.mapUsageToItems(stats);
          this.usageLoading = false;
        },
        error: (err) => {
          console.warn('⚠️ Usage-Daten konnten nicht geladen werden:', err);
          this.usageLoading = false;
        }
      })
    );
  }

  private mapUsageToItems(s: UsageStats) {
    const t = (key: string) => this.translationService.translate(key);
    return [
      { icon: '🏪', label: t('settings.usage_stores'), ...this.extractUsage(s.stores) },
      { icon: '📦', label: t('settings.usage_products'), ...this.extractUsage(s.products) },
      { icon: '💾', label: t('settings.usage_storage'), ...this.extractUsage(s.storageMb) },
      { icon: '🤖', label: t('settings.usage_aiCalls'), ...this.extractUsage(s.aiCallsThisMonth) },
      { icon: '🌐', label: t('settings.usage_domains'), ...this.extractUsage(s.customDomains) },
      { icon: '👥', label: t('settings.usage_customers'), ...this.extractUsage(s.customers) }
    ];
  }

  private extractUsage(item: UsageItem) {
    return { used: item.used, limit: item.limit, percent: item.percent };
  }

  // ═══ STORES ═══
  private loadMyStores(): void {
    this.subs.push(
      this.storeService.getMyStores().subscribe({
        next: (stores) => {
          this.myStores = stores;
          // Wenn kein Store in der URL und genau 1 Store existiert → auto-redirect
          if (!this.currentStoreId && stores.length === 1) {
            this.router.navigate(['/stores', stores[0].id, 'settings'], { replaceUrl: true });
          }
        },
        error: (err) => { console.warn('⚠️ Stores konnten nicht geladen werden:', err); }
      })
    );
  }

  navigateToStore(store: Store): void {
    this.router.navigate(['/stores', store.id]);
  }

  // ═══ SPRACHE (echt!) ═══
  switchLanguage(lang: SupportedLanguage): void {
    this.currentLanguage = lang;
    this.translationService.setLanguage(lang);
  }

  // ═══ BENACHRICHTIGUNGEN (localStorage-Persistenz) ═══
  private loadNotificationSettings(): void {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        this.notificationSettings.forEach(n => {
          if (parsed[n.key] !== undefined) n.enabled = parsed[n.key];
        });
      } catch { /* ignore */ }
    }
  }

  onNotificationChange(_setting: { key: string; enabled: boolean }): void {
    this.notificationsDirty = true;
  }

  saveNotifications(): void {
    const map: Record<string, boolean> = {};
    this.notificationSettings.forEach(n => map[n.key] = n.enabled);
    localStorage.setItem('notification_settings', JSON.stringify(map));
    this.notificationsDirty = false;
  }

  // ═══ LOGOUT ═══
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ═══ NAVIGATION ═══
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
    const key = this.tabMeta[this.activeTab || '']?.titleKey;
    return key ? this.translationService.translate(key) : this.translationService.translate('settings.title');
  }

  // ═══ HELPERS ═══
  formatRole(role: string): string {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin', 'STORE_OWNER': 'Shop-Besitzer',
      'STORE_ADMIN': 'Shop-Admin', 'STORE_MANAGER': 'Shop-Manager',
      'STORE_STAFF': 'Mitarbeiter', 'CUSTOMER': 'Kunde',
      'ROLE_SUPER_ADMIN': 'Super Admin', 'ROLE_STORE_OWNER': 'Shop-Besitzer',
      'ROLE_ADMIN': 'Admin', 'ROLE_USER': 'Benutzer'
    };
    return labels[role] || role.replace(/_/g, ' ').toLowerCase();
  }

  formatStorageMb(mb: number): string {
    return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb + ' MB';
  }

  private getInitials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
}
