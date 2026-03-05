import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus, OrderStatusHistory, OrderItem, Address } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';

@Component({
  selector: 'app-order-detail-professional',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent],
  templateUrl: './order-detail-professional.component.html',
  styleUrls: ['./order-detail-professional.component.scss']
})
export class OrderDetailProfessionalComponent implements OnInit {
  storeId!: number;
  orderId!: number;
  order: Order | null = null;
  orderItems: OrderItem[] = [];
  orderHistory: OrderStatusHistory[] = [];
  loading = false;
  error: string | null = null;

  // Status Change
  selectedStatus: OrderStatus | '' = '';
  statusChangeNote = '';
  changingStatus = false;

  // Tracking
  trackingCarrier = '';
  trackingNumber = '';
  trackingUrl = '';
  savingTracking = false;

  // Notes
  newNote = '';
  addingNote = false;

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
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id'));
    this.orderId = Number(this.route.snapshot.paramMap.get('orderId'));

    if (!this.storeId || !this.orderId) {
      this.error = 'Ungültige Store ID oder Order ID';
      return;
    }

    this.loadOrderDetails();
  }

  loadOrderDetails(): void {
    this.loading = true;
    this.error = null;

    // Load order details
    this.orderService.getOrder(this.storeId, this.orderId).subscribe({
      next: (response: any) => {
        this.order = response.order;
        this.orderItems = response.items || [];

        // Pre-fill tracking if exists
        if (this.order) {
          this.trackingCarrier = this.order.trackingCarrier || '';
          this.trackingNumber = this.order.trackingNumber || '';
          this.trackingUrl = this.order.trackingUrl || '';
          this.selectedStatus = this.order.status;
        }

        this.loadOrderHistory();
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.error = 'Fehler beim Laden der Bestellung';
        this.loading = false;
      }
    });
  }

  loadOrderHistory(): void {
    this.orderService.getOrderHistory(this.storeId, this.orderId).subscribe({
      next: (history) => {
        this.orderHistory = history;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading history:', err);
        this.loading = false;
      }
    });
  }

  // Status Change
  changeOrderStatus(): void {
    if (!this.selectedStatus || this.selectedStatus === this.order?.status) {
      return;
    }

    this.changingStatus = true;

    this.orderService.updateOrderStatus(
      this.storeId,
      this.orderId,
      this.selectedStatus as OrderStatus,
      this.statusChangeNote || undefined
    ).subscribe({
      next: () => {
        this.changingStatus = false;
        this.statusChangeNote = '';
        this.loadOrderDetails();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        alert('Fehler beim Aktualisieren des Status');
        this.changingStatus = false;
      }
    });
  }

  // Tracking
  saveTracking(): void {
    if (!this.trackingCarrier || !this.trackingNumber) {
      alert('Bitte Carrier und Tracking-Nummer eingeben');
      return;
    }

    this.savingTracking = true;

    this.orderService.updateOrderTracking(
      this.storeId,
      this.orderId,
      this.trackingCarrier,
      this.trackingNumber,
      this.trackingUrl || undefined
    ).subscribe({
      next: () => {
        this.savingTracking = false;
        this.loadOrderDetails();
        alert('Tracking gespeichert');
      },
      error: (err) => {
        console.error('Error saving tracking:', err);
        alert('Fehler beim Speichern');
        this.savingTracking = false;
      }
    });
  }

  // Notes
  addNote(): void {
    if (!this.newNote.trim()) {
      return;
    }

    this.addingNote = true;

    this.orderService.addOrderNote(this.storeId, this.orderId, this.newNote).subscribe({
      next: () => {
        this.addingNote = false;
        this.newNote = '';
        this.loadOrderHistory();
      },
      error: (err) => {
        console.error('Error adding note:', err);
        alert('Fehler beim Hinzufügen der Notiz');
        this.addingNote = false;
      }
    });
  }

  // Utilities
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

  getAddress(address: Address | string | undefined): Address | null {
    if (!address) return null;
    if (typeof address === 'string') {
      try {
        return JSON.parse(address);
      } catch {
        return null;
      }
    }
    return address;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'orders']);
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('de-DE');
  }
}

