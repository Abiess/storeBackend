import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus, Address } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { toDate } from '../../core/utils/date.utils';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  selector: 'app-store-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent, TranslatePipe, ResponsiveDataListComponent],
  template: `
    <div class="store-orders-container">
      <app-store-navigation
        [currentPage]="'navigation.orders' | translate">
      </app-store-navigation>

      <div class="header-content">
        <h1>{{ 'navigation.orders' | translate }}</h1>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadOrders()">
            🔄 {{ 'common.refresh' | translate }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="orders-stats" *ngIf="!loading">
        <div class="stat-card">
          <h3>{{ orders.length }}</h3>
          <p>{{ 'order.totalOrders' | translate }}</p>
        </div>
        <div class="stat-card">
          <h3>{{ getPendingCount() }}</h3>
          <p>{{ 'order.pending' | translate }}</p>
        </div>
        <div class="stat-card">
          <h3>{{ getProcessingCount() }}</h3>
          <p>{{ 'order.processing' | translate }}</p>
        </div>
        <div class="stat-card">
          <h3>{{ getTotalRevenue() | currency:'EUR' }}</h3>
          <p>{{ 'order.totalRevenue' | translate }}</p>
        </div>
      </div>

      <!-- Filter -->
      <div class="orders-filters">
        <div class="filter-group">
          <label>{{ 'order.status' | translate }}:</label>
          <select [(ngModel)]="filterStatus" (change)="applyFilters()" class="form-control">
            <option value="">{{ 'common.all' | translate }}</option>
            <option value="PENDING">{{ 'status.pending' | translate }}</option>
            <option value="CONFIRMED">{{ 'status.confirmed' | translate }}</option>
            <option value="PROCESSING">{{ 'status.processing' | translate }}</option>
            <option value="SHIPPED">{{ 'status.shipped' | translate }}</option>
            <option value="DELIVERED">{{ 'status.delivered' | translate }}</option>
            <option value="CANCELLED">{{ 'status.cancelled' | translate }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>{{ 'common.search' | translate }}:</label>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (input)="applyFilters()"
            placeholder="{{ 'order.searchPlaceholder' | translate }}"
            class="form-control">
        </div>
      </div>

      <!-- Error -->
      <div class="error" *ngIf="error && !loading">
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadOrders()">{{ 'common.retry' | translate }}</button>
      </div>

      <!-- Responsive List: Desktop Tabelle / Mobile Cards -->
      <app-responsive-data-list
        [items]="filteredOrders"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [emptyMessage]="(searchTerm || filterStatus) ? ('order.tryDifferentFilters' | translate) : ('order.noOrdersYet' | translate)"
        emptyIcon="📦"
        [loadingMessage]="'loading.orders' | translate"
        [rowClickable]="true"
        (rowClick)="navigateToOrder($event.id)">
      </app-responsive-data-list>
    </div>

    <!-- Detail-Modal -->
    <div class="modal" *ngIf="selectedOrder" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ 'order.orderDetails' | translate }} {{ selectedOrder.orderNumber }}</h2>
          <button class="close-button" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info">
            <h3>{{ 'order.customerInfo' | translate }}</h3>
            <p><strong>Email:</strong> {{ selectedOrder.customerEmail }}</p>
            <p><strong>{{ 'order.date' | translate }}:</strong>
              {{ toDate(selectedOrder.createdAt) | date:'dd.MM.yyyy HH:mm' }}
            </p>
            <p><strong>{{ 'order.status' | translate }}:</strong>
              <span class="status-badge" [ngClass]="'status-' + selectedOrder.status.toLowerCase()">
                {{ getStatusLabel(selectedOrder.status) }}
              </span>
            </p>
          </div>
          <div class="order-info" *ngIf="getAddressObject(selectedOrder.shippingAddress) as address">
            <h3>{{ 'order.shippingAddress' | translate }}</h3>
            <p>{{ address.firstName }} {{ address.lastName }}</p>
            <p>{{ address.address1 }}</p>
            <p *ngIf="address.address2">{{ address.address2 }}</p>
            <p>{{ address.postalCode }} {{ address.city }}</p>
            <p>{{ address.country }}</p>
          </div>
          <div class="order-info" *ngIf="selectedOrder.items && selectedOrder.items.length > 0">
            <h3>{{ 'order.orderedItems' | translate }}</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>{{ 'order.item' | translate }}</th>
                  <th>{{ 'order.quantity' | translate }}</th>
                  <th>{{ 'order.price' | translate }}</th>
                  <th>{{ 'order.total' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of selectedOrder.items">
                  <td>{{ getItemName(item) }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ (item.price || 0) | currency:'EUR' }}</td>
                  <td>{{ ((item.price || 0) * item.quantity) | currency:'EUR' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3"><strong>{{ 'order.grandTotal' | translate }}:</strong></td>
                  <td><strong>{{ (selectedOrder.totalAmount || 0) | currency:'EUR' }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="closeModal()">{{ 'common.close' | translate }}</button>
          <button class="btn btn-primary" (click)="navigateToOrder(selectedOrder.id)">
            {{ 'order.viewDetails' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-orders-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .header-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h1 { font-size: 2rem; margin: 0; }
    .orders-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: white;
      padding: 1.25rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      text-align: center;
    }
    .stat-card h3 { margin: 0; font-size: 1.75rem; color: var(--theme-primary, #007bff); }
    .stat-card p { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; }
    .orders-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      flex-wrap: wrap;
    }
    .filter-group { flex: 1; min-width: 200px; }
    .filter-group label { display: block; margin-bottom: 0.4rem; font-weight: 600; color: #333; font-size: 0.875rem; }
    .form-control { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
    .error { text-align: center; padding: 2rem; background: white; border-radius: 8px; color: #dc3545; margin-bottom: 1rem; }
    .btn { padding: 0.6rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
    .btn-primary { background: var(--theme-primary, #007bff); color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-confirmed, .status-processing { background: #d1ecf1; color: #0c5460; }
    .status-shipped { background: #cce5ff; color: #004085; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 8px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
    .modal-header h2 { margin: 0; font-size: 1.25rem; }
    .close-button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
    .modal-body { padding: 1.5rem; }
    .order-info { margin-bottom: 1.5rem; }
    .order-info h3 { margin: 0 0 0.75rem; color: #333; font-size: 1rem; }
    .order-info p { margin: 0.35rem 0; font-size: 0.9rem; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    .items-table th, .items-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.875rem; text-align: left; }
    .items-table tfoot td { border-top: 2px solid #333; font-weight: 600; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.5rem; border-top: 1px solid #e0e0e0; }
    @media (max-width: 640px) {
      .store-orders-container { padding: 1rem; }
      .orders-filters { flex-direction: column; gap: 0.75rem; }
    }
  `]
})
export class StoreOrdersComponent implements OnInit {
  storeId!: number;
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = false;
  error: string | null = null;
  filterStatus = '';
  searchTerm = '';
  editingOrderId: number | null = null;
  updatingStatus = false;

  // toDate für Template-Nutzung
  toDate = toDate;

  availableStatuses: OrderStatus[] = [
    OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING,
    OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED
  ];

  // Spalten-Konfiguration für responsive-data-list
  columns: ColumnConfig[] = [
    {
      key: 'orderNumber',
      label: 'Bestellnr.',
      type: 'text',
      mobileLabel: 'Bestellung',
      formatFn: (value) => value || '-'
    },
    {
      key: 'customerEmail',
      label: 'Kunde',
      type: 'text',
      mobileLabel: 'Kunde',
      formatFn: (value, item) => item.customerName ? `${item.customerName}  ${value}` : value
    },
    {
      key: 'createdAt',
      label: 'Datum',
      type: 'text',
      mobileLabel: 'Datum',
      formatFn: (value) => {
        const d = toDate(value);
        return d ? d.toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) : '-';
      }
    },
    {
      key: 'totalAmount',
      label: 'Betrag',
      type: 'currency',
      mobileLabel: 'Betrag'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      mobileLabel: 'Status',
      formatFn: (value) => this.getStatusLabel(value),
      badgeClass: (value) => `status-${(value as string).toLowerCase()}`
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '👁️',
      label: 'Details',
      handler: (order) => this.navigateToOrder(order.id)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      if (!storeIdParam || isNaN(+storeIdParam)) {
        console.error('❌ StoreOrdersComponent: Keine gültige storeId:', params);
        this.error = 'Ungültige Store-ID';
        return;
      }
      this.storeId = +storeIdParam;
      this.loadOrders();
    });
  }

  loadOrders(): void {
    if (!this.storeId || isNaN(this.storeId)) {
      this.error = 'Ungültige Store-ID';
      return;
    }
    this.loading = true;
    this.error = null;
    this.orderService.getStoreOrders(this.storeId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Bestellungen';
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredOrders = this.orders.filter(order => {
      const matchesStatus = !this.filterStatus || order.status === this.filterStatus;
      const matchesSearch = !this.searchTerm ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        order.customerEmail.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  getPendingCount(): number {
    return this.orders.filter(o => o.status === 'PENDING').length;
  }

  getProcessingCount(): number {
    return this.orders.filter(o => o.status === 'PROCESSING' || o.status === 'CONFIRMED').length;
  }

  getTotalRevenue(): number {
    return this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Ausstehend', 'CONFIRMED': 'Bestätigt',
      'PROCESSING': 'In Bearbeitung', 'SHIPPED': 'Versandt',
      'DELIVERED': 'Zugestellt', 'CANCELLED': 'Storniert'
    };
    return labels[status] || status;
  }

  navigateToOrder(orderId: number): void {
    const url = this.router.url;
    if (url.startsWith('/dashboard/')) {
      this.router.navigate(['/dashboard/stores', this.storeId, 'orders', orderId]);
    } else {
      this.router.navigate(['/stores', this.storeId, 'orders', orderId]);
    }
  }

  closeModal(): void {
    this.selectedOrder = null;
  }

  updateOrderStatus(order: Order): void {
    this.editingOrderId = order.id;
  }

  cancelStatusEdit(): void {
    this.editingOrderId = null;
  }

  saveOrderStatus(order: Order, newStatus: OrderStatus): void {
    if (newStatus === order.status) { this.editingOrderId = null; return; }
    this.updatingStatus = true;
    this.orderService.updateOrderStatus(this.storeId, order.id, newStatus).subscribe({
      next: (updatedOrder) => {
        const index = this.orders.findIndex(o => o.id === order.id);
        if (index !== -1) { this.orders[index] = updatedOrder; this.applyFilters(); }
        if (this.selectedOrder?.id === order.id) this.selectedOrder = updatedOrder;
        this.editingOrderId = null;
        this.updatingStatus = false;
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.error = 'Fehler beim Aktualisieren des Status';
        this.updatingStatus = false;
      }
    });
  }

  isEditingStatus(orderId: number): boolean {
    return this.editingOrderId === orderId;
  }

  getAddressObject(address: string | Address | undefined): Address | null {
    if (!address || typeof address === 'string') return null;
    return address;
  }

  getItemName(item: any): string {
    return item.productTitle || item.productName || item.name || 'Unbekanntes Produkt';
  }
}

