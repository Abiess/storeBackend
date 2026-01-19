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

/**
 * Sicheres ViewModel für die UI:
 * - createdAt ist immer Date | null (DatePipe-safe)
 * - totalAmount/itemCount sind immer number (DecimalPipe-safe)
 * - status ist immer string (toLowerCase-safe)
 */
interface OrderHistoryVM {
    orderNumber: string;
    createdAt: Date | null;
    totalAmount: number;
    itemCount: number;
    status: string;
    raw: OrderHistory; // optional: Originalobjekt behalten (debug/Details)
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

        <div class="profile-main">
          <!-- Overview -->
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

                  <span class="status-badge" [class]="'status-' + order.status.toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>

                  <strong class="order-total">
                    {{ order.totalAmount | number:'1.2-2' }} €
                  </strong>
                </div>
              </div>

              <button class="btn-secondary" (click)="activeTab = 'orders'">
                Alle Bestellungen ansehen
              </button>
            </div>
          </div>

          <!-- Orders -->
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

                  <span class="status-badge" [class]="'status-' + order.status.toLowerCase()">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </div>

                <div class="order-body">
                  <div class="order-detail">
                    <span class="label">Artikel:</span>
                    <span>{{ order.itemCount }} Stück</span>
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

          <!-- Profile -->
          <div *ngIf="activeTab === 'profile'" class="tab-content">
            <app-customer-profile-edit
              [profile]="profile"
              (profileUpdated)="onProfileUpdated($event)">
            </app-customer-profile-edit>
          </div>

          <!-- Addresses -->
          <div *ngIf="activeTab === 'addresses'" class="tab-content">
            <app-customer-addresses
              [profile]="profile"
              (addressUpdated)="onAddressUpdated()">
            </app-customer-addresses>
          </div>

          <!-- Password -->
          <div *ngIf="activeTab === 'password'" class="tab-content">
            <app-customer-password-change></app-customer-password-change>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [``] // deine Styles kannst du wie gehabt lassen
})
export class CustomerProfileComponent implements OnInit {
    activeTab: CustomerTab = 'overview';

    profile: CustomerProfile | null = null;

    // Wichtig: UI arbeitet nur noch mit VM
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
            next: (orders) => {
                const safeOrders = (orders ?? []).map(o => this.toOrderVM(o));
                this.orderHistory = safeOrders;
                this.loadingOrders = false;
            },
            error: (error) => {
                console.error('❌ Fehler beim Laden der Bestellhistorie:', error);
                this.loadingOrders = false;
                this.orderHistory = [];
            }
        });
    }

    private toOrderVM(order: OrderHistory): OrderHistoryVM {
        // Achtung: weil wir dein echtes Interface nicht sehen, greifen wir defensiv zu.
        const anyOrder = order as any;

        // Falls deine API andere Feldnamen hat, kannst du hier sehr leicht anpassen:
        const orderNumber = String(anyOrder?.orderNumber ?? anyOrder?.orderNo ?? anyOrder?.number ?? '');
        const status = String(anyOrder?.status ?? 'PENDING');

        // createdAt: kann Date | ISO | timestamp | sonstwas sein
        const createdAt = this.toDateOrNull(anyOrder?.createdAt ?? anyOrder?.created_at ?? anyOrder?.created);

        // Zahlen: kann number | "12.34" | "12,34" | null sein
        const totalAmount =
            this.toNumberOrNull(anyOrder?.totalAmount ?? anyOrder?.total ?? anyOrder?.amount) ?? 0;

        const itemCount =
            this.toNumberOrNull(anyOrder?.itemCount ?? anyOrder?.items ?? anyOrder?.quantity) ?? 0;

        return {
            orderNumber: orderNumber || '(ohne Nummer)',
            createdAt,
            totalAmount,
            itemCount,
            status,
            raw: order
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
            // ISO klappt direkt. Nicht-ISO probieren wir trotzdem.
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }

        return null;
    }

    private toNumberOrNull(value: unknown): number | null {
        if (value === null || value === undefined || value === '') return null;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }

        if (typeof value === 'string') {
            // "12,34" -> "12.34"
            const normalized = value.replace(/\s/g, '').replace(',', '.');
            const n = Number(normalized);
            return Number.isFinite(n) ? n : null;
        }

        return null;
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

        // falls Status schon klein ist oder anders kommt
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

    // wichtig: nimmt jetzt OrderHistoryVM
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
