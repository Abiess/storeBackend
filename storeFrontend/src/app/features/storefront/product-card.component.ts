import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, ProductStatus } from '@app/core/models';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <article class="product-card" [class.adding]="isAddingToCart">

      <!-- ── WISHLIST BUTTON ── -->
      <button class="wishlist-btn"
              (click)="onAddToWishlist($event)"
              [class.wishlisted]="isInWishlist"
              type="button"
              [attr.aria-label]="isInWishlist ? 'Von Wunschliste entfernen' : 'Zur Wunschliste hinzufügen'"
              [attr.aria-pressed]="isInWishlist">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
             [attr.fill]="isInWishlist ? 'currentColor' : 'none'"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      <!-- ── IMAGE SECTION ── -->
      <div class="product-image-section" [routerLink]="['/products', product.id]" role="link" [attr.aria-label]="product.title">

        <img *ngIf="getProductImage() && !imageError"
             [src]="getProductImage()"
             [alt]="product.title"
             class="product-img"
             loading="lazy"
             (error)="onImageError($event)">

        <!-- Placeholder SVG -->
        <div *ngIf="!getProductImage() || imageError" class="image-placeholder" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>

        <!-- Badges -->
        <div class="badges-stack" aria-hidden="true">
          <span class="badge badge-new" *ngIf="isNewProduct()">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            NEU
          </span>
          <span class="badge badge-sale" *ngIf="getDiscountPercent() > 0">
            −{{ getDiscountPercent() }}%
          </span>
        </div>

        <!-- Image count -->
        <span *ngIf="hasMultipleImages()" class="image-count" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          +{{ getImageCount() - 1 }}
        </span>

        <!-- Quick View -->
        <button class="quick-view-btn"
                (click)="onQuickView($event)"
                type="button"
                aria-label="Schnellansicht öffnen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {{ 'product.quickView' | translate }}
        </button>
      </div>

      <!-- ── PRODUCT INFO ── -->
      <div class="product-info" [routerLink]="['/products', product.id]" role="link">
        <h3 class="product-title">{{ product.title }}</h3>

        <p class="product-description" *ngIf="product.description">
          {{ product.description }}
        </p>

        <!-- Stars placeholder -->
        <div class="rating-row" aria-hidden="true">
          <span class="stars">
            <svg *ngFor="let s of [1,2,3,4,5]" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="star" [class.empty]="s > 4">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
          <span class="rating-count">({{ (product.id * 7 % 148) + 12 }})</span>
        </div>
      </div>

      <!-- ── FOOTER ── -->
      <div class="product-footer">
        <div class="price-block">
          <span class="price-current">{{ product.basePrice | number:'1.2-2' }} €</span>
          <span class="price-old" *ngIf="getDiscountPercent() > 0">
            {{ (product.basePrice * 1.2) | number:'1.2-2' }} €
          </span>
        </div>

        <button class="btn-add-cart"
                (click)="onAddToCart($event)"
                [disabled]="isAddingToCart"
                type="button"
                [attr.aria-label]="'In den Warenkorb: ' + product.title">
          <span class="cart-btn-icon">
            <svg *ngIf="!isAddingToCart" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <!-- Checkmark on success -->
            <svg *ngIf="isAddingToCart" class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </span>
        </button>
      </div>
    </article>
  `,
  styles: [`
    /* ════════════════════════════════════════
       PRODUCT CARD
       ════════════════════════════════════════ */
    .product-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(102, 126, 234, 0.08);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow:
        0 20px 48px rgba(102, 126, 234, 0.18),
        0 8px 16px rgba(0, 0, 0, 0.06);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .product-card.adding {
      pointer-events: none;
      opacity: 0.85;
    }

    /* ── WISHLIST BUTTON ── */
    .wishlist-btn {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 10;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

      &:hover {
        color: #f43f5e;
        transform: scale(1.15);
        background: white;
        box-shadow: 0 4px 16px rgba(244, 63, 94, 0.2);
      }

      &.wishlisted {
        color: #f43f5e;
        background: linear-gradient(135deg, #fff0f3, #ffe4ec);
        animation: heartBeat 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    }

    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      40%       { transform: scale(1.4); }
      70%       { transform: scale(0.95); }
    }

    /* ── IMAGE SECTION ── */
    .product-image-section {
      position: relative;
      padding-top: 100%;
      background: linear-gradient(135deg, #f8f8fc, #f0f0f8);
      overflow: hidden;
      cursor: pointer;
    }

    .product-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .product-card:hover .product-img {
      transform: scale(1.07);
    }

    .image-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0f0ff, #f8f0ff);
      color: #c4b5fd;
    }

    /* ── BADGES ── */
    .badges-stack {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 5;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .badge-new {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      animation: badgeSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .badge-sale {
      background: linear-gradient(135deg, #f5576c, #f093fb);
      color: white;
      box-shadow: 0 2px 8px rgba(245, 87, 108, 0.4);
    }

    @keyframes badgeSlide {
      from { transform: translateX(20px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }

    /* ── IMAGE COUNT ── */
    .image-count {
      position: absolute;
      bottom: 14px;
      left: 14px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      color: white;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 3;
    }

    /* ── QUICK VIEW ── */
    .quick-view-btn {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%) translateY(calc(100% + 16px));
      background: white;
      border: none;
      padding: 10px 20px;
      border-radius: 50px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      color: #1e293b;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 6;
      white-space: nowrap;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: -0.01em;

      &:hover {
        background: #1e293b;
        color: white;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      }
    }

    .product-card:hover .quick-view-btn {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Touch devices: always visible */
    @media (hover: none) {
      .quick-view-btn {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        font-size: 0.75rem;
        padding: 7px 14px;
        bottom: 10px;
      }
    }

    /* ── PRODUCT INFO ── */
    .product-info {
      padding: 1rem 1rem 0.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .product-title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: -0.01em;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-description {
      margin: 0;
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Stars */
    .rating-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }

    .stars { display: flex; gap: 1px; }

    .star {
      color: #fbbf24;
      width: 12px;
      height: 12px;

      &.empty { color: #e2e8f0; }
    }

    .rating-count {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* ── FOOTER ── */
    .product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem 1rem;
      gap: 0.75rem;
      border-top: 1px solid rgba(102, 126, 234, 0.06);
      margin-top: auto;
    }

    .price-block {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .price-current {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .price-old {
      font-size: 0.8125rem;
      color: #94a3b8;
      text-decoration: line-through;
      line-height: 1;
    }

    /* ── ADD TO CART BTN ── */
    .btn-add-cart {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.45);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      flex-shrink: 0;

      &:hover:not(:disabled) {
        transform: scale(1.15);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        background: linear-gradient(135deg, #7c94f0 0%, #8a5fb8 100%);
      }

      &:active:not(:disabled) {
        transform: scale(0.93);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .cart-btn-icon { display: flex; align-items: center; justify-content: center; }

    .spin-icon { animation: spin 0.8s linear infinite; }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 768px) {
      .product-card { border-radius: 14px; }

      .product-info { padding: 0.75rem 0.75rem 0.375rem; }
      .product-footer { padding: 0.625rem 0.75rem 0.75rem; }

      .product-title { font-size: 0.875rem; }
      .product-description { display: none; }
      .rating-row { display: none; }
      .price-current { font-size: 1.125rem; }
    }

    /* RTL */
    :host-context([dir="rtl"]) {
      .wishlist-btn { left: auto; right: 14px; }
      .badges-stack { right: auto; left: 14px; }
      .image-count { left: auto; right: 14px; }
      .product-footer { flex-direction: row-reverse; }
    }
  `]
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() storeId: number = 0;
  @Output() quickView = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();

  imageError = false;
  isAddingToCart = false;
  isInWishlist = false;

  constructor(
    private wishlistService: WishlistService,
    private authService: AuthService
  ) {}

  getProductImage(): string | null {
    if (this.product.primaryImageUrl) return this.product.primaryImageUrl;
    if (this.product.media?.length) {
      const primary = this.product.media.find((m: any) => m.isPrimary);
      return primary?.url || this.product.media[0]?.url || null;
    }
    return this.product.imageUrl || null;
  }

  hasMultipleImages(): boolean {
    return !!(this.product.media && this.product.media.length > 1);
  }

  getImageCount(): number {
    return this.product.media?.length || 0;
  }

  isNewProduct(): boolean {
    if (!this.product.createdAt) return false;
    const days = (Date.now() - new Date(this.product.createdAt).getTime()) / 86400000;
    return days <= 14;
  }

  getDiscountPercent(): number {
    const orig = (this.product as any).originalPrice;
    const curr = this.product.basePrice;
    if (orig && orig > curr) {
      return Math.round((1 - curr / orig) * 100);
    }
    return (this.product as any).discountPercentage || 0;
  }

  onImageError(event: Event): void {
    this.imageError = true;
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isAddingToCart = true;
    this.addToCart.emit(this.product);
    setTimeout(() => { this.isAddingToCart = false; }, 900);
  }

  onQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickView.emit(this.product);
  }

  onAddToWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.authService.isLoggedIn()) return;

    if (this.isInWishlist) {
      this.isInWishlist = false;
      return;
    }

    const sid = this.storeId;
    if (!sid) return;

    this.wishlistService.getDefaultWishlist(sid).subscribe({
      next: (wishlist) => {
        if (!wishlist || wishlist.id === 0) return;
        this.wishlistService.addToWishlist(wishlist.id, this.product.id).subscribe({
          next: () => { this.isInWishlist = true; },
          error: (error) => {
            if (error.status === 500 && error.error?.message) alert(error.error.message);
          }
        });
      },
      error: () => {}
    });
  }
}
