import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, ProductStatus } from '@app/core/models';
import { WishlistService } from '../../core/services/wishlist.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="product-card">
      <!-- Wishlist Heart Button -->
      <button class="wishlist-btn" 
              (click)="onAddToWishlist($event)"
              [class.active]="isInWishlist"
              type="button"
              aria-label="Add to wishlist">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                [attr.fill]="isInWishlist ? 'currentColor' : 'none'"
                [attr.stroke]="isInWishlist ? 'none' : 'currentColor'"
                stroke-width="2"/>
        </svg>
      </button>

      <!-- Modern Image Section -->
      <div class="product-image-section" [routerLink]="['/products', product.id]">
        <img *ngIf="getProductImage()" 
             [src]="getProductImage()" 
             [alt]="product.title"
             class="product-img"
             (error)="onImageError($event)">
        
        <div *ngIf="!getProductImage() || imageError" class="image-placeholder">
          <span class="placeholder-icon">📷</span>
        </div>

        <!-- Image Count Badge -->
        <span *ngIf="hasMultipleImages()" class="image-count-badge">
          +{{ getImageCount() - 1 }}
        </span>

        <!-- Quick View Button -->
        <button class="quick-view-btn" 
                (click)="onQuickView($event)"
                type="button"
                aria-label="Quick view">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="currentColor"/>
          </svg>
          <span>{{ 'product.quickView' | translate }}</span>
        </button>
      </div>

      <div class="product-info" [routerLink]="['/products', product.id]">
        <h3 class="product-title">{{ product.title }}</h3>
        <p class="product-description" *ngIf="product.description">{{ product.description }}</p>

        <div class="product-footer">
          <div class="product-price">
            <span class="price-amount">{{ product.basePrice | number:'1.2-2' }} €</span>
          </div>

          <button class="btn-add-cart"
                  (click)="onAddToCart($event)"
                  [disabled]="isAddingToCart"
                  type="button"
                  aria-label="Add to cart">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 1h2.59l.83 2H17a1 1 0 01.97 1.24l-2 7A1 1 0 0115 12H8.36l-.5 2H14a1 1 0 110 2H7a1 1 0 01-.97-1.24l.5-2H4a1 1 0 01-1-1V3H2a1 1 0 110-2zm5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== MODERN PRODUCT CARD - APPLE/NIKE STYLE ==================== */
    .product-card {
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      border: 1px solid rgba(0, 0, 0, 0.04);
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      border-color: rgba(0, 0, 0, 0.08);
    }

    /* ==================== IMAGE SECTION ==================== */
    .product-image-section {
      position: relative;
      padding-top: 100%;
      background: #f5f5f7;
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
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
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
      background: linear-gradient(135deg, #f5f5f7, #e8e8ed);
    }

    .placeholder-icon {
      font-size: 3rem;
      opacity: 0.25;
      filter: grayscale(1);
    }

    /* ==================== BADGES ==================== */
    .image-count-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      color: white;
      padding: 6px 10px;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      z-index: 2;
      letter-spacing: 0.02em;
    }

    /* ==================== QUICK VIEW BUTTON ==================== */
    .quick-view-btn {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(calc(100% + 20px));
      background: white;
      border: none;
      padding: 12px 24px;
      border-radius: 980px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 3;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1d1d1f;
      letter-spacing: -0.01em;
    }

    .product-card:hover .quick-view-btn {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .quick-view-btn:hover {
      background: #000;
      color: white;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }

    .quick-view-btn svg {
      width: 18px;
      height: 18px;
    }

    /* ==================== PRODUCT INFO ==================== */
    .product-info {
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      gap: 0.5rem;
    }

    .product-title {
      margin: 0;
      font-size: 1rem;
      color: #1d1d1f;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.6em;
    }

    .product-description {
      margin: 0;
      color: #6e6e73;
      font-size: 0.875rem;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    /* ==================== FOOTER ==================== */
    .product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: auto;
      padding-top: 1rem;
    }

    .product-price {
      flex: 1;
    }

    .price-amount {
      display: block;
      font-size: 1.375rem;
      font-weight: 600;
      color: #1d1d1f;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    /* ==================== ADD TO CART BUTTON ==================== */
    .btn-add-cart {
      background: #0071e3;
      color: white;
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 113, 227, 0.25);
    }

    .btn-add-cart:hover:not(:disabled) {
      background: #0077ed;
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(0, 113, 227, 0.4);
    }

    .btn-add-cart:active:not(:disabled) {
      transform: scale(0.95);
    }

    .btn-add-cart:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-add-cart svg {
      width: 20px;
      height: 20px;
    }

    /* ==================== WISHLIST HEART BUTTON ==================== */
    .wishlist-btn {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 4;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      color: #1d1d1f;
    }

    .wishlist-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .wishlist-btn.active {
      background: #ff3b30;
      color: white;
      animation: heartBeat 0.6s ease-in-out;
    }

    .wishlist-btn svg {
      width: 22px;
      height: 22px;
      transition: transform 0.3s ease;
    }

    .wishlist-btn:active svg {
      transform: scale(0.9);
    }

    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.3); }
      50% { transform: scale(1.1); }
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .product-card {
        border-radius: 14px;
      }

      .product-info {
        padding: 1.25rem;
      }

      .product-title {
        font-size: 0.9375rem;
      }

      .price-amount {
        font-size: 1.25rem;
      }

      .btn-add-cart {
        width: 40px;
        height: 40px;
      }
      
      .quick-view-btn {
        font-size: 0.8125rem;
        padding: 10px 20px;
      }
    }
  `]
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() quickView = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();

  imageError = false;
  isAddingToCart = false;
  isInWishlist = false;
  private storeId = 1; // TODO: Get from context

  constructor(private wishlistService: WishlistService) {}

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

  onAddToWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.isInWishlist) {
      // TODO: Remove from wishlist
      this.isInWishlist = false;
      return;
    }

    // ✅ Lade Default-Wishlist und prüfe auf gültige ID
    this.wishlistService.getDefaultWishlist(this.storeId).subscribe({
      next: (wishlist) => {
        // ✅ Prüfe ob es eine echte Wishlist ist (nicht Gast-Wishlist mit ID=0)
        if (!wishlist || wishlist.id === 0) {
          console.error('⚠️ Ungültige Wishlist-ID:', wishlist?.id);
          return;
        }

        // ✅ Füge Item zur echten Wishlist hinzu
        this.wishlistService.addToWishlist(wishlist.id, this.product.id).subscribe({
          next: () => {
            this.isInWishlist = true;
            console.log('✅ Zur Wunschliste hinzugefügt!');
          },
          error: (error) => {
            console.error('❌ Fehler beim Hinzufügen zur Wunschliste:', error);
            if (error.status === 401) {
            } else if (error.status === 500 && error.error?.message) {
              alert(error.error.message);
            } else {
            }
          }
        });
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden der Wunschliste:', error);
        if (error.status === 401) {
        } else {
        }
      }
    });
  }
}
