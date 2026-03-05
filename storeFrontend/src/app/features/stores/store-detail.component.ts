import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { OrderService } from '@app/core/services/order.service';
import { CategoryService } from '@app/core/services/category.service';
import { Product, Order, Category } from '@app/core/models';
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
          <a routerLink="/dashboard" class="back-link">← Zurück zum Dashboard</a>
          <h1 class="page-title">Store Übersicht</h1>
        </div>

        <div class="container">
          <!-- Stats Cards -->
          <div class="stats-grid">
            <!-- Total Sales -->
            <div class="stat-card gradient-purple">
              <div class="stat-icon">💰</div>
              <div class="stat-content">
                <h3 class="stat-value">{{ getTotalSales() | currency:'EUR':'symbol':'1.0-0' }}</h3>
                <p class="stat-label">Gesamtumsatz</p>
              </div>
            </div>

            <!-- Orders Count -->
            <div class="stat-card gradient-blue">
              <div class="stat-icon">📋</div>
              <div class="stat-content">
                <h3 class="stat-value">{{ orders.length }}</h3>
                <p class="stat-label">Bestellungen</p>
              </div>
            </div>

            <!-- Products Count -->
            <div class="stat-card gradient-green">
              <div class="stat-icon">📦</div>
              <div class="stat-content">
                <h3 class="stat-value">{{ products.length }}</h3>
                <p class="stat-label">Produkte</p>
              </div>
            </div>

            <!-- Categories Count -->
            <div class="stat-card gradient-orange">
              <div class="stat-icon">🏷️</div>
              <div class="stat-content">
                <h3 class="stat-value">{{ categories.length }}</h3>
                <p class="stat-label">Kategorien</p>
              </div>
            </div>

            <!-- Average Order Value -->
            <div class="stat-card gradient-pink">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <h3 class="stat-value">{{ getAverageOrderValue() | currency:'EUR':'symbol':'1.0-0' }}</h3>
                <p class="stat-label">Ø Bestellwert</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="section quick-actions-section">
            <h2>Schnellzugriff</h2>
            <div class="quick-actions">
              <button class="action-btn" [routerLink]="['/stores', storeId, 'products', 'new']">
                <span class="action-icon">➕</span>
                <span class="action-text">Produkt hinzufügen</span>
              </button>
              <button class="action-btn" [routerLink]="['/stores', storeId, 'categories', 'new']">
                <span class="action-icon">🏷️</span>
                <span class="action-text">Kategorie erstellen</span>
              </button>
              <button class="action-btn" [routerLink]="['/stores', storeId, 'orders']">
                <span class="action-icon">📋</span>
                <span class="action-text">Bestellungen ansehen</span>
              </button>
              <button class="action-btn" [routerLink]="['/stores', storeId, 'products']">
                <span class="action-icon">📦</span>
                <span class="action-text">Alle Produkte</span>
              </button>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="section">
            <div class="section-header">
              <h2>Letzte Bestellungen</h2>
              <a class="link" [routerLink]="['/stores', storeId, 'orders']">Alle anzeigen →</a>
            </div>
            
            <div *ngIf="ordersLoading" class="loading">
              <div class="spinner"></div>
              <p>Bestellungen werden geladen...</p>
            </div>

            <div *ngIf="!ordersLoading && orders.length === 0" class="empty">
              <div class="icon">📋</div>
              <p>Noch keine Bestellungen vorhanden</p>
              <p class="hint">Sobald Kunden in Ihrem Store bestellen, erscheinen diese hier.</p>
            </div>

            <div *ngIf="!ordersLoading && orders.length > 0" class="orders-table">
              <div class="table-header">
                <div class="col">Bestellnummer</div>
                <div class="col">Kunde</div>
                <div class="col">Status</div>
                <div class="col">Betrag</div>
                <div class="col">Datum</div>
              </div>
              <div *ngFor="let order of orders.slice(0, 5)" class="table-row" [routerLink]="['/stores', storeId, 'orders', order.id]">
                <div class="col">
                  <strong>{{ order.orderNumber }}</strong>
                </div>
                <div class="col">
                  <span class="customer-email">{{ order.customerEmail }}</span>
                </div>
                <div class="col">
                  <span [class]="'badge badge-' + getOrderStatusClass(order.status)">
                    {{ getOrderStatusLabel(order.status) }}
                  </span>
                </div>
                <div class="col">
                  <strong class="amount">{{ order.totalAmount | currency:'EUR':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="col">
                  <span class="date">{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Products Overview -->
          <div class="section">
            <div class="section-header">
              <h2>Produkte</h2>
              <a class="link" [routerLink]="['/stores', storeId, 'products']">Alle anzeigen ({{ products.length }}) →</a>
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

            <div *ngIf="!productsLoading && products.length > 0" class="products-grid">
              <div *ngFor="let product of products.slice(0, 6)" class="product-card" [routerLink]="['/stores', storeId, 'products', product.id]">
                <div class="product-image" *ngIf="product.imageUrl">
                  <img [src]="product.imageUrl" [alt]="product.title" />
                </div>
                <div class="product-image placeholder" *ngIf="!product.imageUrl">
                  <span class="placeholder-icon">📦</span>
                </div>
                <div class="product-content">
                  <h3>{{ product.title }}</h3>
                  <span [class]="'badge badge-' + getProductStatusClass(product.status)">
                    {{ getProductStatusLabel(product.status) }}
                  </span>
                  <div class="product-footer">
                    <span class="price">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
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
      background: #f8f9fa;
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
      padding: 1.5rem 2rem;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .back-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .back-link:hover {
      color: #764ba2;
    }

    .page-title {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
      font-weight: 700;
    }

    .container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      background: #fff;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--gradient-start), var(--gradient-end));
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    }

    .gradient-purple {
      --gradient-start: #667eea;
      --gradient-end: #764ba2;
    }

    .gradient-blue {
      --gradient-start: #4facfe;
      --gradient-end: #00f2fe;
    }

    .gradient-green {
      --gradient-start: #43e97b;
      --gradient-end: #38f9d7;
    }

    .gradient-orange {
      --gradient-start: #fa709a;
      --gradient-end: #fee140;
    }

    .gradient-pink {
      --gradient-start: #f093fb;
      --gradient-end: #f5576c;
    }

    .stat-icon {
      font-size: 2.5rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #333;
      margin: 0 0 0.25rem;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin: 0;
      font-weight: 500;
    }

    /* Quick Actions */
    .quick-actions-section {
      margin-bottom: 2rem;
    }

    .quick-actions-section h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
      color: #333;
      font-weight: 700;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .quick-actions {
        grid-template-columns: 1fr;
      }
    }

    .action-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }

    .action-icon {
      font-size: 1.5rem;
    }

    .action-text {
      flex: 1;
      text-align: left;
    }

    /* Section */
    .section {
      background: #fff;
      border-radius: 16px;
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
      font-weight: 700;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }

    .link:hover {
      color: #764ba2;
    }

    /* Orders Table */
    .orders-table {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .table-header {
      display: grid;
      grid-template-columns: 1.5fr 2fr 1fr 1fr 1.5fr;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      color: #666;
    }

    @media (max-width: 1023px) {
      .table-header {
        display: none;
      }
    }

    .table-row {
      display: grid;
      grid-template-columns: 1.5fr 2fr 1fr 1fr 1.5fr;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      align-items: center;
    }

    .table-row:hover {
      background: #e9ecef;
      transform: translateX(4px);
    }

    @media (max-width: 1023px) {
      .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .table-row .col:before {
        content: attr(data-label);
        font-weight: 600;
        color: #666;
        margin-right: 0.5rem;
      }
    }

    .col {
      font-size: 0.875rem;
      color: #333;
    }

    .customer-email {
      color: #666;
      font-size: 0.875rem;
    }

    .amount {
      color: #667eea;
      font-weight: 700;
      font-size: 1rem;
    }

    .date {
      color: #999;
      font-size: 0.875rem;
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    @media (max-width: 640px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
    }

    .product-card {
      background: #f8f9fa;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid transparent;
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
      border-color: #667eea;
    }

    .product-image {
      width: 100%;
      padding-top: 100%;
      position: relative;
      background: #e9ecef;
      overflow: hidden;
    }

    .product-image img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .placeholder-icon {
      font-size: 3rem;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .product-content {
      padding: 1rem;
    }

    .product-content h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: #333;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .product-footer {
      margin-top: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .price {
      font-weight: 700;
      color: #667eea;
      font-size: 1.125rem;
    }

    /* Badge */
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      display: inline-block;
    }

    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
    .badge-secondary { background: #e9ecef; color: #495057; }

    /* Loading & Empty States */
    .loading, .empty {
      text-align: center;
      padding: 3rem 1rem;
    }

    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .hint {
      color: #999;
      font-size: 0.875rem;
      margin-top: 0.5rem;
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

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .section {
        padding: 1.5rem;
      }

      .topbar {
        padding: 1rem;
        flex-direction: column;
        align-items: flex-start;
      }

      .page-title {
        font-size: 1.25rem;
      }
    }
  `]
})
export class StoreDetailComponent implements OnInit {
  storeId!: number;
  products: Product[] = [];
  orders: Order[] = [];
  categories: Category[] = [];
  productsLoading = false;
  ordersLoading = false;
  categoriesLoading = false;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private orderService: OrderService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['id'] || +params['storeId'];
      if (this.storeId) {
        this.loadProducts();
        this.loadOrders();
        this.loadCategories();
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

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryService.getCategories(this.storeId).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Kategorien:', error);
        this.categoriesLoading = false;
      }
    });
  }

  getTotalSales(): number {
    return this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }

  getAverageOrderValue(): number {
    if (this.orders.length === 0) return 0;
    return this.getTotalSales() / this.orders.length;
  }

  getProductStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DRAFT': return 'warning';
      case 'ARCHIVED': return 'danger';
      default: return 'info';
    }
  }

  getProductStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Aktiv';
      case 'DRAFT': return 'Entwurf';
      case 'ARCHIVED': return 'Archiviert';
      default: return status;
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
      default: return 'secondary';
    }
  }

  getOrderStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Ausstehend';
      case 'CONFIRMED': return 'Bestätigt';
      case 'PROCESSING': return 'In Bearbeitung';
      case 'SHIPPED': return 'Versendet';
      case 'DELIVERED': return 'Zugestellt';
      case 'CANCELLED': return 'Storniert';
      default: return status;
    }
  }
}

