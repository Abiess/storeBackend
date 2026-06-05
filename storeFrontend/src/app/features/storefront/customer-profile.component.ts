import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
    CustomerProfileService,
    CustomerProfile,
    OrderHistory
} from '../../core/services/customer-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerProfileEditComponent } from './customer-profile-edit.component';
import { CustomerAddressesComponent } from './customer-addresses.component';
import { CustomerPasswordChangeComponent } from './customer-password-change.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { toDate } from '../../core/utils/date.utils';

type CustomerTab = 'overview' | 'orders' | 'profile' | 'addresses' | 'password';

/** UI-sicheres ViewModel (DatePipe/NumberPipe-safe) */
interface OrderHistoryVM {
    orderId: number;
    orderNumber: string;
    orderDate: string;
    createdAt: Date | null; // <-- wichtig: DatePipe-sicher
    status: string;
    total: number;
    totalAmount: number;
    itemCount: number | null | undefined;
    items: OrderHistory['items'];
}

@Component({
    selector: 'app-customer-profile',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        CustomerProfileEditComponent,
        CustomerAddressesComponent,
        CustomerPasswordChangeComponent,
        TranslatePipe
    ],
    template: `
    <div class="profile-container">
      <!-- Mobile-Header (nur auf kleinen Screens) -->
      <div class="profile-topbar">
        <button class="topbar-back" (click)="goToShop()" aria-label="Zurück">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 class="topbar-title">{{ 'navigation.myAccount' | translate }}</h1>
        <button class="topbar-logout" (click)="logout()" [title]="'common.logout' | translate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      <!-- Tab Bar (Mobile: Icon + kurzer Text, Desktop: versteckt hinter Sidebar) -->
      <nav class="profile-tabs">
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
          <span class="tab-icon">📊</span>
          <span class="tab-label">{{ 'navigation.overview' | translate }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'orders'" (click)="activeTab = 'orders'">
          <span class="tab-icon">📦</span>
          <span class="tab-label">{{ 'profile.myOrders' | translate }}</span>
          <span class="tab-badge" *ngIf="orderHistory.length > 0">{{ orderHistory.length }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'profile'" (click)="activeTab = 'profile'">
          <span class="tab-icon">👤</span>
          <span class="tab-label">{{ 'profile.profileData' | translate }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'addresses'" (click)="activeTab = 'addresses'">
          <span class="tab-icon">📍</span>
          <span class="tab-label">{{ 'profile.addresses' | translate }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'password'" (click)="activeTab = 'password'">
          <span class="tab-icon">🔒</span>
          <span class="tab-label">{{ 'profile.changePassword' | translate }}</span>
        </button>
      </nav>

      <!-- Wrapper: Flex nur auf Desktop (>= 768px via CSS), Mobile = Block -->
      <div class="profile-content">
        <!-- Desktop Sidebar -->
        <nav class="profile-sidebar">
          <button class="sidebar-item" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
            <span class="icon">📊</span><span>{{ 'navigation.overview' | translate }}</span>
          </button>
          <button class="sidebar-item" [class.active]="activeTab === 'orders'" (click)="activeTab = 'orders'">
            <span class="icon">📦</span><span>{{ 'profile.myOrders' | translate }}</span>
            <span class="badge" *ngIf="orderHistory.length > 0">{{ orderHistory.length }}</span>
          </button>
          <button class="sidebar-item" [class.active]="activeTab === 'profile'" (click)="activeTab = 'profile'">
            <span class="icon">👤</span><span>{{ 'profile.profileData' | translate }}</span>
          </button>
          <button class="sidebar-item" [class.active]="activeTab === 'addresses'" (click)="activeTab = 'addresses'">
            <span class="icon">📍</span><span>{{ 'profile.addresses' | translate }}</span>
          </button>
          <button class="sidebar-item" [class.active]="activeTab === 'password'" (click)="activeTab = 'password'">
            <span class="icon">🔒</span><span>{{ 'profile.changePassword' | translate }}</span>
          </button>
          <div class="sidebar-divider"></div>
          <button class="sidebar-item sidebar-item--logout" (click)="logout()">
            <span class="icon">🚪</span><span>{{ 'common.logout' | translate }}</span>
          </button>
        </nav>

        <!-- Content Area -->
        <div class="profile-main">

          <!-- Overview Tab -->
          <div *ngIf="activeTab === 'overview'" class="tab-content">
            <h2>{{ 'profile.welcomeBack' | translate: { name: profile?.email || ('profile.customer' | translate) } }}</h2>

            <div class="overview-cards">
              <div class="overview-card">
                <div class="card-icon">📦</div>
                <div class="card-content">
                  <h3>{{ orderHistory.length }}</h3>
                  <p>{{ 'navigation.orders' | translate }}</p>
                </div>
              </div>

              <div class="overview-card">
                <div class="card-icon">✅</div>
                <div class="card-content">
                  <h3>{{ getCompletedOrders() }}</h3>
                  <p>{{ 'profile.completed' | translate }}</p>
                </div>
              </div>

              <div class="overview-card">
                <div class="card-icon">🚚</div>
                <div class="card-content">
                  <h3>{{ getPendingOrders() }}</h3>
                  <p>{{ 'profile.inProgress' | translate }}</p>
                </div>
              </div>
            </div>

            <div class="recent-orders" *ngIf="orderHistory.length > 0">
              <h3>{{ 'profile.recentOrders' | translate }}</h3>
              <div class="order-list-compact">
                <div class="order-item-compact" *ngFor="let order of orderHistory.slice(0, 3)">
                  <div class="order-info">
                    <strong>{{ order.orderNumber }}</strong>
                    <span class="order-date">
                      {{ parseDate(order.createdAt) | date:'dd.MM.yyyy' }}
                    </span>
                  </div>
                  <span class="status-badge" [class]="'status-' + (order.status || 'PENDING').toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>
                  <strong class="order-total">{{ order.totalAmount | number:'1.2-2' }} €</strong>
                </div>
              </div>
              <button class="btn-secondary" (click)="activeTab = 'orders'">
                {{ 'profile.viewAllOrders' | translate }}
              </button>
            </div>
          </div>

          <!-- Orders Tab -->
          <div *ngIf="activeTab === 'orders'" class="tab-content">
            <h2>{{ 'profile.myOrders' | translate }}</h2>

            <div *ngIf="loadingOrders" class="loading">
              <div class="spinner"></div>
              {{ 'profile.loadingOrders' | translate }}
            </div>

            <div *ngIf="!loadingOrders && orderHistory.length === 0" class="empty-state">
              <div class="empty-icon">📦</div>
              <h3>{{ 'profile.noOrders' | translate }}</h3>
              <p>{{ 'profile.noOrdersHint' | translate }}</p>
              <button class="btn-primary" (click)="goToShop()">{{ 'profile.shopNow' | translate }}</button>
            </div>

            <div *ngIf="!loadingOrders && orderHistory.length > 0" class="orders-list">
              <div class="order-card" *ngFor="let order of orderHistory">
                <div class="order-header">
                  <div>
                    <h3>{{ 'profile.orderLabel' | translate }} {{ order.orderNumber }}</h3>
                    <p class="order-date">
                      {{ parseDate(order.createdAt) | date:'dd.MM.yyyy HH:mm' }}
                    </p>
                  </div>
                  <span class="status-badge" [class]="'status-' + (order.status || 'PENDING').toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </div>

                <div class="order-body">
                  <div class="order-detail">
                    <span class="label">{{ 'profile.items' | translate }}:</span>
                    <span>{{ order.itemCount ?? 0 }}</span>
                  </div>
                  <div class="order-detail">
                    <span class="label">{{ 'order.total' | translate }}:</span>
                    <strong class="total">{{ order.totalAmount | number:'1.2-2' }} €</strong>
                  </div>
                </div>

                <div class="order-actions">
                  <button class="btn-secondary" (click)="viewOrderDetails(order)">
                    {{ 'profile.viewDetails' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Tab -->
          <div *ngIf="activeTab === 'profile'" class="tab-content">
            <app-customer-profile-edit
              [profile]="profile"
              (profileUpdated)="onProfileUpdated($event)">
            </app-customer-profile-edit>
          </div>

          <!-- Addresses Tab -->
          <div *ngIf="activeTab === 'addresses'" class="tab-content">
            <app-customer-addresses
              [profile]="profile"
              (addressUpdated)="onAddressUpdated()">
            </app-customer-addresses>
          </div>

          <!-- Password Tab -->
          <div *ngIf="activeTab === 'password'" class="tab-content">
            <app-customer-password-change></app-customer-password-change>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
      /* ═══════════════════════════════════════════════
         PROFIL – MOBILE-FIRST, dann Desktop-Erweiterung
         ═══════════════════════════════════════════════ */

      *, *::before, *::after { box-sizing: border-box; }

      :host {
        display: block;
        --profile-primary:     #667eea;
        --profile-primary-end: #764ba2;
        --profile-radius:      12px;
        --profile-shadow:      0 2px 12px rgba(0,0,0,0.08);
        /* Bottom-Nav-Höhe (60px) + safe area + etwas Luft */
        --profile-bottom-offset: calc(60px + env(safe-area-inset-bottom, 0px) + 12px);
      }

      .profile-container {
        min-height: 100vh;
        background: #f5f7fa;
        overflow-x: hidden;           /* ← kein horizontales Scrollen */
        padding-bottom: var(--profile-bottom-offset);
      }

      /* ── TOP BAR ── */
      .profile-topbar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        padding-top: calc(0.875rem + env(safe-area-inset-top, 0px));
        background: #fff;
        border-bottom: 1px solid #e9ecef;
        position: sticky;
        top: 0;
        z-index: 50;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .topbar-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px; height: 36px;
        flex-shrink: 0;
        border: none;
        background: #f3f4f6;
        border-radius: 50%;
        cursor: pointer;
        color: #374151;
        transition: background 0.2s;
      }
      .topbar-back:hover { background: #e5e7eb; }
      .topbar-title {
        flex: 1;
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .topbar-logout {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px; height: 36px;
        flex-shrink: 0;
        border: none;
        background: #fef2f2;
        border-radius: 50%;
        cursor: pointer;
        color: #dc2626;
        transition: background 0.2s;
      }
      .topbar-logout:hover { background: #fee2e2; }

      /* ── TAB BAR (Mobile / Tablet: sichtbar, Desktop: versteckt) ── */
      .profile-tabs {
        display: flex;
        overflow-x: auto;
        background: #fff;
        border-bottom: 2px solid #f0f0f0;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        padding: 0 4px;
      }
      .profile-tabs::-webkit-scrollbar { display: none; }

      .tab-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
        scroll-snap-align: start;
        padding: 0.625rem 0.75rem;
        border: none;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        font-size: 0.68rem;
        font-weight: 500;
        border-bottom: 2.5px solid transparent;
        margin-bottom: -2px;
        transition: all 0.2s;
        position: relative;
        min-width: 58px;
        max-width: 80px;
      }
      .tab-btn:hover { color: #374151; background: #f9fafb; }
      .tab-btn--active {
        color: var(--profile-primary);
        border-bottom-color: var(--profile-primary);
        font-weight: 700;
      }
      .tab-icon  { font-size: 1.15rem; line-height: 1; }
      .tab-label {
        white-space: nowrap;
        font-size: 0.65rem;
        max-width: 76px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tab-badge {
        position: absolute;
        top: 4px; right: 4px;
        background: var(--profile-primary);
        color: #fff;
        font-size: 0.6rem; font-weight: 700;
        padding: 1px 5px;
        border-radius: 20px;
        min-width: 16px;
        text-align: center;
      }

      /* ── CONTENT LAYOUT ── */
      .profile-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0.75rem;
      }

      /* ── DESKTOP SIDEBAR (versteckt auf Mobile) ── */
      .profile-sidebar {
        display: none;
        flex-direction: column;
        gap: 2px;
        width: 240px;
        flex-shrink: 0;
        background: #fff;
        border-radius: var(--profile-radius);
        padding: 0.75rem;
        height: fit-content;
        box-shadow: var(--profile-shadow);
        position: sticky;
        top: 70px;              /* unterhalb sticky topbar */
      }
      .sidebar-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0.75rem 1rem;
        border: none;
        background: transparent;
        color: #4b5563;
        cursor: pointer;
        border-radius: 8px;
        font-size: 0.9rem; font-weight: 500;
        text-align: left;
        transition: all 0.2s;
      }
      .sidebar-item:hover { background: #f3f4f6; color: #1f2937; }
      .sidebar-item.active {
        background: linear-gradient(135deg, var(--profile-primary) 0%, var(--profile-primary-end) 100%);
        color: #fff;
      }
      .sidebar-item .icon { font-size: 1.1rem; flex-shrink: 0; }
      .sidebar-item .badge {
        margin-left: auto;
        background: rgba(102,126,234,0.15);
        color: var(--profile-primary);
        padding: 1px 7px;
        border-radius: 20px;
        font-size: 0.75rem; font-weight: 700;
      }
      .sidebar-item.active .badge { background: rgba(255,255,255,0.25); color: #fff; }
      .sidebar-item--logout { color: #dc2626; }
      .sidebar-item--logout:hover { background: #fef2f2; }
      .sidebar-divider { height: 1px; background: #f0f0f0; margin: 0.5rem 0; }

      /* ── MAIN CONTENT ── */
      .profile-main {
        width: 100%;
        min-width: 0;
        background: #fff;
        border-radius: var(--profile-radius);
        padding: 1rem;
        box-shadow: var(--profile-shadow);
        overflow: hidden;            /* ← verhindert overflow */
      }

      /* ── TAB CONTENT ── */
      .tab-content h2 {
        margin: 0 0 1rem 0;
        font-size: 1.05rem;
        color: #1f2937;
        font-weight: 700;
      }

      /* ── OVERVIEW CARDS ── */
      .overview-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);   /* Standard: 3 Spalten */
        gap: 0.6rem;
        margin-bottom: 1.25rem;
      }
      .overview-card {
        background: linear-gradient(135deg, var(--profile-primary) 0%, var(--profile-primary-end) 100%);
        color: #fff;
        padding: 0.875rem 0.625rem;
        border-radius: var(--profile-radius);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;               /* ← Flex-Overflow-Fix */
      }
      .card-icon { font-size: 1.5rem; flex-shrink: 0; }
      .card-content { min-width: 0; }
      .card-content h3 { margin: 0; font-size: 1.4rem; font-weight: 700; line-height: 1; }
      .card-content p  { margin: 3px 0 0 0; opacity: 0.88; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      /* ── RECENT ORDERS ── */
      .recent-orders { margin-top: 1.25rem; }
      .recent-orders h3 { margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: #374151; }
      .order-list-compact {
        display: flex; flex-direction: column; gap: 0.5rem;
        margin-bottom: 0.875rem;
      }
      .order-item-compact {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 10px;
        flex-wrap: wrap;
      }
      .order-info { flex: 1; min-width: 100px; }
      .order-info strong { font-size: 0.85rem; color: #1f2937; }
      .order-date { display: block; font-size: 0.73rem; color: #6b7280; margin-top: 1px; }
      .order-total { color: var(--profile-primary); font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }

      /* ── ORDERS LIST ── */
      .orders-list { display: flex; flex-direction: column; gap: 0.75rem; }
      .order-card {
        border: 1px solid #e5e7eb;
        border-radius: var(--profile-radius);
        padding: 0.875rem;
        transition: box-shadow 0.2s;
        overflow: hidden;
      }
      .order-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #f0f0f0;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .order-header h3 { margin: 0 0 2px 0; font-size: 0.9rem; color: #1f2937; word-break: break-all; }
      .order-body { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
      .order-detail { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
      .order-detail .label { color: #6b7280; }
      .order-detail .total { color: var(--profile-primary); font-size: 1rem; font-weight: 700; }
      .order-actions { display: flex; gap: 8px; flex-wrap: wrap; }

      /* ── STATUS BADGES ── */
      .status-badge {
        padding: 3px 9px;
        border-radius: 20px;
        font-size: 0.68rem; font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .status-pending    { background: #fff3cd; color: #856404; }
      .status-confirmed,
      .status-processing { background: #d1ecf1; color: #0c5460; }
      .status-shipped,
      .status-delivered  { background: #d4edda; color: #155724; }
      .status-cancelled  { background: #f8d7da; color: #721c24; }

      /* ── BUTTONS ── */
      .btn-primary {
        display: block;
        width: 100%;
        padding: 0.75rem 1.25rem;
        background: linear-gradient(135deg, var(--profile-primary) 0%, var(--profile-primary-end) 100%);
        color: #fff; border: none;
        border-radius: 10px; cursor: pointer;
        font-size: 0.9rem; font-weight: 600;
        transition: opacity 0.2s;
        text-align: center;
      }
      .btn-primary:hover { opacity: 0.9; }
      .btn-secondary {
        padding: 0.6rem 1.1rem;
        background: #fff;
        color: var(--profile-primary);
        border: 1.5px solid var(--profile-primary);
        border-radius: 10px; cursor: pointer;
        font-size: 0.85rem; font-weight: 600;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-secondary:hover { background: var(--profile-primary); color: #fff; }

      /* ── SPINNER / EMPTY ── */
      .loading, .empty-state { text-align: center; padding: 2.5rem 1rem; }
      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid var(--profile-primary);
        border-radius: 50%;
        width: 36px; height: 36px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
      .empty-state h3 { margin: 0 0 0.5rem 0; color: #1f2937; }
      .empty-state p  { color: #6b7280; margin-bottom: 1.25rem; font-size: 0.875rem; }

      /* ══════════════════════════════════════════════════
         RESPONSIVE BREAKPOINTS
         ══════════════════════════════════════════════════ */

      /* Sehr kleine Smartphones (< 360px) */
      @media (max-width: 359px) {
        .overview-cards { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        .tab-btn { min-width: 50px; padding: 0.5rem 0.5rem; }
        .profile-content { padding: 0.5rem; }
      }

      /* Kleine Smartphones (360–479px): 2-spaltiges Grid */
      @media (min-width: 360px) and (max-width: 479px) {
        .overview-cards { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        /* 3. Karte streckt sich über volle Breite */
        .overview-card:last-child { grid-column: 1 / -1; flex-direction: row; justify-content: center; }
      }

      /* Mittlere Phones (480–599px): 3 Spalten sind ok */
      @media (min-width: 480px) and (max-width: 599px) {
        .overview-cards { grid-template-columns: repeat(3, 1fr); }
      }

      /* Tablets & Desktop (>= 768px): Sidebar zeigen, Tabs verstecken */
      @media (min-width: 768px) {
        .profile-tabs    { display: none; }
        .profile-sidebar { display: flex; }
        .profile-content {
          display: flex;
          gap: 1.25rem;
          padding: 1.25rem;
        }
        .profile-main { padding: 1.5rem; }
        .overview-cards { gap: 1rem; }
        .card-icon  { font-size: 2rem; }
        .card-content h3 { font-size: 1.9rem; }
        .card-content p  { font-size: 0.825rem; }
        .tab-content h2  { font-size: 1.2rem; }
      }

      /* Große Desktops (>= 1024px) */
      @media (min-width: 1024px) {
        .profile-content { padding: 1.5rem; }
        .profile-main    { padding: 2rem; }
      }
    `]

})
export class CustomerProfileComponent implements OnInit {
    activeTab: CustomerTab = 'overview';

    profile: CustomerProfile | null = null;

    // WICHTIG: UI arbeitet mit VM (createdAt = Date | null)
    orderHistory: OrderHistoryVM[] = [];

    loadingOrders = false;

    constructor(
        private customerService: CustomerProfileService,
        private authService: AuthService,
        private router: Router,
        private translationService: TranslationService
    ) {}

    ngOnInit(): void {
        this.loadProfile();
        this.loadOrderHistory();
    }

    loadProfile(): void {
        this.customerService.getProfile().subscribe({
            next: (profile) => {
                this.profile = profile;
            },
            error: (error) => {
                console.error('❌ Fehler beim Laden des Profils:', error);
            }
        });
    }

    loadOrderHistory(): void {
        const email = this.authService.getCurrentUserEmail();
        if (!email) {
            console.error('❌ Keine E-Mail gefunden');
            this.orderHistory = [];
            return;
        }

        this.loadingOrders = true;

        this.customerService.getOrderHistory(email).subscribe({
            next: (orders: OrderHistory[]) => {
                this.orderHistory = (orders ?? []).map(o => this.toOrderVM(o));
                this.loadingOrders = false;
            },
            error: (error) => {
                console.error('❌ Fehler beim Laden der Bestellhistorie:', error);
                this.loadingOrders = false;
                this.orderHistory = [];
            }
        });
    }

    private toOrderVM(o: OrderHistory): OrderHistoryVM {
        // createdAt bevorzugen, sonst fallback auf orderDate
        const createdAt = this.toDateOrNull(o.createdAt) ?? this.toDateOrNull(o.orderDate);

        // totalAmount bevorzugen, sonst fallback auf total
        const totalAmount = this.toNumberOrZero(o.totalAmount) || this.toNumberOrZero(o.total);

        return {
            orderId: this.toIntOrZero(o.orderId),
            orderNumber: String(o.orderNumber ?? ''),
            orderDate: String(o.orderDate ?? ''),
            createdAt,
            status: String(o.status ?? 'PENDING'),
            total: this.toNumberOrZero(o.total),
            totalAmount,
            itemCount: this.toIntOrZero(o.itemCount),
            items: o.items ?? ([] as any)
        };
    }

    private toDateOrNull(value: unknown): Date | null {
        if (value === null || value === undefined || value === '') return null;

        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'number') {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }

        if (typeof value === 'string') {
            // Wenn Backend ISO liefert -> ok.
            // Wenn Backend z.B. "19.01.2026" liefert, kann new Date() je nach Browser scheitern -> dann null
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }

        return null;
    }

    private toNumberOrZero(value: unknown): number {
        if (value === null || value === undefined || value === '') return 0;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === 'string') {
            // "12,34" -> "12.34"
            const normalized = value.replace(/\s/g, '').replace(',', '.');
            const n = Number(normalized);
            return Number.isFinite(n) ? n : 0;
        }

        return 0;
    }

    private toIntOrZero(value: unknown): number {
        const n = this.toNumberOrZero(value);
        return Number.isFinite(n) ? Math.trunc(n) : 0;
    }

    getStatusLabel(status: string): string {
        const key = `status.${(status ?? 'pending').toLowerCase()}`;
        const translated = this.translationService.translate(key);
        return translated !== key ? translated : (status || this.translationService.translate('status.pending'));
    }

    getCompletedOrders(): number {
        return this.orderHistory.filter(o => (o.status ?? '').toUpperCase() === 'DELIVERED').length;
    }

    getPendingOrders(): number {
        const pending = new Set(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']);
        return this.orderHistory.filter(o => pending.has((o.status ?? '').toUpperCase())).length;
    }

    viewOrderDetails(order: OrderHistoryVM): void {
        const email = this.authService.getCurrentUserEmail();
        this.router.navigate(['/storefront/order-confirmation'], {
            queryParams: {
                orderNumber: order.orderNumber,
                email
            }
        });
    }

    onProfileUpdated(profile: CustomerProfile): void {
        this.profile = profile;
    }

    onAddressUpdated(): void {
        this.loadProfile();
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/storefront']);
    }

    goToShop(): void {
        this.router.navigate(['/storefront']);
    }

    /** Spring LocalDateTime-Array oder ISO-String → JS Date für DatePipe */
    parseDate(value: any): Date | null {
        return toDate(value);
    }
}
