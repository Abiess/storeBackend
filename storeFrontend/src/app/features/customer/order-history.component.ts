import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Order {
  id: number;
  orderNumber: string;
  date: Date;
  status: string;
  total: number;
  items: number;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-history">
      <h2>Bestellhistorie</h2>
      <div class="orders-list" *ngIf="orders.length > 0; else noOrders">
        <div class="order-card" *ngFor="let order of orders">
          <div class="order-header">
            <div>
              <strong>Bestellung #{{order.orderNumber}}</strong>
              <span class="order-date">{{order.date | date:'dd.MM.yyyy'}}</span>
            </div>
            <span class="order-status" [class]="'status-' + order.status">
              {{getStatusText(order.status)}}
            </span>
          </div>
          <div class="order-details">
            <p>{{order.items}} Artikel</p>
            <p class="order-total">{{order.total | currency:'EUR'}}</p>
          </div>
        </div>
      </div>
      <ng-template #noOrders>
        <p class="no-orders">Sie haben noch keine Bestellungen aufgegeben.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .order-history {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .orders-list {
      margin-top: 2rem;
    }
    .order-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .order-date {
      margin-left: 1rem;
      color: #666;
      font-size: 0.9rem;
    }
    .order-status {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #d1fae5; color: #065f46; }
    .status-delivered { background: #dcfce7; color: #166534; }
    .order-details {
      display: flex;
      justify-content: space-between;
      color: #666;
    }
    .order-total {
      font-weight: 600;
      color: #000;
    }
    .no-orders {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
  `]
})
export class OrderHistoryComponent implements OnInit {
  orders: Order[] = [];

  ngOnInit() {
    // TODO: Load orders from service
    this.loadOrders();
  }

  loadOrders() {
    // Placeholder data
    this.orders = [];
  }

  getStatusText(status: string): string {
    const statusMap: {[key: string]: string} = {
      'pending': 'Ausstehend',
      'processing': 'In Bearbeitung',
      'shipped': 'Versandt',
      'delivered': 'Zugestellt'
    };
    return statusMap[status] || status;
  }
}

