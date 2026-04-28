import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CartService } from '@app/core/services/cart.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ProductVariantPickerComponent } from './product-variant-picker.component';

interface Product {
  id: number;
  title: string;
  description: string;
  basePrice: number;
  primaryImageUrl?: string;
  media?: any[];
  variants?: any[];
  categoryName?: string;
  averageRating?: number;
  reviewCount?: number;
}

@Component({
  selector: 'app-storefront-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProductVariantPickerComponent],
  template: `
    <div class="product-detail-page" *ngIf="product">
      <div class="breadcrumb">
        <a (click)="goBack()">← {{ 'common.back' | translate }}</a>
        <span *ngIf="product.categoryName"> / {{ product.categoryName }}</span>
        <span> / {{ product.title }}</span>
      </div>

      <div class="product-detail-grid">
        <!-- Product Images -->
        <div class="product-images">
          <div class="main-image" (click)="openLightbox()">
            <img #mainImg
                 [src]="currentImage || product.primaryImageUrl || 'assets/placeholder.png'"
                 [alt]="product.title"
                 class="main-img"
                 (error)="mainImg.src='assets/placeholder.png'">
            <div class="zoom-hint" *ngIf="galleryImages.length > 1">🔍 Klicken zum Vergrößern</div>
          </div>

          <div class="thumbnail-gallery" *ngIf="galleryImages.length > 1">
            <button
              *ngFor="let media of galleryImages; let i = index; trackBy: trackByUrl"
              class="thumbnail"
              [class.active]="currentImageIndex === i"
              (click)="selectImageByIndex(i)"
              [title]="media.alt || product.title"
            >
              <img [src]="media.url" [alt]="media.alt || product.title"
                   (error)="$any($event.target).style.opacity='0.3'">
              <div class="thumb-variant-badge" *ngIf="getVariantForImage(media) as v">
                {{ v.price | number:'1.2-2' }}€
              </div>
            </button>
          </div>

          <!-- Varianten-Info-Panel beim Bild-Klick -->
          <div class="image-variant-info" *ngIf="hoveredImageVariant">
            <div class="ivar-price">{{ hoveredImageVariant.price | number:'1.2-2' }} €</div>
            <div class="ivar-attrs" *ngIf="hoveredImageVariant.attributes">
              <span class="ivar-attr" *ngFor="let attr of getAttrEntries(hoveredImageVariant.attributes)">
                <strong>{{ attr.key }}:</strong> {{ attr.value }}
              </span>
            </div>
            <div class="ivar-stock"
                 [class.in]="hoveredImageVariant.stockQuantity > 0"
                 [class.out]="hoveredImageVariant.stockQuantity === 0">
              {{ hoveredImageVariant.stockQuantity > 0 ? '✓ verfügbar (' + hoveredImageVariant.stockQuantity + ')' : '✗ Ausverkauft' }}
            </div>
          </div>
        </div>

        <!-- Lightbox -->
        <div class="lightbox-overlay" *ngIf="lightboxOpen" (click)="closeLightbox()">
          <button class="lb-close" (click)="closeLightbox()">✕</button>
          <div class="lb-content" (click)="$event.stopPropagation()">
            <img [src]="currentImage || ''" [alt]="product.title">
            <button class="lb-nav lb-prev" *ngIf="currentImageIndex > 0" (click)="prevImage(); $event.stopPropagation()">‹</button>
            <button class="lb-nav lb-next" *ngIf="currentImageIndex < galleryImages.length - 1" (click)="nextImage(); $event.stopPropagation()">›</button>
            <div class="lb-counter">{{ currentImageIndex + 1 }} / {{ galleryImages.length }}</div>
          </div>
        </div>

        <!-- Product Info -->
        <div class="product-info">
          <h1 class="product-title">{{ product.title }}</h1>
          
          <!-- Reviews -->
          <div class="reviews-section" *ngIf="product.reviewCount && product.reviewCount > 0">
            <div class="stars">
              <span *ngFor="let star of [1,2,3,4,5]" 
                    [class.filled]="star <= (product.averageRating || 0)">
                ★
              </span>
            </div>
            <span class="review-count">({{ product.reviewCount }} {{ 'product.reviews' | translate }})</span>
          </div>

          <!-- Price -->
          <div class="price-section">
            <span class="price">
              <span *ngIf="showFromPrefix()" class="from-prefix">ab </span>{{ getCurrentPrice() | number:'1.2-2' }} €
            </span>
          </div>

          <!-- Variant Picker -->
          <app-product-variant-picker
            *ngIf="product.variants && product.variants.length > 0"
            [variants]="product.variants"
            [defaultVariantId]="selectedVariant?.id"
            (variantSelected)="onVariantSelected($event)"
          ></app-product-variant-picker>

          <!-- Quantity Selector -->
          <div class="quantity-section">
            <label>{{ 'product.quantity' | translate }}</label>
            <div class="quantity-control">
              <button (click)="decrementQuantity()" [disabled]="quantity <= 1">-</button>
              <input type="number" [(ngModel)]="quantity" min="1" [max]="getMaxQuantity()">
              <button (click)="incrementQuantity()" [disabled]="quantity >= getMaxQuantity()">+</button>
            </div>
          </div>

          <!-- Add to Cart Button -->
          <div class="actions">
            <button 
              class="btn-add-to-cart"
              (click)="addToCart()"
              [disabled]="!canAddToCart() || adding"
            >
              <span *ngIf="!adding">🛒 {{ 'product.addToCart' | translate }}</span>
              <span *ngIf="adding">{{ 'product.adding' | translate }}</span>
            </button>
            
            <button class="btn-wishlist" [title]="'product.addToWishlist' | translate">
              ❤️
            </button>
          </div>

          <!-- ✅ STEP 5: Warn-Message wenn Button disabled -->
          <div class="add-to-cart-message" *ngIf="!canAddToCart() && !adding">
            <p class="warning-message">
              <span *ngIf="getStockQuantity() === 0">
                ⚠️ Dieser Artikel ist derzeit ausverkauft
              </span>
              <span *ngIf="getStockQuantity() > 0 && quantity > getStockQuantity()">
                ⚠️ Nicht genug auf Lager (max. {{ getStockQuantity() }} verfügbar)
              </span>
              <span *ngIf="(product?.variants?.length ?? 0) > 0 && !selectedVariant">
                ℹ️ Bitte wählen Sie eine Variante aus
              </span>
            </p>
          </div>

          <!-- Stock Info -->
          <div class="stock-info">
            <span 
              class="stock-badge"
              [class.in-stock]="getStockQuantity() > 5"
              [class.low-stock]="getStockQuantity() > 0 && getStockQuantity() <= 5"
              [class.out-of-stock]="getStockQuantity() === 0"
            >
              <!-- ✅ STEP 5: Klarere Stock-Messages -->
              <span *ngIf="getStockQuantity() > 5">
                ✓ {{ 'product.inStock' | translate }}
              </span>
              <span *ngIf="getStockQuantity() > 0 && getStockQuantity() <= 5">
                ⚠️ Nur noch {{ getStockQuantity() }} verfügbar
              </span>
              <span *ngIf="getStockQuantity() === 0">
                ✗ Ausverkauft
              </span>
            </span>
          </div>

          <!-- Description -->
          <div class="description-section">
            <h2>{{ 'product.description' | translate }}</h2>
            <p>{{ product.description }}</p>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div class="success-toast" *ngIf="showSuccess">
        ✅ {{ 'cart.added' | translate }}
      </div>
    </div>

    <div class="loading" *ngIf="loading">
      <div class="spinner"></div>
      <p>{{ 'common.loading' | translate }}</p>
    </div>

    <div class="error" *ngIf="error">
      <p>{{ error }}</p>
      <button (click)="goBack()">{{ 'common.back' | translate }}</button>
    </div>
  `,
  styles: [`
    .product-detail-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .breadcrumb {
      margin-bottom: 2rem;
      font-size: 0.875rem;
      color: #666;
    }

    .breadcrumb a {
      color: #667eea;
      cursor: pointer;
      text-decoration: none;
    }

    .breadcrumb a:hover {
      text-decoration: underline;
    }

    .product-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
    }

    /* Product Images */
    .product-images {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .main-image {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 16px;
      overflow: hidden;
      background: #f8f9fa;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      position: relative;
      cursor: zoom-in;
    }

    .main-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .main-image:hover .main-img {
      transform: scale(1.04);
    }

    .zoom-hint {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.65);
      color: #fff;
      padding: 0.3rem 0.9rem;
      border-radius: 20px;
      font-size: 0.8rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
      white-space: nowrap;
    }

    .main-image:hover .zoom-hint {
      opacity: 1;
    }

    /* Varianten-Info-Panel unter Thumbnails */
    .image-variant-info {
      background: linear-gradient(135deg, #667eea15, #764ba215);
      border: 1.5px solid #667eea40;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      animation: fadeSlideIn 0.25s ease;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ivar-price {
      font-size: 1.3rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .ivar-attrs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .ivar-attr {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 0.2rem 0.6rem;
      font-size: 0.85rem;
      color: #333;
    }

    .ivar-stock {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.2rem 0.7rem;
      border-radius: 20px;
    }

    .ivar-stock.in { background: #d4edda; color: #155724; }
    .ivar-stock.out { background: #f8d7da; color: #721c24; }

    /* Thumbnail Badge */
    .thumb-variant-badge {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(102,126,234,0.85);
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      text-align: center;
      padding: 0.15rem 0;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .thumbnail:hover .thumb-variant-badge,
    .thumbnail.active .thumb-variant-badge {
      opacity: 1;
    }

    /* Lightbox */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .lb-close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      z-index: 10001;
    }

    .lb-close:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }

    .lb-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
    }

    .lb-content img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    }

    .lb-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.85);
      border: none;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      font-size: 2rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .lb-nav:hover { background: white; transform: translateY(-50%) scale(1.1); }
    .lb-prev { left: -65px; }
    .lb-next { right: -65px; }

    .lb-counter {
      position: absolute;
      bottom: -2.5rem;
      width: 100%;
      text-align: center;
      color: rgba(255,255,255,0.8);
      font-size: 0.9rem;
    }

    .thumbnail-gallery {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
    }

    .thumbnail {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background: white;
      padding: 0;
      transition: all 0.25s;
      position: relative;
    }

    .thumbnail:hover {
      border-color: #667eea;
    }

    .thumbnail.active {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Product Info */
    .product-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .product-title {
      font-size: 2rem;
      font-weight: 700;
      color: #333;
      margin: 0;
    }

    .reviews-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stars {
      display: flex;
      gap: 0.125rem;
      font-size: 1.25rem;
    }

    .stars span {
      color: #ddd;
    }

    .stars span.filled {
      color: #ffc107;
    }

    .review-count {
      color: #666;
      font-size: 0.875rem;
    }

    .price-section {
      padding: 1rem 0;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }

    .price {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .from-prefix {
      font-size: 1.25rem;
      font-weight: 500;
      color: #666;
      -webkit-text-fill-color: #666;
    }

    /* Quantity Selector */
    .quantity-section label {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .quantity-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: fit-content;
    }

    .quantity-control button {
      width: 40px;
      height: 40px;
      border: 2px solid #dee2e6;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.25rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .quantity-control button:hover:not(:disabled) {
      border-color: #667eea;
      color: #667eea;
    }

    .quantity-control button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .quantity-control input {
      width: 80px;
      height: 40px;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      text-align: center;
      font-size: 1rem;
      font-weight: 600;
    }

    .quantity-control input:focus {
      outline: none;
      border-color: #667eea;
    }

    /* Actions */
    .actions {
      display: flex;
      gap: 1rem;
    }

    .btn-add-to-cart {
      flex: 1;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 1.125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-add-to-cart:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-add-to-cart:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-wishlist {
      width: 56px;
      height: 56px;
      background: white;
      border: 2px solid #dee2e6;
      border-radius: 12px;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-wishlist:hover {
      border-color: #e83e8c;
      transform: scale(1.1);
    }

    /* ✅ STEP 5: Warning Message */
    .add-to-cart-message {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
    }

    .warning-message {
      margin: 0;
      color: #856404;
      font-size: 0.9375rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Stock Info */
    .stock-info {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .stock-badge.in-stock {
      background: #d4edda;
      color: #155724;
    }

    .stock-badge.low-stock {
      background: #fff3cd;
      color: #856404;
    }

    .stock-badge.out-of-stock {
      background: #f8d7da;
      color: #721c24;
    }

    /* Description */
    .description-section h2 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: #333;
    }

    .description-section p {
      line-height: 1.6;
      color: #666;
    }

    /* Success Toast */
    .success-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #28a745;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      z-index: 1000;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Loading & Error */
    .loading, .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 968px) {
      .product-detail-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .product-title {
        font-size: 1.5rem;
      }

      .price {
        font-size: 2rem;
      }

      .lb-prev { left: 0.5rem; }
      .lb-next { right: 0.5rem; }
      .lb-nav { width: 40px; height: 40px; font-size: 1.5rem; }
    }
  `]
})
export class StorefrontProductDetailComponent implements OnInit {
  product: Product | null = null;
  selectedVariant: any = null;
  quantity = 1;
  currentImage: string | null = null;
  currentImageIndex = 0;
  lightboxOpen = false;
  loading = true;
  error = '';
  adding = false;
  showSuccess = false;
  hoveredImageVariant: any = null;

  /** Gecachtes Galerie-Array – wird nur neu gebaut wenn nötig (nicht bei jedem Change-Detection-Zyklus) */
  galleryImages: { url: string; alt: string }[] = [];

  storeId!: number;
  productId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.productId = Number(this.route.snapshot.paramMap.get('productId'));
    
    if (!this.storeId || !this.productId) {
      this.error = 'Ungültige Parameter';
      this.loading = false;
      return;
    }

    this.loadProduct();
  }

  loadProduct() {
    this.loading = true;
    this.error = '';

    this.productService.getProduct(this.storeId, this.productId).subscribe({
      next: (product) => {
        this.product = product as any;
        // Cache sofort aufbauen mit Produkt-Media
        this.rebuildGallery();
        // Erstes Bild setzen
        if (this.galleryImages.length > 0) {
          this.currentImage = this.galleryImages[0].url;
          this.currentImageIndex = 0;
        } else {
          this.currentImage = product.primaryImageUrl || null;
          this.currentImageIndex = 0;
        }

        // Lade Varianten für das Produkt
        this.loadProductVariants();

        // Track view
        this.productService.trackProductView(this.storeId, this.productId).subscribe();
      },
      error: (err) => {
        console.error('Error loading product:', err);
        this.error = 'Produkt konnte nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  loadProductVariants() {
    this.productService.getProductVariants(this.storeId, this.productId).subscribe({
      next: (variants) => {
        if (this.product) {
          this.product.variants = variants;
          console.log('✅ Loaded variants:', variants.length);

          // ✅ STEP 3: Prüfe URL Query-Parameter für Varianten-Auswahl
          const variantIdFromUrl = this.route.snapshot.queryParamMap.get('variant');
          let selectedFromUrl = false;

          if (variantIdFromUrl && variants.length > 0) {
            const variantId = Number(variantIdFromUrl);
            const variantFromUrl = variants.find(v => v.id === variantId);

            if (variantFromUrl) {
              // URL-Variante gefunden → verwende diese
              this.selectedVariant = variantFromUrl;
              selectedFromUrl = true;
              console.log('🔗 Selected variant from URL:', variantFromUrl.sku);
            } else {
              console.warn('⚠️ Variant ID from URL not found:', variantId);
            }
          }

          // ✅ AUTO-SELECT: Fallback wenn keine URL-Variante oder nicht gefunden
          if (variants.length > 0 && !this.selectedVariant && !selectedFromUrl) {
            const firstAvailableVariant = variants.find(v => v.stockQuantity > 0) || variants[0];
            this.selectedVariant = firstAvailableVariant;
            console.log('🎯 Auto-selected variant:', firstAvailableVariant.sku);
            this.updateUrlWithVariant(firstAvailableVariant.id);
          }

          // Cache nach Varianten-Laden neu aufbauen
          this.rebuildGallery();
          if (this.galleryImages.length > 0) {
            this.currentImage = this.galleryImages[0].url;
            this.currentImageIndex = 0;
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading variants:', err);
        // Nicht kritisch - Produkt kann auch ohne Varianten angezeigt werden
        this.loading = false;
      }
    });
  }

  onVariantSelected(variant: any) {
    this.selectedVariant = variant;
    console.log('🔄 Variant selected:', variant?.sku, 'Price:', variant?.price);

    // ✅ STEP 3: Update URL mit ausgewählter Variante
    if (variant?.id) {
      this.updateUrlWithVariant(variant.id);
    }

    // ✅ STEP 5: Auto-korrigiere Quantity wenn über Stock der neuen Variante
    if (variant && variant.stockQuantity > 0) {
      const maxStock = variant.stockQuantity;
      if (this.quantity > maxStock) {
        console.log('⚠️ Quantity exceeds new variant stock, auto-correcting:', this.quantity, '→', maxStock);
        this.quantity = maxStock;
      }
    }

    // ✅ STEP 2: Variantenbilder-Logik
    // TODO: Backend muss erst variant.images unterstützen (variant_id in product_media Tabelle)
    // Aktuell: Varianten haben KEINE eigenen Bilder im Backend

    if (variant?.images && variant.images.length > 0) {
      // Fall 1: Variante hat eigene Bilder → images ist string[] (URLs direkt)
      this.currentImage = variant.images[0]; // ← string, kein .url!
      this.currentImageIndex = 0;
      this.hoveredImageVariant = variant;
      console.log('🖼️ Using variant images:', variant.images.length);
    } else if (variant?.imageUrl) {
      // Fall 2: Variante hat einzelnes Bild
      this.currentImage = variant.imageUrl;
      this.currentImageIndex = 0;
      this.hoveredImageVariant = variant;
      console.log('🖼️ Using variant imageUrl');
    } else {
      // Fall 3: Keine Variantenbilder → fallback auf Produktbilder, Index zurücksetzen
      const media = this.product?.media;
      if (media && media.length > 0) {
        this.currentImage = media[0].url;
      } else {
        this.currentImage = this.product?.primaryImageUrl || null;
      }
      this.currentImageIndex = 0;
      this.hoveredImageVariant = null;
      console.log('⚠️ Variant has no images, using product primary image');
    }

    // Gallery-Cache immer neu aufbauen nach Varianten-Wechsel
    this.rebuildGallery();
    // currentImage sicherstellen dass es im neuen galleryImages ist
    if (this.currentImage && this.galleryImages.length > 0) {
      const idx = this.galleryImages.findIndex(m => m.url === this.currentImage);
      this.currentImageIndex = idx >= 0 ? idx : 0;
      if (idx < 0) this.currentImage = this.galleryImages[0].url;
    }
  }

  selectImage(url: string) {
    this.currentImage = url;
    const images = this.getGalleryImages();
    const idx = images.findIndex((m: any) => m.url === url);
    this.currentImageIndex = idx >= 0 ? idx : 0;
    this.hoveredImageVariant = this.getVariantForImage({ url });
  }

  selectImageByIndex(index: number): void {
    if (index < 0 || index >= this.galleryImages.length) return;
    this.currentImageIndex = index;
    this.currentImage = this.galleryImages[index].url;
    this.hoveredImageVariant = this.getVariantForImage(this.galleryImages[index]);
  }

  prevImage(): void {
    if (this.currentImageIndex > 0) this.selectImageByIndex(this.currentImageIndex - 1);
  }

  nextImage(): void {
    if (this.currentImageIndex < this.galleryImages.length - 1)
      this.selectImageByIndex(this.currentImageIndex + 1);
  }

  openLightbox(): void {
    if (this.galleryImages.length > 1) {
      this.lightboxOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * Baut galleryImages[] einmalig auf und cached es.
   * Nur aufrufen wenn Produkt/Variante sich ändert – NICHT bei jedem CD-Zyklus.
   */
  rebuildGallery(): void {
    // Fall 1: Variante hat eigene Bilder (string[])
    if (this.selectedVariant?.images && this.selectedVariant.images.length > 0) {
      this.galleryImages = (this.selectedVariant.images as string[]).map((url: string) => ({
        url,
        alt: this.selectedVariant?.sku || this.product?.title || ''
      }));
      return;
    }
    // Fall 2: Produkt-Media-Array ({url, alt}[])
    const media: any[] = this.product?.media || [];
    if (media.length > 0) {
      this.galleryImages = media.map((m: any) => ({ url: m.url, alt: m.alt || this.product?.title || '' }));
      return;
    }
    // Fall 3: Nur primaryImageUrl
    const primary = this.product?.primaryImageUrl;
    this.galleryImages = primary ? [{ url: primary, alt: this.product?.title || '' }] : [];
  }

  /** trackBy für *ngFor – verhindert DOM-Neuaufbau bei CD */
  trackByUrl(_index: number, item: { url: string }): string {
    return item.url;
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder.png';
  }

  onThumbError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.3';
  }

  /**
   * Findet die Variante die zum übergebenen Bild-Objekt passt
   * (über imageUrl-Match oder Position in media-Array).
   */
  getVariantForImage(media: any): any | null {
    if (!this.product?.variants?.length) return null;
    const url: string = media?.url ?? '';
    if (!url) return null;
    return this.product.variants.find((v: any) =>
      (v.imageUrl && v.imageUrl === url) ||
      // images ist string[] (direkte URLs), kein Objekt-Array
      (v.images && Array.isArray(v.images) && v.images.some((imgUrl: string) => imgUrl === url))
    ) || null;
  }

  /**
   * Wandelt Varianten-Attribute-Objekt in Key-Value-Array für *ngFor um.
   */
  getAttrEntries(attrs: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(attrs).map(([key, value]) => ({ key, value }));
  }

  /**
   * ✅ STEP 3: Aktualisiert URL mit Varianten-ID (ohne Page Reload)
   */
  private updateUrlWithVariant(variantId: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: variantId },
      queryParamsHandling: 'merge',
      replaceUrl: true  // replaceUrl = korrekte Angular NavigationExtras API
    });
  }

  getGalleryImages(): any[] {
    return this.galleryImages;
  }

  hasGalleryImages(): boolean {
    return this.galleryImages.length > 1;
  }

  getCurrentPrice(): number {
    // 1️⃣ Wenn Variante ausgewählt → Variantenpreis
    if (this.selectedVariant) {
      return this.selectedVariant.price;
    }

    // 2️⃣ Wenn Varianten vorhanden aber keine ausgewählt → niedrigster Preis
    if (this.product?.variants && this.product.variants.length > 0) {
      const prices = this.product.variants.map((v: any) => v.price);
      return Math.min(...prices);
    }

    // 3️⃣ Fallback: Basis-Preis
    return this.product?.basePrice || 0;
  }

  /**
   * Zeigt "ab" nur wenn Varianten existieren aber keine ausgewählt ist
   */
  showFromPrefix(): boolean {
    return !this.selectedVariant &&
           !!(this.product?.variants && this.product.variants.length > 0);
  }

  getStockQuantity(): number {
    if (this.selectedVariant) {
      return this.selectedVariant.stockQuantity;
    }
    // Wenn keine Varianten, angenommen unbegrenzt verfügbar
    return (this.product?.variants?.length ?? 0) > 0 ? 0 : 999;
  }

  getMaxQuantity(): number {
    const stock = this.getStockQuantity();
    return Math.min(stock, 99);
  }

  incrementQuantity() {
    if (this.quantity < this.getMaxQuantity()) {
      this.quantity++;
    }
  }

  decrementQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  canAddToCart(): boolean {
    // ✅ STEP 5: Erweiterte Validierung mit Quantity-Check

    // Fall 1: Produkt mit Varianten
    if (this.product?.variants && this.product.variants.length > 0) {
      // Variante muss ausgewählt sein
      if (!this.selectedVariant) return false;

      // Variante muss auf Lager sein
      if (this.selectedVariant.stockQuantity <= 0) return false;

      // Quantity darf nicht über Bestand liegen
      if (this.quantity > this.selectedVariant.stockQuantity) return false;

      return true;
    }

    // Fall 2: Simple Product (ohne Varianten)
    // Hier könnte product.stockQuantity geprüft werden, falls vorhanden
    return true;
  }

  addToCart() {
    if (!this.canAddToCart() || this.adding) return;

    // ✅ STEP 5: Auto-korrigiere Quantity falls über Stock
    const maxStock = this.getStockQuantity();
    if (this.quantity > maxStock && maxStock > 0) {
      console.log('⚠️ Quantity exceeds stock, auto-correcting:', this.quantity, '→', maxStock);
      this.quantity = maxStock;
    }

    this.adding = true;

    const request = {
      storeId: this.storeId,
      productId: this.productId,
      variantId: this.selectedVariant?.id,
      quantity: this.quantity
    };

    this.cartService.addItem(request).subscribe({
      next: () => {
        this.adding = false;
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 3000);
      },
      error: (err: any) => {
        console.error('Error adding to cart:', err);
        this.error = 'Fehler beim Hinzufügen zum Warenkorb.';
        this.adding = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/stores', this.storeId, 'products']);
  }
}

