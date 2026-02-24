import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Product Grid Component
 * Responsive grid layout for products (inspired by idealo.de)
 */
@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="product-grid-wrapper">
      <!-- Section Header -->
      <div class="grid-header" *ngIf="title">
        <h2 class="grid-title">{{ title }}</h2>
        <div class="grid-info">
          <span class="product-count" *ngIf="products.length > 0">
            {{ products.length === 1
              ? ('storefront.products' | translate: { count: products.length })
              : ('storefront.productsPlural' | translate: { count: products.length }) }}
          </span>
          <ng-content select="[headerActions]"></ng-content>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-grid" *ngIf="loading">
        <div class="skeleton-card" *ngFor="let item of [1,2,3,4,5,6,7,8]">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-price"></div>
            <div class="skeleton-line skeleton-button"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-grid" *ngIf="!loading && products.length === 0">
        <div class="empty-icon">📦</div>
        <h3>{{ emptyTitle || ('grid.emptyTitle' | translate) }}</h3>
        <p>{{ emptyMessage || ('grid.emptyMessage' | translate) }}</p>
      </div>

      <!-- Products Grid -->
      <div class="products-grid" *ngIf="!loading && products.length > 0" [class.compact]="compact">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    /* ============================================
       Grid Wrapper
       ============================================ */
    .product-grid-wrapper {
      width: 100%;
    }

    /* ============================================
       Grid Header
       ============================================ */
    .grid-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f3f4f6;
    }

    .grid-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .grid-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .product-count {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    /* ============================================
       Products Grid
       ============================================ */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .products-grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    /* ============================================
       Loading State (Skeleton)
       ============================================ */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .skeleton-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .skeleton-image {
      width: 100%;
      height: 280px;
      background: linear-gradient(
        90deg,
        #f3f4f6 0%,
        #e5e7eb 50%,
        #f3f4f6 100%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
    }

    .skeleton-content {
      padding: 16px;
    }

    .skeleton-line {
      height: 16px;
      background: linear-gradient(
        90deg,
        #f3f4f6 0%,
        #e5e7eb 50%,
        #f3f4f6 100%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .skeleton-title {
      width: 80%;
      height: 20px;
    }

    .skeleton-price {
      width: 40%;
      height: 24px;
    }

    .skeleton-button {
      width: 100%;
      height: 40px;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    /* ============================================
       Empty State
       ============================================ */
    .empty-grid {
      text-align: center;
      padding: 64px 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-grid h3 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px 0;
    }

    .empty-grid p {
      font-size: 15px;
      color: #6b7280;
      margin: 0;
    }

    /* ============================================
       Tablet Styles
       ============================================ */
    @media (max-width: 1024px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
      }

      .loading-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
      }

      .grid-title {
        font-size: 22px;
      }
    }

    /* ============================================
       Mobile Styles
       ============================================ */
    @media (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }

      .products-grid.compact {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }

      .loading-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }

      .grid-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 20px;
      }

      .grid-title {
        font-size: 20px;
      }

      .grid-info {
        width: 100%;
        justify-content: space-between;
      }

      .skeleton-image {
        height: 200px;
      }

      .empty-grid {
        padding: 48px 16px;
      }

      .empty-icon {
        font-size: 48px;
      }

      .empty-grid h3 {
        font-size: 18px;
      }

      .empty-grid p {
        font-size: 14px;
      }
    }

    /* ============================================
       Small Mobile
       ============================================ */
    @media (max-width: 480px) {
      .products-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .loading-grid {
        grid-template-columns: 1fr;
      }

      .grid-header {
        margin-bottom: 16px;
        padding-bottom: 12px;
      }

      .grid-title {
        font-size: 18px;
      }
    }
  `]
})
export class ProductGridComponent {
  @Input() products: Product[] = [];
  @Input() loading = false;
  @Input() title = '';
  @Input() compact = false;
  @Input() emptyTitle = '';
  @Input() emptyMessage = '';
}

