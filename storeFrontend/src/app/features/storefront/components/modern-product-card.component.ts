import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductStatus } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';

/**
 * Modern Product Card Component – Vibrant Redesign 2.0
 * Glassmorphism Quick View, Gradient Buttons, Spring Animations
 */
@Component({
  selector: 'app-modern-product-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="product-card" [class.out-of-stock]="product.status !== ProductStatus.ACTIVE">

      <!-- Product Image -->
      <div class="product-image-wrapper" (click)="onQuickView()">
        <img
          [src]="getProductImage() || 'assets/placeholder-product.png'"
          [alt]="product.name"
          class="product-image"
          loading="lazy">

        <!-- Badges -->
        <div class="product-badges">
          <span class="badge badge-new" *ngIf="isNew">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            {{ 'product.new' | translate }}
          </span>
          <span class="badge badge-sale" *ngIf="product.discountPercentage">
            −{{ product.discountPercentage }}%
          </span>
          <span class="badge badge-out" *ngIf="product.status !== ProductStatus.ACTIVE">
            {{ 'product.outOfStock' | translate }}
          </span>
        </div>

        <!-- Quick View Overlay -->
        <div class="quick-view-overlay">
          <button class="quick-view-btn" (click)="onQuickView(); $event.stopPropagation()" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {{ 'product.quickView' | translate }}
          </button>
        </div>
      </div>

      <!-- Product Info -->
      <div class="product-info">
        <h3 class="product-name" [title]="product.name">{{ product.name }}</h3>

        <p class="product-description" *ngIf="showDescription && product.description">
          {{ truncateText(product.description, 60) }}
        </p>

        <!-- Price -->
        <div class="product-price-section">
          <div class="price-wrapper">
            <span class="product-price">{{ product.price | number:'1.2-2' }} €</span>
            <span class="product-price-old" *ngIf="product.originalPrice && product.originalPrice > (product.price ?? 0)">
              {{ product.originalPrice | number:'1.2-2' }} €
            </span>
          </div>
        </div>

        <!-- Stock Info -->
        <div class="stock-info" *ngIf="product.stock !== undefined">
          <span class="stock-indicator" [class.low]="product.stock > 0 && product.stock <= 5">
            <span class="stock-dot"></span>
            <span *ngIf="product.stock > 5">{{ 'product.inStock' | translate }}</span>
            <span *ngIf="product.stock > 0 && product.stock <= 5">{{ 'product.lowStock' | translate: { count: product.stock } }}</span>
            <span *ngIf="product.stock === 0">{{ 'product.soldOut' | translate }}</span>
          </span>
        </div>

        <!-- Action Button -->
        <button
          class="add-to-cart-btn"
          [disabled]="isAddingToCart || product.status !== ProductStatus.ACTIVE"
          (click)="onAddToCart()"
          type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" *ngIf="!isAddingToCart" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="spinner" *ngIf="isAddingToCart"></span>
          <span>{{ buttonText }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════
       PRODUCT CARD – VIBRANT REDESIGN
       ════════════════════════════════════════ */
    .product-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(102, 126, 234, 0.08);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      border: 1px solid rgba(102, 126, 234, 0.08);
    }

    .product-card:hover {
      box-shadow: 0 20px 48px rgba(102, 126, 234, 0.18);
      transform: translateY(-8px);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .product-card.out-of-stock { opacity: 0.7; }

    /* ── IMAGE ── */
    .product-image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 100%;
      background: linear-gradient(135deg, #f8f8fc, #f0f0f8);
      overflow: hidden;
      cursor: pointer;
    }

    .product-image {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .product-card:hover .product-image { transform: scale(1.07); }

    /* ── BADGES ── */
    .product-badges {
      position: absolute;
      top: 12px; left: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 2;
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
    }

    .badge-sale {
      background: linear-gradient(135deg, #f5576c, #f093fb);
      color: white;
      box-shadow: 0 2px 8px rgba(245, 87, 108, 0.4);
    }

    .badge-out {
      background: #64748b;
      color: white;
    }

    /* ── QUICK VIEW OVERLAY ── */
    .quick-view-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 17, 23, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 3;
    }

    .product-card:hover .quick-view-overlay { opacity: 1; }

    .quick-view-btn {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      color: #1e293b;
      border: none;
      padding: 11px 22px;
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transform: translateY(12px) scale(0.95);
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      letter-spacing: -0.01em;
    }

    .product-card:hover .quick-view-btn { transform: translateY(0) scale(1); }

    .quick-view-btn:hover {
      background: #1e293b;
      color: white;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    /* ── PRODUCT INFO ── */
    .product-info {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .product-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.7em;
      letter-spacing: -0.01em;
    }

    .product-description {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── PRICE ── */
    .product-price-section { margin-top: auto; }

    .price-wrapper {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .product-price {
      font-size: 1.375rem;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .product-price-old {
      font-size: 1rem;
      color: #94a3b8;
      text-decoration: line-through;
      line-height: 1;
    }

    /* ── STOCK INFO ── */
    .stock-info { font-size: 0.75rem; }

    .stock-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #22c55e;
      font-weight: 500;
    }

    .stock-indicator.low { color: #f59e0b; }

    .stock-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* ── ADD TO CART – VIBRANT GRADIENT ── */
    .add-to-cart-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
      letter-spacing: -0.01em;
    }

    .add-to-cart-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
      background: linear-gradient(135deg, #7c94f0 0%, #8a5fb8 100%);
    }

    .add-to-cart-btn:active:not(:disabled) { transform: scale(0.97); }

    .add-to-cart-btn:disabled {
      background: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ── SPINNER ── */
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── MOBILE ── */
    @media (max-width: 768px) {
      .product-card { border-radius: 14px; }
      .product-info { padding: 12px; gap: 8px; }
      .product-name { font-size: 0.875rem; }
      .product-description { font-size: 0.75rem; }
      .product-price { font-size: 1.125rem; }
      .add-to-cart-btn { padding: 10px; font-size: 0.8125rem; border-radius: 10px; }
      .quick-view-btn { padding: 9px 16px; font-size: 0.75rem; }
    }

    @media (max-width: 480px) {
      .product-card:hover { transform: none; }
      .quick-view-overlay { display: none; }
    }
  `]
})
export class ModernProductCardComponent {
  @Input() product!: Product;
  @Input() isAddingToCart = false;
  @Input() showDescription = false;
  @Input() isNew = false;

  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();

  readonly ProductStatus = ProductStatus;

  constructor(private translationService: TranslationService) {}

  get buttonText(): string {
    if (this.isAddingToCart) return this.translationService.translate('product.adding');
    if (this.product.status !== ProductStatus.ACTIVE) return this.translationService.translate('product.outOfStock');
    return this.translationService.translate('product.addToCart');
  }

  onAddToCart(): void {
    if (this.product.status === ProductStatus.ACTIVE && !this.isAddingToCart) {
      this.addToCart.emit(this.product);
    }
  }

  onQuickView(): void {
    this.quickView.emit(this.product);
  }

  getProductImage(): string | null {
    if (this.product.primaryImageUrl) return this.product.primaryImageUrl;
    if (this.product.imageUrl) return this.product.imageUrl;
    if (this.product.media?.length) {
      const primaryMedia = this.product.media.find((m: any) => m.isPrimary);
      if (primaryMedia?.url) return primaryMedia.url;
      const firstMedia = this.product.media.find((m: any) => m.url);
      if (firstMedia?.url) return firstMedia.url;
    }
    return null;
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}
