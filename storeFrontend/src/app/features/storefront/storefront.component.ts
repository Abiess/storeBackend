import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { Product, Category, PublicStore } from '@app/core/models';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="storefront">
      <!-- Header -->
      <header class="store-header">
        <div class="container">
          <div class="header-content">
            <h1 class="store-name">{{ store?.name || 'Online Shop' }}</h1>
            <p class="store-tagline">{{ store?.slug }}.markt.ma</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-cart">
              🛒 Warenkorb <span class="cart-badge">0</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="store-nav">
        <div class="container">
          <div class="nav-links">
            <a [class.active]="selectedCategory === null" (click)="selectCategory(null)">
              Alle Produkte
            </a>
            <a 
              *ngFor="let category of categories" 
              [class.active]="selectedCategory?.id === category.id"
              (click)="selectCategory(category)"
            >
              {{ category.name }}
            </a>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="store-main">
        <div class="container">
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Produkte werden geladen...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && filteredProducts.length === 0" class="empty-state">
            <div class="empty-icon">📦</div>
            <h2>Keine Produkte gefunden</h2>
            <p *ngIf="selectedCategory">In dieser Kategorie gibt es aktuell keine Produkte.</p>
            <p *ngIf="!selectedCategory">Dieser Shop hat noch keine Produkte.</p>
          </div>

          <!-- Products Grid -->
          <div *ngIf="!loading && filteredProducts.length > 0" class="products-section">
            <div class="section-header">
              <h2>
                {{ selectedCategory ? selectedCategory.name : 'Alle Produkte' }}
              </h2>
              <span class="products-count">{{ filteredProducts.length }} Produkte</span>
            </div>

            <div class="products-grid">
              <div *ngFor="let product of filteredProducts" class="product-card">
                <div class="product-image">
                  <div class="image-placeholder">
                    <span class="placeholder-icon">📷</span>
                  </div>
                  <span *ngIf="product.status === 'ACTIVE'" class="product-badge badge-new">Neu</span>
                </div>

                <div class="product-info">
                  <h3 class="product-title">{{ product.title }}</h3>
                  <p class="product-description">{{ product.description }}</p>
                  
                  <div class="product-footer">
                    <div class="product-price">
                      <span class="price-amount">{{ product.basePrice | number:'1.2-2' }} €</span>
                      <span class="price-label">inkl. MwSt.</span>
                    </div>
                    
                    <button class="btn btn-add-cart" (click)="addToCart(product)">
                      <span class="btn-icon">🛒</span>
                      <span class="btn-text">In den Warenkorb</span>
                    </button>
                  </div>

                  <div *ngIf="product.variants && product.variants.length > 0" class="product-variants">
                    <small>{{ product.variants.length }} Variante(n) verfügbar</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="store-footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-section">
              <h4>{{ store?.name || 'Online Shop' }}</h4>
              <p>Powered by markt.ma</p>
            </div>
            <div class="footer-section">
              <h4>Kategorien</h4>
              <ul>
                <li *ngFor="let category of categories">
                  <a (click)="selectCategory(category)">{{ category.name }}</a>
                </li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Informationen</h4>
              <ul>
                <li><a>Impressum</a></li>
                <li><a>Datenschutz</a></li>
                <li><a>AGB</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2024 {{ store?.name || 'markt.ma' }}. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    .storefront {
      min-height: 100vh;
      background: #f8f9fa;
      display: flex;
      flex-direction: column;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    /* Header */
    .store-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .header-content {
      flex: 1;
    }

    .store-name {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 700;
    }

    .store-tagline {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9375rem;
    }

    .header-content,
    .store-header .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-cart {
      background: white;
      color: #667eea;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .btn-cart:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .cart-badge {
      background: #667eea;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }

    /* Navigation */
    .store-nav {
      background: white;
      border-bottom: 2px solid #e9ecef;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      padding: 1rem 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .nav-links::-webkit-scrollbar {
      height: 4px;
    }

    .nav-links::-webkit-scrollbar-thumb {
      background: #667eea;
      border-radius: 2px;
    }

    .nav-links a {
      color: #666;
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      transition: all 0.3s;
      white-space: nowrap;
      cursor: pointer;
    }

    .nav-links a:hover {
      background: #f8f9fa;
      color: #667eea;
    }

    .nav-links a.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    /* Main Content */
    .store-main {
      flex: 1;
      padding: 2rem 0;
    }

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
    }

    /* Products Section */
    .products-section {
      margin-top: 1rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.75rem;
    }

    .products-count {
      color: #666;
      font-size: 0.9375rem;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    @media (min-width: 640px) {
      .products-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .products-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Product Card */
    .product-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .product-image {
      position: relative;
      padding-top: 75%;
      background: #f8f9fa;
      overflow: hidden;
    }

    .image-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e9ecef, #dee2e6);
    }

    .placeholder-icon {
      font-size: 3rem;
      opacity: 0.5;
    }

    .product-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-new {
      background: #28a745;
      color: white;
    }

    .product-info {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .product-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      color: #333;
      font-weight: 600;
      line-height: 1.4;
    }

    .product-description {
      margin: 0 0 1rem;
      color: #666;
      font-size: 0.875rem;
      line-height: 1.5;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-footer {
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    .product-price {
      margin-bottom: 1rem;
    }

    .price-amount {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .price-label {
      font-size: 0.75rem;
      color: #999;
    }

    .btn-add-cart {
      width: 100%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.875rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s;
    }

    .btn-add-cart:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-icon {
      font-size: 1.125rem;
    }

    .product-variants {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e9ecef;
    }

    .product-variants small {
      color: #666;
      font-size: 0.8125rem;
    }

    /* Footer */
    .store-footer {
      background: #2c3e50;
      color: white;
      padding: 3rem 0 1rem;
      margin-top: 3rem;
    }

    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .footer-section h4 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
    }

    .footer-section p {
      margin: 0;
      color: rgba(255,255,255,0.8);
    }

    .footer-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-section ul li {
      margin-bottom: 0.5rem;
    }

    .footer-section ul a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.3s;
    }

    .footer-section ul a:hover {
      color: white;
    }

    .footer-bottom {
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      text-align: center;
    }

    .footer-bottom p {
      margin: 0;
      color: rgba(255,255,255,0.6);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .store-name {
        font-size: 1.5rem;
      }

      .section-header h2 {
        font-size: 1.5rem;
      }

      .products-grid {
        gap: 1rem;
      }

      .nav-links {
        gap: 1rem;
      }

      .store-header {
        padding: 1.5rem 0;
      }
    }
  `]
})
export class StorefrontComponent implements OnInit {
  storeId!: number;
  store: PublicStore | null = null;
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadStoreData();
  }

  loadStoreData(): void {
    this.loading = true;

    Promise.all([
      this.loadProducts(),
      this.loadCategories()
    ]).then(() => {
      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  loadProducts(): Promise<void> {
    return new Promise((resolve) => {
      this.productService.getProducts(this.storeId, 'ACTIVE').subscribe({
        next: (products) => {
          this.products = products;
          resolve();
        },
        error: (error) => {
          console.error('Fehler beim Laden der Produkte:', error);
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.categoryService.getCategories(this.storeId).subscribe({
        next: (categories) => {
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('Fehler beim Laden der Kategorien:', error);
          resolve();
        }
      });
    });
  }

  selectCategory(category: Category | null): void {
    this.selectedCategory = category;
  }

  get filteredProducts(): Product[] {
    if (!this.selectedCategory) {
      return this.products;
    }

    // Hier würde man normalerweise nach Kategorien filtern
    // Für Mock-Daten zeigen wir alle Produkte
    return this.products;
  }

  addToCart(product: Product): void {
    alert(`"${product.title}" wurde zum Warenkorb hinzugefügt! 🛒\n\nPreis: ${product.basePrice} €`);
  }
}

