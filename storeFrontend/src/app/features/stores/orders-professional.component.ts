import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';

@Component({
  selector: 'app-orders-professional',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent],
  templateUrl: './orders-professional.component.html',
  styleUrls: ['./orders-professional.component.scss']
})
export class OrdersProfessionalComponent implements OnInit {
  storeId!: number;
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  loading = false;
  error: string | null = null;

  // Filter & Search
  searchTerm = '';
  filterStatus: OrderStatus | '' = '';

  // Bulk Actions
  selectedOrderIds = new Set<number>();
  selectAll = false;
  bulkActionStatus: OrderStatus | '' = '';
  bulkActionNote = '';
  showBulkModal = false;
  bulkProcessing = false;

  // Available statuses
  availableStatuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // Unterstütze beide Parameternamen: 'storeId' und 'id'
    const storeIdParam = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    this.storeId = Number(storeIdParam);

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Orders Professional - Keine gültige storeId gefunden');
      return;
    }

    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    this.orderService.getStoreOrders(this.storeId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.error = 'Fehler beim Laden der Bestellungen';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.orders];

    // Status filter
    if (this.filterStatus) {
      filtered = filtered.filter(order => order.status === this.filterStatus);
    }

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(term) ||
        order.customerEmail?.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term)
      );
    }

    this.filteredOrders = filtered;
  }

  // Bulk Actions
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;

    if (this.selectAll) {
      this.filteredOrders.forEach(order => this.selectedOrderIds.add(order.id));
    } else {
      this.selectedOrderIds.clear();
    }
  }

  toggleOrderSelection(orderId: number): void {
    if (this.selectedOrderIds.has(orderId)) {
      this.selectedOrderIds.delete(orderId);
    } else {
      this.selectedOrderIds.add(orderId);
    }

    this.selectAll = this.selectedOrderIds.size === this.filteredOrders.length;
  }

  isOrderSelected(orderId: number): boolean {
    return this.selectedOrderIds.has(orderId);
  }

  openBulkActionModal(): void {
    if (this.selectedOrderIds.size === 0) {
      alert('Bitte wählen Sie mindestens eine Bestellung aus');
      return;
    }
    this.showBulkModal = true;
  }

  closeBulkModal(): void {
    this.showBulkModal = false;
    this.bulkActionStatus = '';
    this.bulkActionNote = '';
  }

  executeBulkAction(): void {
    if (!this.bulkActionStatus) {
      alert('Bitte wählen Sie einen Status aus');
      return;
    }

    this.bulkProcessing = true;
    const orderIds = Array.from(this.selectedOrderIds);

    this.orderService.bulkUpdateOrderStatus(
      this.storeId,
      orderIds,
      this.bulkActionStatus as OrderStatus,
      this.bulkActionNote || undefined
    ).subscribe({
      next: () => {
        this.bulkProcessing = false;
        this.closeBulkModal();
        this.selectedOrderIds.clear();
        this.selectAll = false;
        this.loadOrders();
      },
      error: (err) => {
        console.error('Bulk update error:', err);
        alert('Fehler beim Aktualisieren der Bestellungen');
        this.bulkProcessing = false;
      }
    });
  }

  // Navigation
  viewOrderDetail(orderId: number): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'orders', orderId]);
  }

  // Status utilities
  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Ausstehend',
      [OrderStatus.CONFIRMED]: 'Bestätigt',
      [OrderStatus.PROCESSING]: 'In Bearbeitung',
      [OrderStatus.SHIPPED]: 'Versandt',
      [OrderStatus.DELIVERED]: 'Zugestellt',
      [OrderStatus.CANCELLED]: 'Storniert',
      [OrderStatus.REFUNDED]: 'Erstattet'
    };
    return labels[status] || status;
  }

  getStatusClass(status: OrderStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  // Stats
  getPendingCount(): number {
    return this.orders.filter(o => o.status === OrderStatus.PENDING).length;
  }

  getProcessingCount(): number {
    return this.orders.filter(o => o.status === OrderStatus.PROCESSING).length;
  }

  getShippedCount(): number {
    return this.orders.filter(o => o.status === OrderStatus.SHIPPED).length;
  }

  getTotalRevenue(): number {
    return this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }
}

