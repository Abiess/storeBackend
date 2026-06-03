import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@app/core/services/auth.service';
import { Order, OrderStatus } from '@app/core/models';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';
import {
  ResponsiveDataListComponent,
  ColumnConfig,
  ActionConfig
} from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ResponsiveDataListComponent],
  template: `
    <div class="order-history-page">
      <!-- Page Header -->
      <div class="page-top">
        <a routerLink="/customer" class="back-link">← Mein Konto</a>
        <h1>📦 Bestellhistorie</h1>
        <p class="subtitle">Alle Ihre Bestellungen auf einen Blick</p>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="statusFilter" (change)="applyFilter()" class="filter-select">
            <option value="">Alle Status</option>
            <option value="PENDING">Ausstehend</option>
            <option value="CONFIRMED">Bestätigt</option>
            <option value="PROCESSING">In Bearbeitung</option>
            <option value="SHIPPED">Versandt</option>
            <option value="DELIVERED">Zugestellt</option>
            <option value="CANCELLED">Storniert</option>
            <option value="REFUNDED">Erstattet</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Von</label>
          <input type="date" [(ngModel)]="dateFrom" (change)="applyFilter()" class="filter-input">
        </div>

        <div class="filter-group">
          <label>Bis</label>
          <input type="date" [(ngModel)]="dateTo" (change)="applyFilter()" class="filter-input">
        </div>

        <button class="btn-reset" (click)="resetFilter()">✕ Filter zurücksetzen</button>
      </div>

      <!-- Summary Bar -->
      @if (!loading && filteredOrders.length > 0) {
        <div class="summary-bar">
          <div class="summary-item">
            <span class="summary-value">{{ filteredOrders.length }}</span>
            <span class="summary-label">Bestellungen</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ getTotalSpent() | currency:'EUR' }}</span>
            <span class="summary-label">Gesamtausgaben</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ getDeliveredCount() }}</span>
            <span class="summary-label">Zugestellt</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ getPendingCount() }}</span>
            <span class="summary-label">In Bearbeitung</span>
          </div>
        </div>
      }

      <!-- Orders List -->
      <div class="orders-container">
        <app-responsive-data-list
          [items]="filteredOrders"
          [columns]="columns"
          [actions]="actions"
          [loading]="loading"
          searchPlaceholder="Bestellnummer oder Betrag suchen..."
          emptyIcon="📦"
          emptyMessage="Keine Bestellungen gefunden"
        ></app-responsive-data-list>
      </div>

      <!-- Order Detail Modal -->
      @if (selectedOrder) {
        <div class="modal-overlay" (click)="closeDetail()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Bestellung #{{ selectedOrder.orderNumber || selectedOrder.id }}</h3>
              <button class="modal-close" (click)="closeDetail()">✕</button>
            </div>
            <div class="modal-body">
              <div class="detail-grid">
                <div class="detail-section">
                  <h4>Status</h4>
                  <span class="order-badge" [class]="getBadgeClass(selectedOrder.status)">
                    {{ getStatusLabel(selectedOrder.status) }}
                  </span>
                </div>
                <div class="detail-section">
                  <h4>Datum</h4>
                  <p>{{ selectedOrder.createdAt | date:'dd.MM.yyyy HH:mm' }}</p>
                </div>
                <div class="detail-section">
                  <h4>Gesamtbetrag</h4>
                  <p class="total-amount">{{ selectedOrder.totalAmount | currency:'EUR' }}</p>
                </div>
                <div class="detail-section">
                  <h4>Zahlungsmethode</h4>
                  <p>{{ selectedOrder.paymentMethod || '—' }}</p>
                </div>
              </div>

              @if (selectedOrder.trackingNumber) {
                <div class="tracking-box">
                  <h4>📦 Sendungsverfolgung</h4>
                  <div class="tracking-info">
                    <span>{{ selectedOrder.trackingCarrier || 'Carrier' }}</span>
                    <strong>{{ selectedOrder.trackingNumber }}</strong>
                    @if (selectedOrder.trackingUrl) {
                      <a [href]="selectedOrder.trackingUrl" target="_blank" class="track-btn">Verfolgen →</a>
                    }
                  </div>
                </div>
              }

              @if (selectedOrder.items?.length) {
                <div class="items-section">
                  <h4>Artikel ({{ selectedOrder.items!.length }})</h4>
                  <div class="items-list">
                    @for (item of selectedOrder.items!; track item.id) {
                      <div class="item-row">
                        <div class="item-name">{{ item.productTitle || item.productName || item.name || 'Produkt' }}</div>
                        <div class="item-qty">× {{ item.quantity }}</div>
                        <div class="item-price">{{ item.price | currency:'EUR' }}</div>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (selectedOrder.shippingAddress) {
                <div class="address-section">
                  <h4>📍 Lieferadresse</h4>
                  <p>{{ formatAddress(selectedOrder.shippingAddress) }}</p>
                </div>
              }

              @if (selectedOrder.notes) {
                <div class="notes-section">
                  <h4>📝 Anmerkungen</h4>
                  <p>{{ selectedOrder.notes }}</p>
                </div>
              }
            </div>
            <div class="modal-footer">
              @if (canCancel(selectedOrder)) {
                <button class="btn btn-danger" (click)="cancelOrder(selectedOrder)">Stornieren</button>
              }
              <button class="btn btn-secondary" (click)="closeDetail()">Schließen</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .order-history-page { padding: 2rem; max-width: 1100px; margin: 0 auto; }

    .page-top { margin-bottom: 2rem; }
    .back-link { color: #667eea; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-top h1 { margin: 0.75rem 0 0.25rem; font-size: 1.75rem; font-weight: 800; color: #1f2937; }
    .subtitle { margin: 0; color: #6b7280; }

    /* Filter */
    .filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      background: white;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .filter-group label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .filter-select, .filter-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
      color: #374151;
    }
    .filter-select:focus, .filter-input:focus { outline: none; border-color: #667eea; }
    .btn-reset {
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      color: #6b7280;
      align-self: flex-end;
      transition: all 0.2s;
    }
    .btn-reset:hover { background: #e5e7eb; }

    /* Summary */
    .summary-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-item {
      background: white;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    .summary-value { display: block; font-size: 1.5rem; font-weight: 800; color: #1f2937; }
    .summary-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }

    .orders-container { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }

    /* Status Badges */
    .order-badge { display: inline-flex; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-confirmed { background: #dbeafe; color: #1e40af; }
    .badge-processing { background: #e0e7ff; color: #3730a3; }
    .badge-shipped { background: #d1fae5; color: #065f46; }
    .badge-delivered { background: #dcfce7; color: #166534; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .badge-refunded { background: #f3f4f6; color: #374151; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal { background: white; border-radius: 16px; width: 600px; max-width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.3); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: white; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .modal-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280; padding: 0.25rem; }
    .modal-body { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 1.25rem 2rem; border-top: 1px solid #e5e7eb; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-section h4 { margin: 0 0 0.4rem; font-size: 0.8rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }
    .detail-section p { margin: 0; color: #1f2937; font-weight: 600; }
    .total-amount { font-size: 1.25rem; color: #667eea !important; }

    .tracking-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1rem 1.25rem; }
    .tracking-box h4 { margin: 0 0 0.75rem; color: #0369a1; }
    .tracking-info { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .tracking-info strong { font-family: monospace; background: white; padding: 0.25rem 0.75rem; border-radius: 4px; border: 1px solid #bae6fd; }
    .track-btn { color: #0369a1; font-weight: 600; text-decoration: none; margin-left: auto; }

    .items-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .item-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; }
    .item-name { flex: 1; color: #374151; }
    .item-qty { color: #6b7280; font-size: 0.875rem; }
    .item-price { font-weight: 600; color: #1f2937; }
    .items-section h4, .address-section h4, .notes-section h4 { margin: 0 0 0.75rem; color: #374151; }
    .address-section p, .notes-section p { margin: 0; color: #6b7280; font-size: 0.9rem; }

    .btn { padding: 0.6rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-danger { background: #ef4444; color: white; }

    @media (max-width: 768px) {
      .order-history-page { padding: 1rem; }
      .summary-bar { grid-template-columns: repeat(2, 1fr); }
      .detail-grid { grid-template-columns: 1fr; }
      .filter-bar { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class OrderHistoryComponent implements OnInit {
  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  loading = true;
  selectedOrder: Order | null = null;

  statusFilter = '';
  dateFrom = '';
  dateTo = '';

  columns: ColumnConfig[] = [
    {
      key: 'orderNumber',
      label: 'Bestellnr.',
      type: 'text',
      formatFn: (v, item) => v || `#${item.id}`
    },
    {
      key: 'createdAt',
      label: 'Datum',
      type: 'date'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      badgeClass: (v) => this.getBadgeClass(v),
      formatFn: (v) => this.getStatusLabel(v)
    },
    {
      key: 'items',
      label: 'Artikel',
      type: 'text',
      formatFn: (v) => `${v?.length ?? 0} Artikel`,
      hideOnMobile: true
    },
    {
      key: 'totalAmount',
      label: 'Betrag',
      type: 'currency'
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '👁️',
      label: 'Details',
      handler: (item: Order) => this.openDetail(item)
    }
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.http.get<any>(`${environment.apiUrl}/public/customer/orders`)
      .pipe(catchError(() => of([])))
      .subscribe((response: any) => {
        const raw: any[] = Array.isArray(response) ? response : (response?.orders ?? response?.content ?? []);
        this.allOrders = raw.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          storeId: o.storeId ?? 0,
          status: o.status as OrderStatus,
          totalAmount: o.totalAmount ?? 0,
          customerEmail: o.customerEmail ?? '',
          customerName: o.customerName ?? '',
          items: o.items ?? [],
          createdAt: o.createdAt ?? new Date().toISOString(),
          updatedAt: o.updatedAt ?? new Date().toISOString(),
          paymentMethod: o.paymentMethod,
          trackingNumber: o.trackingNumber,
          trackingCarrier: o.trackingCarrier,
          trackingUrl: o.trackingUrl,
          shippingAddress: o.shippingAddress,
          notes: o.notes
        }));
        this.applyFilter();
        this.loading = false;
      });
  }

  applyFilter(): void {
    let orders = [...this.allOrders];

    if (this.statusFilter) {
      orders = orders.filter(o => o.status === this.statusFilter);
    }
    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      orders = orders.filter(o => new Date(o.createdAt) >= from);
    }
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59);
      orders = orders.filter(o => new Date(o.createdAt) <= to);
    }

    this.filteredOrders = orders;
  }

  resetFilter(): void {
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilter();
  }

  getTotalSpent(): number {
    return this.filteredOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }

  getDeliveredCount(): number {
    return this.filteredOrders.filter(o => o.status === OrderStatus.DELIVERED).length;
  }

  getPendingCount(): number {
    return this.filteredOrders.filter(o =>
      [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(o.status)
    ).length;
  }

  openDetail(order: Order): void {
    this.selectedOrder = order;
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  canCancel(order: Order): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status);
  }

  cancelOrder(order: Order): void {
    if (!confirm('Bestellung wirklich stornieren?')) return;
    this.http.post(`${environment.apiUrl}/stores/${order.storeId}/orders/${order.id}/cancel`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        const idx = this.allOrders.findIndex(o => o.id === order.id);
        if (idx >= 0) this.allOrders[idx] = { ...this.allOrders[idx], status: OrderStatus.CANCELLED };
        this.applyFilter();
        this.closeDetail();
      });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'PENDING': 'Ausstehend', 'CONFIRMED': 'Bestätigt',
      'PROCESSING': 'In Bearbeitung', 'SHIPPED': 'Versandt',
      'DELIVERED': 'Zugestellt', 'CANCELLED': 'Storniert', 'REFUNDED': 'Erstattet'
    };
    return map[status] ?? status;
  }

  getBadgeClass(status: string): string {
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

  formatAddress(address: any): string {
    if (!address) return '—';
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch { return address; }
    }
    return [address.firstName, address.lastName, address.address1, address.city, address.country]
      .filter(Boolean).join(', ');
  }
}
