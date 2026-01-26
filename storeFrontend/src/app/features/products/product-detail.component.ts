import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { ProductImageGalleryComponent } from '@app/shared/components/product-image-gallery.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductImageGalleryComponent],
  template: `
    <div class="product-detail-page" *ngIf="product">
      <div class="container">
        <div class="product-layout">
          <!-- Linke Seite: Bildgalerie -->
          <div class="gallery-section">
            <app-product-image-gallery
              [images]="getProductImages()"
              [primaryImageUrl]="product.title"
              [productTitle]="product.title">
            </app-product-image-gallery>
          </div>

          <!-- Rechte Seite: Produktinfo -->
          <div class="info-section">
            <div class="product-header">
              <h1 class="product-title">{{ product.title }}</h1>
              <div class="product-meta">
                <span class="product-status" [class.in-stock]="isInStock()">
                  {{ isInStock() ? '✓ Auf Lager' : '✗ Ausverkauft' }}
                </span>
              </div>
            </div>

            <div class="price-section">
              <div class="current-price">
                <span class="price-value">{{ product.basePrice | number:'1.2-2' }} €</span>
                <span class="price-label">inkl. MwSt.</span>
              </div>
            </div>

            <div class="description-section">
              <h3>Beschreibung</h3>
              <p>{{ product.description }}</p>
            </div>

            <!-- Varianten (falls vorhanden) -->
            <div *ngIf="product.variants && product.variants.length > 0" class="variants-section">
              <h3>Varianten</h3>
              <div class="variants-grid">
                <button *ngFor="let variant of product.variants"
                        class="variant-btn"
                        [class.active]="selectedVariant?.id === variant.id"
                        (click)="selectVariant(variant)">
                  {{ variant.name || variant.sku }}
                </button>
              </div>
            </div>

            <!-- Menge & In den Warenkorb -->
            <div class="actions-section">
              <div class="quantity-selector">
                <button class="qty-btn" (click)="decreaseQuantity()" [disabled]="quantity <= 1">-</button>
                <input type="number"
                       [(ngModel)]="quantity"
                       min="1"
                       class="qty-input"
                       readonly>
                <button class="qty-btn" (click)="increaseQuantity()">+</button>
              </div>

              <button class="btn-add-cart"
                      (click)="addToCart()"
                      [disabled]="isAddingToCart || !isInStock()">
                <span class="btn-icon">🛒</span>
                {{ isAddingToCart ? 'Wird hinzugefügt...' : 'In den Warenkorb' }}
              </button>
            </div>

            <!-- Zusätzliche Infos -->
            <div class="additional-info">
              <div class="info-item">
                <span class="icon">🚚</span>
                <div>
                  <strong>Kostenloser Versand</strong>
                  <p>Ab 50€ Bestellwert</p>
                </div>
              </div>
              <div class="info-item">
                <span class="icon">↩️</span>
                <div>
                  <strong>30 Tage Rückgaberecht</strong>
                  <p>Ohne Angabe von Gründen</p>
                </div>
              </div>
              <div class="info-item">
                <span class="icon">🔒</span>
                <div>
                  <strong>Sichere Zahlung</strong>
                  <p>SSL-verschlüsselt</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Produkt wird geladen...</p>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="error-state">
      <h2>❌ Produkt nicht gefunden</h2>
      <p>{{ error }}</p>
      <button class="btn-primary" (click)="goBack()">Zurück</button>
    </div>
  `,
  styles: [`
    .product-detail-page {
      padding: 2rem 0;
      min-height: calc(100vh - 200px);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .product-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: start;
    }

    .gallery-section {
      position: sticky;
      top: 2rem;
    }

    .info-section {
      padding: 1rem 0;
    }

    .product-header {
      margin-bottom: 1.5rem;
    }

    .product-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 1rem;
      color: #333;
      line-height: 1.3;
    }

    .product-meta {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .product-status {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      background: #f0f0f0;
      color: #666;
    }

    .product-status.in-stock {
      background: #d4edda;
      color: #155724;
    }

    .price-section {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .current-price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .price-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .price-label {
      font-size: 0.875rem;
      color: #666;
    }

    .description-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e9ecef;
    }

    .description-section h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #333;
    }

    .description-section p {
      line-height: 1.8;
      color: #666;
    }

    .variants-section {
      margin-bottom: 2rem;
    }

    .variants-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .variants-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .variant-btn {
      padding: 0.75rem 1.5rem;
      border: 2px solid #e9ecef;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }

    .variant-btn:hover {
      border-color: #667eea;
      background: #f8f9fa;
    }

    .variant-btn.active {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }

    .actions-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .quantity-selector {
      display: flex;
      align-items: center;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      overflow: hidden;
    }

    .qty-btn {
      width: 48px;
      height: 48px;
      border: none;
      background: white;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.3s;
    }

    .qty-btn:hover:not(:disabled) {
      background: #f8f9fa;
    }

    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .qty-input {
      width: 60px;
      text-align: center;
      border: none;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .btn-add-cart {
      flex: 1;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0 2rem;
      border-radius: 8px;
      font-size: 1.125rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      transition: all 0.3s;
    }

    .btn-add-cart:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }

    .btn-add-cart:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1.5rem;
    }

    .additional-info {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
    }

    .info-item {
      display: flex;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-item .icon {
      font-size: 1.5rem;
    }

    .info-item strong {
      display: block;
      margin-bottom: 0.25rem;
      color: #333;
    }

    .info-item p {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
    }

    .spinner {
      border: 4px solid #f3f4f6;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
    }

    @media (max-width: 968px) {
      .product-layout {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .gallery-section {
        position: relative;
        top: 0;
      }

      .product-title {
        font-size: 1.5rem;
      }

      .price-value {
        font-size: 2rem;
      }

      .actions-section {
        flex-direction: column;
      }

      .quantity-selector {
        justify-content: center;
      }
    }
  `]
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  error: string | null = null;
  quantity = 1;
  selectedVariant: any = null;
  isAddingToCart = false;
  storeId!: number;
  productId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.productId = Number(this.route.snapshot.paramMap.get('productId'));

    if (!this.storeId || !this.productId) {
      this.error = 'Ungültige Produkt-ID';
      this.loading = false;
      return;
    }

    this.loadProduct();
  }

  loadProduct(): void {
    this.loading = true;
    this.productService.getProduct(this.storeId, this.productId).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
        
        // Wähle erste Variante aus, falls vorhanden
        if (product.variants && product.variants.length > 0) {
          this.selectedVariant = product.variants[0];
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden des Produkts:', err);
        this.error = 'Produkt konnte nicht geladen werden';
        this.loading = false;
      }
    });
  }

  getProductImages(): string[] {
    if (!this.product || !this.product.media) {
      return [];
    }

    return this.product.media
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(m => m.url)
      .filter(url => url) as string[];
  }

  isInStock(): boolean {
    if (this.selectedVariant) {
      return this.selectedVariant.stock > 0;
    }
    return this.product?.stock ? this.product.stock > 0 : true;
  }

  selectVariant(variant: any): void {
    this.selectedVariant = variant;
  }

  increaseQuantity(): void {
    this.quantity++;
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    if (!this.product) return;

    this.isAddingToCart = true;
    
    // TODO: Cart-Service implementieren
    console.log('Zum Warenkorb hinzufügen:', {
      product: this.product,
      variant: this.selectedVariant,
      quantity: this.quantity
    });

    setTimeout(() => {
      this.isAddingToCart = false;
      alert(`${this.quantity}x "${this.product?.title}" wurde zum Warenkorb hinzugefügt!`);
    }, 500);
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'products']);
  }
}
