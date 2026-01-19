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
        CustomerPasswordChangeComponent
    ],
    template: `
    <div class="profile-container">
      <div class="profile-header">
        <h1>Mein Konto</h1>
        <button class="btn-logout" (click)="logout()">
          <span class="icon">🚪</span> Abmelden
        </button>
      </div>

      <div class="profile-content">
        <!-- Navigation Sidebar -->
        <nav class="profile-nav">
          <button
            class="nav-item"
            [class.active]="activeTab === 'overview'"
            (click)="activeTab = 'overview'">
            <span class="icon">📊</span>
            <span>Übersicht</span>
          </button>

          <button
            class="nav-item"
            [class.active]="activeTab === 'orders'"
            (click)="activeTab = 'orders'">
            <span class="icon">📦</span>
            <span>Meine Bestellungen</span>
            <span class="badge" *ngIf="orderHistory.length > 0">{{ orderHistory.length }}</span>
          </button>

          <button
            class="nav-item"
            [class.active]="activeTab === 'profile'"
            (click)="activeTab = 'profile'">
            <span class="icon">👤</span>
            <span>Profildaten</span>
          </button>

          <button
            class="nav-item"
            [class.active]="activeTab === 'addresses'"
            (click)="activeTab = 'addresses'">
            <span class="icon">📍</span>
            <span>Adressen</span>
          </button>

          <button
            class="nav-item"
            [class.active]="activeTab === 'password'"
            (click)="activeTab = 'password'">
            <span class="icon">🔒</span>
            <span>Passwort ändern</span>
          </button>
        </nav>

        <!-- Content Area -->
        <div class="profile-main">

          <!-- Overview Tab -->
          <div *ngIf="activeTab === 'overview'" class="tab-content">
            <h2>Willkommen zurück, {{ profile?.email || 'Kunde' }}!</h2>

            <div class="overview-cards">
              <div class="overview-card">
                <div class="card-icon">📦</div>
                <div class="card-content">
                  <h3>{{ orderHistory.length }}</h3>
                  <p>Bestellungen</p>
                </div>
              </div>

              <div class="overview-card">
                <div class="card-icon">✅</div>
                <div class="card-content">
                  <h3>{{ getCompletedOrders() }}</h3>
                  <p>Abgeschlossen</p>
                </div>
              </div>

              <div class="overview-card">
                <div class="card-icon">🚚</div>
                <div class="card-content">
                  <h3>{{ getPendingOrders() }}</h3>
                  <p>In Bearbeitung</p>
                </div>
              </div>
            </div>

            <div class="recent-orders" *ngIf="orderHistory.length > 0">
              <h3>Letzte Bestellungen</h3>

              <div class="order-list-compact">
                <div class="order-item-compact" *ngFor="let order of orderHistory.slice(0, 3)">
                  <div class="order-info">
                    <strong>{{ order.orderNumber }}</strong>

                    <span class="order-date">
                      {{ order.createdAt ? (order.createdAt | date:'dd.MM.yyyy') : '-' }}
                    </span>
                  </div>

                  <span class="status-badge" [class]="'status-' + (order.status || 'PENDING').toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>

                    <strong class="order-total">{{ order.totalAmount | number:'1.2-2' }} €</strong>
                </div>
              </div>

              <button class="btn-secondary" (click)="activeTab = 'orders'">
                Alle Bestellungen ansehen
              </button>
            </div>
          </div>

          <!-- Orders Tab -->
          <div *ngIf="activeTab === 'orders'" class="tab-content">
            <h2>Meine Bestellungen</h2>

            <div *ngIf="loadingOrders" class="loading">
              <div class="spinner"></div>
              Bestellungen werden geladen...
            </div>

            <div *ngIf="!loadingOrders && orderHistory.length === 0" class="empty-state">
              <div class="empty-icon">📦</div>
              <h3>Keine Bestellungen gefunden</h3>
              <p>Sie haben noch keine Bestellungen aufgegeben.</p>
              <button class="btn-primary" (click)="goToShop()">Jetzt einkaufen</button>
            </div>

            <div *ngIf="!loadingOrders && orderHistory.length > 0" class="orders-list">
              <div class="order-card" *ngFor="let order of orderHistory">
                <div class="order-header">
                  <div>
                    <h3>Bestellung {{ order.orderNumber }}</h3>

                    <p class="order-date">
                      {{ order.createdAt ? (order.createdAt | date:'dd.MM.yyyy HH:mm') : '-' }}
                    </p>
                  </div>

                  <span class="status-badge" [class]="'status-' + (order.status || 'PENDING').toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </div>

                <div class="order-body">
                  <div class="order-detail">
                    <span class="label">Artikel:</span>
                      <span>{{ order.itemCount ?? 0 }} Stück</span>

                  </div>

                  <div class="order-detail">
                    <span class="label">Gesamtsumme:</span>
                      <strong class="total">{{ order.totalAmount | number:'1.2-2' }} €</strong>

                  </div>
                </div>

                <div class="order-actions">
                  <button class="btn-secondary" (click)="viewOrderDetails(order)">
                    Details ansehen
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
      .profile-container {
        min-height: 100vh;
        background: #f5f7fa;
        padding: 20px;
      }

      .profile-header {
        max-width: 1200px;
        margin: 0 auto 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .profile-header h1 {
        margin: 0;
        color: #333;
      }

      .btn-logout {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s;
      }

      .btn-logout:hover {
        background: #c82333;
      }

      .profile-content {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 20px;
      }

      .profile-nav {
        background: white;
        border-radius: 12px;
        padding: 10px;
        height: fit-content;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .nav-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: #666;
        cursor: pointer;
        border-radius: 8px;
        font-size: 15px;
        transition: all 0.3s;
        position: relative;
      }

      .nav-item:hover {
        background: #f8f9fa;
        color: #333;
      }

      .nav-item.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .nav-item .icon {
        font-size: 20px;
      }

      .nav-item .badge {
        margin-left: auto;
        background: #667eea;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .nav-item.active .badge {
        background: rgba(255,255,255,0.3);
      }

      .profile-main {
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .tab-content h2 {
        margin-top: 0;
        margin-bottom: 30px;
        color: #333;
      }

      .overview-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .overview-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .card-icon {
        font-size: 40px;
      }

      .card-content h3 {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
      }

      .card-content p {
        margin: 4px 0 0 0;
        opacity: 0.9;
        font-size: 14px;
      }

      .recent-orders {
        margin-top: 40px;
      }

      .recent-orders h3 {
        margin-bottom: 20px;
        color: #333;
      }

      .order-list-compact {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .order-item-compact {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: white;
        border-radius: 8px;
        margin-bottom: 10px;
      }

      .order-item-compact:last-child {
        margin-bottom: 0;
      }

      .order-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .order-date {
        font-size: 13px;
        color: #666;
      }

      .order-total {
        color: #667eea;
        font-size: 18px;
      }

      .orders-list {
        display: grid;
        gap: 20px;
      }

      .order-card {
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        transition: box-shadow 0.3s;
      }

      .order-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0f0f0;
      }

      .order-header h3 {
        margin: 0 0 4px 0;
        font-size: 18px;
      }

      .order-body {
        display: grid;
        gap: 12px;
        margin-bottom: 16px;
      }

      .order-detail {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .order-detail .label {
        color: #666;
        font-size: 14px;
      }

      .order-detail .total {
        color: #667eea;
        font-size: 20px;
      }

      .order-actions {
        display: flex;
        gap: 10px;
      }

      .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-pending {
        background: #fff3cd;
        color: #856404;
      }

      .status-confirmed, .status-processing {
        background: #d1ecf1;
        color: #0c5460;
      }

      .status-shipped, .status-delivered {
        background: #d4edda;
        color: #155724;
      }

      .status-cancelled {
        background: #f8d7da;
        color: #721c24;
      }

      .loading, .empty-state {
        text-align: center;
        padding: 60px 20px;
      }

      .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .empty-icon {
        font-size: 80px;
        margin-bottom: 20px;
      }

      .empty-state h3 {
        margin: 0 0 10px 0;
        color: #333;
      }

      .empty-state p {
        color: #666;
        margin-bottom: 30px;
      }

      @media (max-width: 768px) {
        .profile-content {
          grid-template-columns: 1fr;
        }

        .profile-nav {
          display: flex;
          overflow-x: auto;
          padding: 10px;
        }

        .nav-item {
          flex-shrink: 0;
          min-width: 140px;
        }

        .overview-cards {
          grid-template-columns: 1fr;
        }
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
        private router: Router
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
        const labels: Record<string, string> = {
            PENDING: 'Ausstehend',
            CONFIRMED: 'Bestätigt',
            PROCESSING: 'In Bearbeitung',
            SHIPPED: 'Versandt',
            DELIVERED: 'Zugestellt',
            CANCELLED: 'Storniert'
        };

        const key = (status ?? '').toUpperCase();
        return labels[key] || status || 'Ausstehend';
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
}
