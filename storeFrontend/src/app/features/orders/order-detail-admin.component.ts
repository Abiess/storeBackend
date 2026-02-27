import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FulfillmentTrackerComponent } from './fulfillment-tracker.component';

/**
 * Order Detail View für Admin/Reseller
 * Zeigt Order-Info + Dropshipping Fulfillment-Tracker
 */
@Component({
  selector: 'app-order-detail-admin',
  standalone: true,
  imports: [CommonModule, FulfillmentTrackerComponent],
  template: `
    <div class="order-detail-container">
      <div class="order-header">
        <h1>📦 Order #{{ orderId }}</h1>
        <a routerLink="/admin/orders" class="back-link">← Zurück zu Orders</a>
      </div>

      <!-- TODO: Hier kommt die bestehende Order-Info -->
      <!-- Customer, Items, Total, Status, etc. -->
      
      <div class="order-info-placeholder">
        <p>Hier wird später die vollständige Order-Info angezeigt</p>
        <p>(Customer, Delivery Address, Payment, Status, etc.)</p>
      </div>

      <!-- DROPSHIPPING FULFILLMENT TRACKER -->
      <app-fulfillment-tracker 
        [orderId]="orderId"
        *ngIf="orderId"
      ></app-fulfillment-tracker>
    </div>
  `,
  styles: [`
    .order-detail-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .order-header h1 {
      margin: 0;
      color: #333;
    }

    .back-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .order-info-placeholder {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      border: 2px dashed #ccc;
      text-align: center;
      color: #666;
    }
  `]
})
export class OrderDetailAdminComponent implements OnInit {
  orderId!: number;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.orderId = +params['id'];
    });
  }
}

