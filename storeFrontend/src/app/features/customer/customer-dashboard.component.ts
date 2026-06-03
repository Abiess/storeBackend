import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@app/core/services/auth.service';
import { User, OrderStatus } from '@app/core/models';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

interface QuickStat {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  route: string;
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="customer-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="avatar">{{ userInitials }}</div>
          <div class="header-info">
            <h1>Willkommen zurück{{ userName ? ', ' + userName : '' }}!</h1>
            <p>{{ userEmail }}</p>
          </div>
        </div>
        <button class="btn-logout" (click)="logout()">Abmelden</button>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        @for (stat of stats; track stat.label) {
          <div class="stat-card" [style.--accent]="stat.color" [routerLink]="stat.route">
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-body">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
              @if (stat.sub) {
                <div class="stat-sub">{{ stat.sub }}</div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Navigation Cards -->
      <div class="nav-section">
        <h2>Mein Konto</h2>
        <div class="nav-grid">
          @for (card of navCards; track card.title) {
            <div class="nav-card" [routerLink]="card.route">
              <div class="nav-icon">{{ card.icon }}</div>
              <div class="nav-info">
                <div class="nav-title">{{ card.title }}</div>
                <div class="nav-desc">{{ card.desc }}</div>
              </div>
              <div class="nav-arrow">›</div>
            </div>
          }
        </div>
      </div>

      <!-- Letzte Bestellungen -->
      <div class="recent-section">
        <div class="section-header">
          <h2>Letzte Bestellungen</h2>
          <a routerLink="/customer/orders" class="view-all">Alle anzeigen →</a>
        </div>

        @if (loadingOrders) {
          <div class="loading-orders">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-row"></div>
            }
          </div>
        } @else if (recentOrders.length === 0) {
          <div class="empty-orders">
            <div class="empty-icon">📦</div>
            <p>Noch keine Bestellungen vorhanden.</p>
            <a routerLink="/" class="btn-shop">Jetzt einkaufen</a>
          </div>
        } @else {
          <div class="orders-list">
            @for (order of recentOrders; track order.id) {
              <div class="order-row" [routerLink]="['/customer/orders']">
                <div class="order-num">
                  <span class="order-label">Bestellung</span>
                  <strong>#{{ order.orderNumber || order.id }}</strong>
                </div>
                <div class="order-date">{{ order.createdAt | date:'dd.MM.yyyy' }}</div>
                <div class="order-items">{{ order.itemCount }} Artikel</div>
                <div class="order-badge" [class]="getStatusClass(order.status)">
                  {{ getStatusLabel(order.status) }}
                </div>
                <div class="order-amount">{{ order.totalAmount | currency:'EUR' }}</div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .customer-page {
      min-height: 100vh;
      background: #f8fafc;
      padding: 2rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 2rem 2.5rem;
      margin-bottom: 2rem;
      color: white;
    }
    .header-content { display: flex; align-items: center; gap: 1.25rem; }
    .avatar {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 700;
    }
    .header-info h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
    .header-info p { margin: 0.25rem 0 0; opacity: 0.85; font-size: 0.9rem; }
    .btn-logout {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.35);
      color: white;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.3); }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
      border-left: 4px solid var(--accent, #667eea);
    }
    .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); }
    .stat-icon { font-size: 2rem; }
    .stat-value { font-size: 1.5rem; font-weight: 800; color: #1f2937; }
    .stat-label { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
    .stat-sub { font-size: 0.75rem; color: #9ca3af; margin-top: 0.2rem; }

    /* Navigation */
    .nav-section { margin-bottom: 2rem; }
    .nav-section h2 { font-size: 1.1rem; font-weight: 700; color: #374151; margin: 0 0 1rem; }
    .nav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .nav-card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
    }
    .nav-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.15); }
    .nav-icon { font-size: 1.75rem; }
    .nav-info { flex: 1; }
    .nav-title { font-weight: 700; color: #1f2937; font-size: 0.95rem; }
    .nav-desc { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; }
    .nav-arrow { color: #9ca3af; font-size: 1.5rem; }

    /* Recent Orders */
    .recent-section { background: white; border-radius: 12px; padding: 1.5rem 2rem; border: 1px solid #e5e7eb; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .section-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #374151; }
    .view-all { color: #667eea; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
    .view-all:hover { text-decoration: underline; }

    .loading-orders { display: flex; flex-direction: column; gap: 0.75rem; }
    .skeleton-row { height: 52px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .empty-orders { text-align: center; padding: 3rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-orders p { color: #6b7280; margin: 0 0 1.25rem; }
    .btn-shop {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .orders-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .order-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
      align-items: center;
      padding: 0.875rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid #f3f4f6;
      transition: all 0.15s;
    }
    .order-row:hover { background: #f9fafb; border-color: #e5e7eb; }
    .order-label { font-size: 0.7rem; color: #9ca3af; display: block; }
    .order-num strong { font-size: 0.9rem; color: #1f2937; }
    .order-date { font-size: 0.85rem; color: #6b7280; }
    .order-items { font-size: 0.85rem; color: #6b7280; }
    .order-amount { font-weight: 700; color: #1f2937; text-align: right; }

    .order-badge {
      display: inline-flex;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-confirmed { background: #dbeafe; color: #1e40af; }
    .badge-processing { background: #e0e7ff; color: #3730a3; }
    .badge-shipped { background: #d1fae5; color: #065f46; }
    .badge-delivered { background: #dcfce7; color: #166534; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .badge-refunded { background: #f3f4f6; color: #374151; }

    @media (max-width: 768px) {
      .customer-page { padding: 1rem; }
      .page-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .nav-grid { grid-template-columns: 1fr; }
      .order-row { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .order-date, .order-items { display: none; }
    }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  recentOrders: RecentOrder[] = [];
  loadingOrders = true;

  stats: QuickStat[] = [];

  navCards = [
    { icon: '📦', title: 'Bestellungen', desc: 'Alle Bestellungen und Status', route: '/customer/orders' },
    { icon: '❤️', title: 'Wunschliste', desc: 'Gespeicherte Produkte', route: '/customer/wishlist' },
    { icon: '🛒', title: 'Warenkörbe', desc: 'Gespeicherte Warenkörbe', route: '/customer/saved-carts' },
    { icon: '📍', title: 'Adressbuch', desc: 'Liefer- und Rechnungsadressen', route: '/customer/addresses' }
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.buildStats();
    });
    this.loadRecentOrders();
  }

  get userName(): string {
    return this.currentUser?.name ?? '';
  }

  get userEmail(): string {
    return this.currentUser?.email ?? '';
  }

  get userInitials(): string {
    const name = this.currentUser?.name ?? this.currentUser?.email ?? 'U';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  private buildStats(): void {
    this.stats = [
      { icon: '📦', label: 'Bestellungen', value: this.recentOrders.length || '—', color: '#667eea', route: '/customer/orders' },
      { icon: '❤️', label: 'Wunschliste', value: '—', color: '#ef4444', route: '/customer/wishlist' },
      { icon: '📍', label: 'Adressen', value: '—', color: '#10b981', route: '/customer/addresses' },
      { icon: '👤', label: 'Mitglied seit', value: this.getMemberSince(), color: '#f59e0b', route: '/settings' }
    ];
  }

  private getMemberSince(): string {
    if (!this.currentUser?.createdAt) return '—';
    return new Date(this.currentUser.createdAt).getFullYear().toString();
  }

  loadRecentOrders(): void {
    this.http.get<any[]>(`${environment.apiUrl}/public/customer/orders`)
      .pipe(catchError(() => of([])))
      .subscribe((orders: any[]) => {
        this.recentOrders = (orders || []).slice(0, 5).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber || `#${o.id}`,
          status: o.status as OrderStatus,
          totalAmount: o.totalAmount || 0,
          createdAt: o.createdAt || new Date().toISOString(),
          itemCount: o.items?.length ?? o.itemCount ?? 0
        }));
        this.buildStats();
        this.loadingOrders = false;
      });
  }

  getStatusLabel(status: OrderStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'Ausstehend', 'CONFIRMED': 'Bestätigt',
      'PROCESSING': 'In Bearbeitung', 'SHIPPED': 'Versandt',
      'DELIVERED': 'Zugestellt', 'CANCELLED': 'Storniert', 'REFUNDED': 'Erstattet'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: OrderStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'order-badge badge-pending',
      'CONFIRMED': 'order-badge badge-confirmed',
      'PROCESSING': 'order-badge badge-processing',
      'SHIPPED': 'order-badge badge-shipped',
      'DELIVERED': 'order-badge badge-delivered',
      'CANCELLED': 'order-badge badge-cancelled',
      'REFUNDED': 'order-badge badge-refunded'
    };
    return map[status] ?? 'order-badge badge-pending';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
