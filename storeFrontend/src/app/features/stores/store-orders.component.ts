import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus, Address } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-store-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent, TranslatePipe],
  template: `
    <div class="store-orders-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [storeId]="storeId" 
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

      <div class="orders-filters">
        <div class="filter-group">
          <label>{{ 'order.status' | translate }}:</label>
          <select [(ngModel)]="filterStatus" (change)="applyFilters()" class="form-control">
            <option value="">{{ 'common.all' | translate }}</option>
            <option value="PENDING">{{ 'order.pending' | translate }}</option>
            <option value="CONFIRMED">{{ 'order.confirmed' | translate }}</option>
            <option value="PROCESSING">{{ 'order.processing' | translate }}</option>
            <option value="SHIPPED">{{ 'order.shipped' | translate }}</option>
            <option value="DELIVERED">{{ 'order.delivered' | translate }}</option>
            <option value="CANCELLED">{{ 'order.cancelled' | translate }}</option>
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

      <div class="orders-table" *ngIf="!loading && filteredOrders.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ 'order.orderNumber' | translate }}</th>
              <th>{{ 'order.customer' | translate }}</th>
              <th>{{ 'order.date' | translate }}</th>
              <th>{{ 'order.amount' | translate }}</th>
              <th>{{ 'order.status' | translate }}</th>
              <th>{{ 'common.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of filteredOrders">
              <td class="order-number">{{ order.orderNumber }}</td>
              <td>{{ order.customerEmail }}</td>
              <td>{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
              <td class="amount">{{ order.totalAmount | currency:'EUR' }}</td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + order.status.toLowerCase()">
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-icon" (click)="viewOrder(order.id)" [title]="'order.viewDetails' | translate">
                  👁️
                </button>
                <button class="btn-icon" (click)="updateOrderStatus(order)" [title]="'order.changeStatus' | translate">
                  ✏️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!loading && filteredOrders.length === 0">
        <div class="empty-icon">📦</div>
        <h2>{{ 'order.noOrders' | translate }}</h2>
        <p *ngIf="searchTerm || filterStatus">{{ 'order.tryDifferentFilters' | translate }}</p>
        <p *ngIf="!searchTerm && !filterStatus">{{ 'order.noOrdersYet' | translate }}</p>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>{{ 'loading.orders' | translate }}</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadOrders()">{{ 'common.retry' | translate }}</button>
      </div>
    </div>

    <!-- Modal für Bestelldetails -->
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
            <p><strong>{{ 'order.date' | translate }}:</strong> {{ (selectedOrder.createdAt || null) | date:'dd.MM.yyyy HH:mm':'':'de-DE' }}</p>
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
            <p *ngIf="address.phone"><strong>Tel:</strong> {{ address.phone }}</p>
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
                  <td>{{ item.price | currency:'EUR' }}</td>
                  <td>{{ (item.price * item.quantity) | currency:'EUR' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3"><strong>{{ 'order.grandTotal' | translate }}:</strong></td>
                  <td><strong>{{ selectedOrder.totalAmount | currency:'EUR' }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="order-info" *ngIf="selectedOrder.notes">
            <h3>{{ 'order.notes' | translate }}</h3>
            <p>{{ selectedOrder.notes }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="closeModal()">{{ 'common.close' | translate }}</button>
          <button class="btn btn-primary" (click)="updateOrderStatus(selectedOrder)">{{ 'order.changeStatus' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-orders-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .orders-header {
      margin-bottom: 2rem;
    }

    .back-button {
      background: none;
      border: none;
      color: #007bff;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0;
    }

    .back-button:hover {
      text-decoration: underline;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 2rem;
      margin: 0;
    }

    .orders-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .filter-group {
      flex: 1;
    }

    .filter-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .orders-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-card h3 {
      margin: 0;
      font-size: 2rem;
      color: #007bff;
    }

    .stat-card p {
      margin: 0.5rem 0 0;
      color: #666;
    }

    .orders-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8f9fa;
    }

    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      font-weight: 600;
      color: #333;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    .order-number {
      font-weight: 600;
      color: #007bff;
    }

    .amount {
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .status-pending { background: #fff3cd; color: #856404; }
    .status-confirmed { background: #d1ecf1; color: #0c5460; }
    .status-processing { background: #d1ecf1; color: #0c5460; }
    .status-shipped { background: #cce5ff; color: #004085; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: transform 0.2s;
    }

    .btn-icon:hover {
      transform: scale(1.2);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #666;
      margin: 0 0 0.5rem;
    }

    .empty-state p {
      color: #999;
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #dc3545;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
    }

    .close-button:hover {
      color: #000;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .order-info {
      margin-bottom: 2rem;
    }

    .order-info h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #333;
    }

    .order-info p {
      margin: 0.5rem 0;
    }

    .items-table {
      width: 100%;
      margin-top: 1rem;
    }

    .items-table th,
    .items-table td {
      padding: 0.75rem;
    }

    .items-table tfoot td {
      border-top: 2px solid #333;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // FIXED: Unterstütze beide Parameter-Namen: 'id' und 'storeId'
      const storeIdParam = params['id'] || params['storeId'];

      if (!storeIdParam || isNaN(+storeIdParam)) {
        console.error('❌ StoreOrdersComponent: Keine gültige storeId gefunden in Route-Parametern:', params);
        this.error = 'Ungültige Store-ID';
        return;
      }

      this.storeId = +storeIdParam;
      this.loadOrders();
    });
  }

  loadOrders(): void {
    // FIXED: Validiere storeId vor API-Call
    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ StoreOrdersComponent: Ungültige storeId, API-Call wird abgebrochen:', this.storeId);
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
      'PENDING': 'Ausstehend',
      'CONFIRMED': 'Bestätigt',
      'PROCESSING': 'In Bearbeitung',
      'SHIPPED': 'Versandt',
      'DELIVERED': 'Zugestellt',
      'CANCELLED': 'Storniert'
    };
    return labels[status] || status;
  }

  viewOrder(orderId: number): void {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      this.selectedOrder = order;
    }
  }

  closeModal(): void {
    this.selectedOrder = null;
  }

  updateOrderStatus(order: Order): void {
    const newStatus = prompt(
      `Neuer Status für Bestellung ${order.orderNumber}:\n\n` +
      'PENDING - Ausstehend\n' +
      'CONFIRMED - Bestätigt\n' +
      'PROCESSING - In Bearbeitung\n' +
      'SHIPPED - Versandt\n' +
      'DELIVERED - Zugestellt\n' +
      'CANCELLED - Storniert',
      order.status
    );

    if (newStatus && newStatus !== order.status) {
      this.orderService.updateOrderStatus(this.storeId, order.id, newStatus as OrderStatus).subscribe({
        next: (updatedOrder) => {
          const index = this.orders.findIndex(o => o.id === order.id);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
            this.applyFilters();
          }
          if (this.selectedOrder?.id === order.id) {
            this.selectedOrder = updatedOrder;
          }
        },
        error: (error) => {
          console.error('Error updating order status:', error);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }

  getAddressObject(address: string | Address | undefined): Address | null {
    if (!address || typeof address === 'string') {
      return null;
    }
    return address;
  }

  getItemName(item: any): string {
    return item.productTitle || item.productName || item.name || 'Unbekanntes Produkt';
  }
}
