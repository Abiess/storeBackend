import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { ProductCardComponent } from '../storefront/product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';

/**
 * Featured Products Section Component
 * Zeigt hervorgehobene/empfohlene Produkte
 */
@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslatePipe],
  template: `
    <section class="featured-products" *ngIf="products.length > 0">
      <div class="section-header">
        <h2 class="section-title">
          {{ title }}
        </h2>
        <p class="section-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <div class="products-grid">
        <app-product-card
          *ngFor="let product of products"
          [product]="product"
          (addToCart)="onAddToCart($event)"
          (quickView)="onQuickView($event)">
        </app-product-card>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>{{ 'featured.loading' | translate }}</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
      </div>
    </section>
  `,
  styles: [`
    .featured-products {
      padding: 3rem 0;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .section-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .section-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin: 0 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .section-subtitle {
      font-size: 1.125rem;
      color: #666;
      margin: 0;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .loading {
      text-align: center;
      padding: 3rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      text-align: center;
      padding: 2rem;
      color: #dc3545;
    }

    @media (max-width: 768px) {
      .featured-products {
        padding: 2rem 0;
      }
      .section-title {
        font-size: 2rem;
      }
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
        padding: 0 1rem;
      }
    }
  `]
})
export class FeaturedProductsComponent implements OnInit {
  @Input() storeId!: number;
  @Input() type: 'featured' | 'top' | 'trending' | 'new' = 'featured';
  @Input() limit: number = 8;
  @Input() title: string = '';
  @Input() subtitle?: string;

  products: Product[] = [];
  loading = false;
  error = '';

  constructor(
    private productService: ProductService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.setDefaultTitle();
  }

  private setDefaultTitle(): void {
    if (!this.title) {
      switch (this.type) {
        case 'featured':
          this.title = this.translationService.translate('featured.recommended');
          this.subtitle = this.subtitle || this.translationService.translate('featured.recommendedSub');
          break;
        case 'top':
          this.title = this.translationService.translate('featured.bestseller');
          this.subtitle = this.subtitle || this.translationService.translate('featured.bestsellerSub');
          break;
        case 'trending':
          this.title = this.translationService.translate('featured.trending');
          this.subtitle = this.subtitle || this.translationService.translate('featured.trendingSub');
          break;
        case 'new':
          this.title = this.translationService.translate('featured.newArrivals');
          this.subtitle = this.subtitle || this.translationService.translate('featured.newArrivalsSub');
          break;
      }
    }
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';

    let request;
    switch (this.type) {
      case 'featured':
        request = this.productService.getFeaturedProducts(this.storeId);
        break;
      case 'top':
        request = this.productService.getTopProducts(this.storeId, this.limit);
        break;
      case 'trending':
        request = this.productService.getTrendingProducts(this.storeId, this.limit);
        break;
      case 'new':
        request = this.productService.getNewArrivals(this.storeId, this.limit);
        break;
    }

    request.subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
        console.log(`✅ ${this.type} products geladen:`, products.length);
      },
      error: (error) => {
        this.error = this.translationService.translate('common.error');
        this.loading = false;
        console.error('❌ Fehler:', error);
      }
    });
  }

  onAddToCart(product: Product): void {
    console.log('🛒 Add to cart:', product);
  }

  onQuickView(product: Product): void {
    console.log('👁️ Quick view:', product);
  }
}
