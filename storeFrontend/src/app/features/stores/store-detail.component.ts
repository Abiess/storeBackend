import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { OrderService } from '@app/core/services/order.service';
import { Product, Order } from '@app/core/models';
import { AdminSidebarComponent } from '@app/shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminSidebarComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar [storeId]="storeId"></app-admin-sidebar>

      <div class="content">
        <div class="topbar">
          <a routerLink="/dashboard">← Dashboard</a>
        </div>

        <div class="container">
          <h1>Store Übersicht</h1>

          <!-- Products -->
          <div class="section">
            <div class="section-header">
              <h2>Produkte</h2>
              <div class="actions">
                <button class="btn btn-secondary" [routerLink]="['/stores', storeId, 'categories', 'new']">
                  + Kategorie
                </button>
                <button class="btn btn-primary" [routerLink]="['/stores', storeId, 'products', 'new']">
                  + Produkt
                </button>
              </div>
            </div>

            <div *ngIf="productsLoading" class="loading">
              <div class="spinner"></div>
              <p>Produkte werden geladen...</p>
            </div>

            <div *ngIf="!productsLoading && products.length === 0" class="empty">
              <div class="icon">📦</div>
              <p>Noch keine Produkte vorhanden</p>
              <button class="btn btn-primary" [routerLink]="['/stores', storeId, 'products', 'new']">
                Erstes Produkt erstellen
              </button>
            </div>

            <div *ngIf="!productsLoading && products.length > 0">
              <a class="link" [routerLink]="['/stores', storeId, 'products']">
                Alle Produkte anzeigen ({{ products.length }}) →
              </a>
              
              <div class="grid">
                <div *ngFor="let product of products.slice(0, 6)" class="card">
                  <h3>{{ product.title }}</h3>
                  <span [class]="'badge badge-' + getProductStatusClass(product.status)">
                    {{ product.status }}
                  </span>
                  <p>{{ product.description }}</p>
                  <div class="footer">
                    <span class="price">{{ product.price }} €</span>
                    <span class="date">{{ product.createdAt | date:'dd.MM.yyyy' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Orders -->
          <div class="section">
            <div class="section-header">
              <h2>Bestellungen</h2>
            </div>
            
            <div *ngIf="ordersLoading" class="loading">
              <div class="spinner"></div>
              <p>Bestellungen werden geladen...</p>
            </div>

            <div *ngIf="!ordersLoading && orders.length === 0" class="empty">
              <div class="icon">📋</div>
              <p>Noch keine Bestellungen vorhanden</p>
            </div>

            <div *ngIf="!ordersLoading && orders.length > 0">
              <div *ngFor="let order of orders" class="order">
                <div class="order-header">
                  <div>
                    <strong>{{ order.orderNumber }}</strong>
                    <span>{{ order.customerEmail }}</span>
                  </div>
                  <span [class]="'badge badge-' + getOrderStatusClass(order.status)">
                    {{ order.status }}
                  </span>
                </div>
                <div class="footer">
                  <span class="price">{{ order.totalAmount }} €</span>
                  <span class="date">{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
    }

    .content {
      flex: 1;
      margin-left: 280px;
      background: #f8f9fa;
    }

    @media (max-width: 1023px) {
      .content {
        margin-left: 0;
      }
    }

    .topbar {
      padding: 1rem 2rem;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
    }

    .topbar a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 2rem;
      font-size: 2rem;
      color: #333;
    }

    .section {
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #333;
      border: 1px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      margin-bottom: 1rem;
      display: inline-block;
    }

    .loading, .empty {
      text-align: center;
      padding: 3rem 1rem;
    }

    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
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

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .card {
      background: #f8f9fa;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      transition: all 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .card h3 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      color: #333;
    }

    .card p {
      color: #666;
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }

    .price {
      font-weight: 700;
      color: #667eea;
      font-size: 1.125rem;
    }

    .date {
      color: #999;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }

    .order {
      padding: 1.25rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      margin-bottom: 1rem;
      transition: all 0.2s;
    }

    .order:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .order-header span {
      color: #666;
      font-size: 0.875rem;
      margin-left: 0.5rem;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .section {
        padding: 1.5rem;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .actions {
        width: 100%;
      }

      .actions .btn {
        flex: 1;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StoreDetailComponent implements OnInit {
  storeId!: number;
  products: Product[] = [];
  orders: Order[] = [];
  productsLoading = false;
  ordersLoading = false;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['id'] || +params['storeId'];
      if (this.storeId) {
        this.loadProducts();
        this.loadOrders();
      }
    });
  }

  loadProducts(): void {
    this.productsLoading = true;
    this.productService.getProducts(this.storeId).subscribe({
      next: (products) => {
        this.products = products;
        this.productsLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Produkte:', error);
        this.productsLoading = false;
      }
    });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.orderService.getOrders(this.storeId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.ordersLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Bestellungen:', error);
        this.ordersLoading = false;
      }
    });
  }

  getProductStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DRAFT': return 'warning';
      case 'ARCHIVED': return 'danger';
      default: return 'info';
    }
  }

  getOrderStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'PROCESSING': return 'info';
      case 'SHIPPED': return 'success';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'info';
    }
  }
}

