import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, ProductStatus } from '@app/core/models';
import { ProductImageGalleryComponent } from '@app/shared/components/product-image-gallery.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductImageGalleryComponent],
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
          <span class="badge-icon">🖼️</span>
          {{ getImageCount() }}
        </span>

        <span *ngIf="product.status === ProductStatus.PUBLISHED" class="product-badge badge-new">
          Neu
        </span>

        <!-- Quick View Button - mit stopPropagation -->
        <button class="quick-view-btn" 
                (click)="onQuickView($event)"
                type="button">
          👁️ Schnellansicht
        </button>
      </div>

      <div class="product-info" [routerLink]="['/products', product.id]">
        <h3 class="product-title">{{ product.title }}</h3>
        <p class="product-description">{{ product.description }}</p>

        <div class="product-footer">
          <div class="product-price">
            <span class="price-amount">{{ product.basePrice | number:'1.2-2' }} €</span>
            <span class="price-label">inkl. MwSt.</span>
          </div>

          <button class="btn btn-add-cart"
                  (click)="onAddToCart($event)"
                  [disabled]="isAddingToCart"
                  type="button">
            <span class="btn-icon">🛒</span>
            <span class="btn-text">
              {{ isAddingToCart ? 'Wird hinzugefügt...' : 'In den Warenkorb' }}
            </span>
          </button>
        </div>

        <div *ngIf="product.variants && product.variants.length > 0" class="product-variants">
          <small>{{ product.variants.length }} Variante(n) verfügbar</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      background: white;
      border-radius: var(--theme-border-radius, 8px);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--theme-border, #e9ecef);
      cursor: pointer;
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .product-image-section {
      position: relative;
      padding-top: 75%;
      background: var(--theme-background, #f8f9fa);
      overflow: hidden;
    }

    .product-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .product-card:hover .product-img {
      transform: scale(1.05);
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
      border-radius: var(--theme-border-radius, 8px);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      z-index: 2;
    }

    .badge-new {
      background: var(--theme-success, #28a745);
      color: white;
    }

    .image-count-badge {
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      z-index: 2;
    }

    .badge-icon {
      font-size: 0.875rem;
    }

    /* Quick View Button */
    .quick-view-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.95);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 24px;
      font-weight: 600;
      cursor: pointer;
      opacity: 0;
      transition: all 0.3s;
      z-index: 3;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .product-card:hover .quick-view-btn {
      opacity: 1;
    }

    .quick-view-btn:hover {
      transform: translate(-50%, -50%) scale(1.05);
      background: white;
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
      color: var(--theme-text, #333);
      font-weight: 600;
      line-height: 1.4;
      font-family: var(--theme-heading-font-family, var(--theme-font-family, inherit));
    }

    .product-description {
      margin: 0 0 1rem;
      color: var(--theme-text-secondary, #666);
      font-size: var(--theme-font-size-small, 0.875rem);
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
      border-top: 1px solid var(--theme-border, #e9ecef);
    }

    .product-price {
      margin-bottom: 1rem;
    }

    .price-amount {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--theme-primary, #667eea);
    }

    .price-label {
      font-size: 0.75rem;
      color: var(--theme-text-secondary, #999);
    }

    .btn-add-cart {
      width: 100%;
      background: linear-gradient(135deg, var(--theme-primary, #667eea), var(--theme-secondary, #764ba2));
      color: white;
      border: none;
      padding: 0.875rem 1.25rem;
      border-radius: var(--theme-border-radius, 8px);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s;
    }

    .btn-add-cart:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-add-cart:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1.125rem;
    }

    .product-variants {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--theme-border, #e9ecef);
    }

    .product-variants small {
      color: var(--theme-text-secondary, #666);
      font-size: 0.8125rem;
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
