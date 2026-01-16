import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService, OrderDetails } from '../../core/services/checkout.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirmation-container">
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        Bestellung wird geladen...
      </div>

      <div *ngIf="!loading && error" class="error-container">
        <div class="error-icon">❌</div>
        <h2>Bestellung nicht gefunden</h2>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="goToShop()">Zurück zum Shop</button>
      </div>

      <div *ngIf="!loading && !error && order" class="confirmation-content">
        <div class="success-header">
          <div class="success-icon">✅</div>
          <h1>Vielen Dank für Ihre Bestellung!</h1>
          <p class="order-number">Bestellnummer: <strong>{{ order.orderNumber }}</strong></p>
          <p class="confirmation-text">
            Wir haben Ihre Bestellung erhalten und werden sie schnellstmöglichst bearbeiten.
            <span *ngIf="order.customer?.email">
              Eine Bestätigungs-E-Mail wurde an <strong>{{ order.customer?.email }}</strong> gesendet.
            </span>
          </p>
        </div>

        <div class="order-details">
          <section class="details-section">
            <h2>Bestelldetails</h2>
            <div class="detail-row">
              <span>Bestellnummer:</span>
              <strong>{{ order.orderNumber }}</strong>
            </div>
            <div class="detail-row">
              <span>Datum:</span>
              <strong>{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</strong>
            </div>
            <div class="detail-row">
              <span>Status:</span>
              <span class="status-badge" [class]="'status-' + order.status.toLowerCase()">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
            <div class="detail-row" *ngIf="order.customer?.email">
              <span>Kunden-E-Mail:</span>
              <strong>{{ order.customer?.email }}</strong>
            </div>
          </section>

          <section class="details-section">
            <h2>Bestellte Artikel</h2>
            <div class="order-items">
              <div class="order-item" *ngFor="let item of order.items">
                <div class="item-info">
                  <h4>{{ item.productName }}</h4>
                  <p *ngIf="getProductSnapshot(item.productSnapshot)?.sku" class="sku">
                    SKU: {{ getProductSnapshot(item.productSnapshot)?.sku }}
                  </p>
                  <p class="quantity">Menge: {{ item.quantity }}</p>
                </div>
                <div class="item-price">
                  {{ item.price * item.quantity | number:'1.2-2' }} €
                  <span class="unit-price">({{ item.price | number:'1.2-2' }} € / Stk.)</span>
                </div>
              </div>
            </div>
          </section>

          <section class="details-section" *ngIf="order.shippingAddress">
            <h2>Lieferadresse</h2>
            <address>
              {{ order.shippingAddress.firstName }} {{ order.shippingAddress.lastName }}<br>
              {{ order.shippingAddress.address1 }}<br>
              <span *ngIf="order.shippingAddress.address2">{{ order.shippingAddress.address2 }}<br></span>
              {{ order.shippingAddress.postalCode }} {{ order.shippingAddress.city }}<br>
              {{ order.shippingAddress.country }}
              <span *ngIf="order.shippingAddress.phone"><br>Tel: {{ order.shippingAddress.phone }}</span>
            </address>
          </section>

          <section class="details-section" *ngIf="order.billingAddress">
            <h2>Rechnungsadresse</h2>
            <address>
              {{ order.billingAddress.firstName }} {{ order.billingAddress.lastName }}<br>
              {{ order.billingAddress.address1 }}<br>
              <span *ngIf="order.billingAddress.address2">{{ order.billingAddress.address2 }}<br></span>
              {{ order.billingAddress.postalCode }} {{ order.billingAddress.city }}<br>
              {{ order.billingAddress.country }}
            </address>
          </section>

          <section class="details-section" *ngIf="order.notes">
            <h2>Anmerkungen</h2>
            <p>{{ order.notes }}</p>
          </section>

          <section class="details-section total-section">
            <h2>Gesamtsumme</h2>
            <div class="total-amount">
              {{ order.totalAmount | number:'1.2-2' }} €
            </div>
          </section>
        </div>

        <div class="action-buttons">
          <button class="btn btn-primary" (click)="goToShop()">Weiter einkaufen</button>
          <button class="btn btn-secondary" (click)="printOrder()">🖨️ Bestellung drucken</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .loading, .error-container {
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

    .error-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }

    .success-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }

    .success-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }

    .success-header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
    }

    .order-number {
      font-size: 20px;
      margin: 20px 0;
    }

    .confirmation-text {
      font-size: 16px;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .order-details {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
    }

    .details-section {
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e0e0e0;
    }

    .details-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .details-section h2 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 20px;
      color: #333;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-confirmed {
      background: #d4edda;
      color: #155724;
    }

    .order-items {
      margin-top: 15px;
    }

    .order-item {
      display: flex;
      justify-content: space-between;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .item-info h4 {
      margin: 0 0 5px 0;
      font-size: 16px;
    }

    .item-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .item-info .sku {
      color: #999;
      font-size: 12px;
      font-family: monospace;
    }

    .item-price {
      font-weight: 600;
      font-size: 18px;
      color: #667eea;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }

    .unit-price {
      font-size: 12px;
      font-weight: 400;
      color: #999;
      margin-top: 4px;
    }

    address {
      font-style: normal;
      line-height: 1.8;
    }

    .total-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }

    .total-amount {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      text-align: center;
      margin-top: 10px;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
    }

    @media (max-width: 576px) {
      .action-buttons {
        flex-direction: column;
      }

      .action-buttons button {
        width: 100%;
      }
    }

    .btn-secondary {
      background: #6c757d;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }
  `]
})
export class OrderConfirmationComponent implements OnInit {
  order: OrderDetails | null = null;
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private checkoutService: CheckoutService
  ) {}

  ngOnInit(): void {
    const orderNumber = this.route.snapshot.queryParams['orderNumber'];
    const email = this.route.snapshot.queryParams['email'];

    if (!orderNumber || !email) {
      this.error = 'Bestellinformationen fehlen';
      return;
    }

    this.loadOrder(orderNumber, email);
  }

  loadOrder(orderNumber: string, email: string): void {
    this.loading = true;
    this.checkoutService.getOrderByNumber(orderNumber, email).subscribe({
      next: (order: OrderDetails) => {
        this.order = order;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = error.message || 'Bestellung konnte nicht geladen werden';
        this.loading = false;
      }
    });
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

  /**
   * Parse productSnapshot JSON string
   */
  getProductSnapshot(snapshot?: string): any {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch (e) {
      console.error('Error parsing product snapshot:', e);
      return null;
    }
  }

  printOrder(): void {
    window.print();
  }

  goToShop(): void {
    this.router.navigate(['/storefront']);
  }
}
