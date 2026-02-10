import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductStatus } from '@app/core/models';

/**
 * Modern Product Card Component (idealo.de style)
 * Clean, modern product display with hover effects
 */
@Component({
  selector: 'app-modern-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-card" [class.out-of-stock]="product.status !== ProductStatus.ACTIVE">
      <!-- Product Image -->
      <div class="product-image-wrapper" (click)="onQuickView()">
        <img
          [src]="product.imageUrl || 'assets/placeholder-product.png'"
          [alt]="product.name"
          class="product-image"
          loading="lazy">
        
        <!-- Badges -->
        <div class="product-badges">
          <span class="badge badge-new" *ngIf="isNew">Neu</span>
          <span class="badge badge-sale" *ngIf="product.discountPercentage">
            -{{ product.discountPercentage }}%
          </span>
          <span class="badge badge-out" *ngIf="product.status !== ProductStatus.ACTIVE">
            Nicht verfügbar
          </span>
        </div>

        <!-- Quick View Overlay -->
        <div class="quick-view-overlay">
          <button class="quick-view-btn" (click)="onQuickView(); $event.stopPropagation()">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3C5 3 1.73 6.11 1 10c.73 3.89 4 7 9 7s8.27-3.11 9-7c-.73-3.89-4-7-9-7z" 
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            Schnellansicht
          </button>
        </div>
      </div>

      <!-- Product Info -->
      <div class="product-info">
        <!-- Product Name -->
        <h3 class="product-name" [title]="product.name">
          {{ product.name }}
        </h3>

        <!-- Product Description (optional) -->
        <p class="product-description" *ngIf="showDescription && product.description">
          {{ truncateText(product.description, 60) }}
        </p>

        <!-- Price Section -->
        <div class="product-price-section">
          <div class="price-wrapper">
            <span class="product-price">{{ product.price | number:'1.2-2' }} €</span>
            <span class="product-price-old" *ngIf="product.originalPrice && product.originalPrice > product.price">
              {{ product.originalPrice | number:'1.2-2' }} €
            </span>
          </div>
        </div>

        <!-- Stock Info -->
        <div class="stock-info" *ngIf="product.stock !== undefined">
          <span class="stock-indicator" [class.low]="product.stock > 0 && product.stock <= 5">
            <span class="stock-dot"></span>
            <span *ngIf="product.stock > 5">Auf Lager</span>
            <span *ngIf="product.stock > 0 && product.stock <= 5">Nur noch {{ product.stock }} verfügbar</span>
            <span *ngIf="product.stock === 0">Ausverkauft</span>
          </span>
        </div>

        <!-- Action Button -->
        <button
          class="add-to-cart-btn"
          [disabled]="isAddingToCart || product.status !== ProductStatus.ACTIVE"
          (click)="onAddToCart()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" *ngIf="!isAddingToCart">
            <path d="M6 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM1 1h3l2.68 10.39a1.5 1.5 0 0 0 1.44 1.11h7.76a1.5 1.5 0 0 0 1.44-1.11L18 5H5" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="spinner" *ngIf="isAddingToCart"></span>
          <span>{{ buttonText }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ============================================
       Product Card Container
       ============================================ */
    .product-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .product-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transform: translateY(-4px);
    }

    .product-card.out-of-stock {
      opacity: 0.7;
    }

    /* ============================================
       Product Image
       ============================================ */
    .product-image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 100%; /* 1:1 Aspect Ratio */
      background: #f9fafb;
      overflow: hidden;
      cursor: pointer;
    }

    .product-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-card:hover .product-image {
      transform: scale(1.05);
    }

    /* ============================================
       Badges
       ============================================ */
    .product-badges {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 2;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .badge-new {
      background: #10b981;
      color: white;
    }

    .badge-sale {
      background: #ef4444;
      color: white;
    }

    .badge-out {
      background: #6b7280;
      color: white;
    }

    /* ============================================
       Quick View Overlay
       ============================================ */
    .quick-view-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1;
    }

    .product-card:hover .quick-view-overlay {
      opacity: 1;
    }

    .quick-view-btn {
      background: white;
      color: #111827;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transform: translateY(10px);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .product-card:hover .quick-view-btn {
      transform: translateY(0);
    }

    .quick-view-btn:hover {
      background: #f9fafb;
      transform: scale(1.05);
    }

    /* ============================================
       Product Info
       ============================================ */
    .product-info {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .product-name {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 42px;
    }

    .product-description {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ============================================
       Price Section
       ============================================ */
    .product-price-section {
      margin-top: auto;
    }

    .price-wrapper {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .product-price {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
    }

    .product-price-old {
      font-size: 16px;
      color: #9ca3af;
      text-decoration: line-through;
    }

    /* ============================================
       Stock Info
       ============================================ */
    .stock-info {
      font-size: 12px;
    }

    .stock-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #10b981;
      font-weight: 500;
    }

    .stock-indicator.low {
      color: #f59e0b;
    }

    .stock-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* ============================================
       Add to Cart Button
       ============================================ */
    .add-to-cart-btn {
      width: 100%;
      padding: 12px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      margin-top: 4px;
    }

    .add-to-cart-btn:hover:not(:disabled) {
      background: #1d4ed8;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .add-to-cart-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .add-to-cart-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    /* ============================================
       Loading Spinner
       ============================================ */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ============================================
       Mobile Styles
       ============================================ */
    @media (max-width: 768px) {
      .product-info {
        padding: 12px;
        gap: 8px;
      }

      .product-name {
        font-size: 14px;
        min-height: 38px;
      }

      .product-description {
        font-size: 12px;
      }

      .product-price {
        font-size: 18px;
      }

      .product-price-old {
        font-size: 14px;
      }

      .add-to-cart-btn {
        padding: 10px;
        font-size: 13px;
      }

      .quick-view-btn {
        padding: 10px 16px;
        font-size: 12px;
      }

      .product-badges {
        top: 8px;
        left: 8px;
      }

      .badge {
        font-size: 10px;
        padding: 3px 8px;
      }
    }

    @media (max-width: 480px) {
      .product-card:hover {
        transform: none;
      }

      .quick-view-overlay {
        display: none; /* Hide quick view on very small screens */
      }
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

  get buttonText(): string {
    if (this.isAddingToCart) return 'Wird hinzugefügt...';
    if (this.product.status !== ProductStatus.ACTIVE) return 'Nicht verfügbar';
    return 'In den Warenkorb';
  }

  onAddToCart(): void {
    if (this.product.status === ProductStatus.ACTIVE && !this.isAddingToCart) {
      this.addToCart.emit(this.product);
    }
  }

  onQuickView(): void {
    this.quickView.emit(this.product);
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

