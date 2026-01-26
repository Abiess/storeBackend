import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, ProductStatus } from '@app/core/models';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="product-card">
      <!-- Professionelle Bildgalerie -->
      <div class="product-image-section" [routerLink]="['/products', product.id]">
        <img *ngIf="getProductImage()" 
             [src]="getProductImage()" 
             [alt]="product.title"
             class="product-img"
             (error)="onImageError($event)">
        
        <div *ngIf="!getProductImage() || imageError" class="image-placeholder">
          <span class="placeholder-icon">📷</span>
        </div>

        <!-- Badge für mehrere Bilder -->
        <span *ngIf="hasMultipleImages()" class="image-count-badge">
          🖼️ {{ getImageCount() }}
        </span>

        <!-- Quick View Button - mit stopPropagation -->
        <button class="quick-view-btn" 
                (click)="onQuickView($event)"
                type="button">
          <span class="quick-view-icon">👁️</span>
          <span class="quick-view-text">Schnellansicht</span>
        </button>
      </div>

      <div class="product-info" [routerLink]="['/products', product.id]">
        <h3 class="product-title">{{ product.title }}</h3>
        <p class="product-description">{{ product.description }}</p>

        <div class="product-footer">
          <div class="product-price">
            <span class="price-amount">{{ product.basePrice | number:'1.2-2' }} €</span>
          </div>

          <button class="btn btn-add-cart"
                  (click)="onAddToCart($event)"
                  [disabled]="isAddingToCart"
                  type="button">
            <span class="btn-icon">🛒</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== MODERN PRODUCT CARD ==================== */
    .product-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    }

    /* ==================== IMAGE SECTION ==================== */
    .product-image-section {
      position: relative;
      padding-top: 100%;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      overflow: hidden;
      cursor: pointer;
    }

    .product-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .product-card:hover .product-img {
      transform: scale(1.08);
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
      opacity: 0.4;
    }

    /* ==================== BADGES ==================== */
    .image-count-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 2;
    }

    /* ==================== QUICK VIEW BUTTON ==================== */
    .quick-view-btn {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%) translateY(100%);
      background: white;
      border: none;
      padding: 10px 20px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 3;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 6px;
      color: #333;
    }

    .product-card:hover .quick-view-btn {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .quick-view-btn:hover {
      background: #667eea;
      color: white;
      box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
    }

    .quick-view-icon {
      font-size: 1.1rem;
    }

    .quick-view-text {
      font-size: 0.8125rem;
    }

    /* ==================== PRODUCT INFO ==================== */
    .product-info {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      cursor: pointer;
    }

    .product-title {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: #1f2937;
      font-weight: 600;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-description {
      margin: 0 0 1rem;
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ==================== FOOTER ==================== */
    .product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid #f3f4f6;
    }

    .product-price {
      flex: 1;
    }

    .price-amount {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
      line-height: 1;
    }

    /* ==================== ADD TO CART BUTTON ==================== */
    .btn-add-cart {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }

    .btn-add-cart:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-add-cart:active:not(:disabled) {
      transform: scale(0.95);
    }

    .btn-add-cart:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1.5rem;
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .product-card {
        border-radius: 12px;
      }

      .product-info {
        padding: 1rem;
      }

      .product-title {
        font-size: 0.9375rem;
      }

      .price-amount {
        font-size: 1.25rem;
      }

      .btn-add-cart {
        width: 44px;
        height: 44px;
      }
    }
  `]
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() isAddingToCart = false;
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();

  readonly ProductStatus = ProductStatus;
  imageError = false;

  getProductImage(): string | null {
    if (this.product.primaryImageUrl) {
      return this.product.primaryImageUrl;
    }

    if (this.product.media && this.product.media.length > 0) {
      const primaryMedia = this.product.media.find((m: any) => m.isPrimary);
      if (primaryMedia?.url) {
        return primaryMedia.url;
      }
      if (this.product.media[0]?.url) {
        return this.product.media[0].url;
      }
    }

    if (this.product.imageUrl) {
      return this.product.imageUrl;
    }

    return null;
  }

  hasMultipleImages(): boolean {
    return !!(this.product.media && this.product.media.length > 1);
  }

  getImageCount(): number {
    return this.product.media?.length || 0;
  }

  onImageError(event: Event): void {
    this.imageError = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.addToCart.emit(this.product);
  }

  onQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickView.emit(this.product);
  }
}
