import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, ProductVariant } from '@app/core/models';
import { ProductImageGalleryComponent } from './product-image-gallery.component';
import { ProductReviewsComponent } from './product-reviews.component';

/**
 * Product Quick View Modal Component
 * Zeigt Produktdetails in einem Modal ohne Navigation zur Detail-Seite
 */
@Component({
  selector: 'app-product-quick-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductImageGalleryComponent, ProductReviewsComponent],
  template: `
    <div *ngIf="isOpen" class="quick-view-overlay" (click)="closeModal()">
      <div class="quick-view-modal" (click)="$event.stopPropagation()">
        <!-- Close Button -->
        <button class="close-btn" (click)="closeModal()">
          <span class="close-icon">✕</span>
        </button>

        <div class="modal-content">
          <!-- Linke Seite: Bildgalerie -->
          <div class="image-section">
            <!-- Lade-Indikator für Variantenwechsel -->
            <div *ngIf="isLoadingVariant" class="loading-overlay">
              <div class="spinner"></div>
              <p>Lade Variante...</p>
            </div>
            
            <app-product-image-gallery
              [images]="getProductImages()"
              [primaryImageUrl]="product?.primaryImageUrl"
              [productTitle]="product?.title || 'Produkt'">
            </app-product-image-gallery>
          </div>

          <!-- Rechte Seite: Produktinformationen -->
          <div class="info-section">
            <div class="product-header">
              <h2 class="product-title">{{ product?.title }}</h2>
              <div class="product-price">
                <span class="price-amount">{{ getCurrentPrice() | number:'1.2-2' }} €</span>
                <span class="price-label">inkl. MwSt.</span>
              </div>
            </div>

            <p class="product-description">{{ product?.description }}</p>

            <!-- Produkt-Informationen (SKU, EAN, etc.) -->
            <div *ngIf="selectedVariant || product" class="product-info-grid">
              <div class="info-row" *ngIf="selectedVariant?.sku || product?.sku">
                <span class="info-label">SKU:</span>
                <span class="info-value">{{ selectedVariant?.sku || product?.sku }}</span>
              </div>
              <div class="info-row" *ngIf="selectedVariant?.barcode">
                <span class="info-label">EAN:</span>
                <span class="info-value">{{ selectedVariant.barcode }}</span>
              </div>
              <div class="info-row" *ngIf="getComparePrice() > 0">
                <span class="info-label">UVP:</span>
                <span class="info-value compare-price">
                  <span class="strikethrough">{{ getComparePrice() | number:'1.2-2' }} €</span>
                  <span class="savings">Sie sparen {{ getSavings() | number:'1.2-2' }} €</span>
                </span>
              </div>
            </div>

            <!-- Varianten-Auswahl -->
            <div *ngIf="hasVariants()" class="variants-section">
              <h3 class="section-title">Varianten</h3>
              <div class="variant-options">
                <button
                  *ngFor="let variant of product?.variants"
                  class="variant-btn"
                  [class.active]="selectedVariant?.id === variant.id"
                  [class.loading]="isLoadingVariant && selectedVariant?.id !== variant.id"
                  (click)="selectVariant(variant)">
                  <span class="variant-name">{{ getVariantDisplayName(variant) }}</span>
                  <span class="variant-price">
                    {{ variant.price | number:'1.2-2' }} €
                  </span>
                  <span class="variant-stock" *ngIf="variant.stock > 0">
                    ({{ variant.stock }} verfügbar)
                  </span>
                  <!-- Kleiner Spinner beim aktiven Button -->
                  <span *ngIf="isLoadingVariant && selectedVariant?.id !== variant.id" class="btn-spinner"></span>
                </button>
              </div>
            </div>

            <!-- Menge -->
            <div class="quantity-section">
              <label class="quantity-label">Menge:</label>
              <div class="quantity-controls">
                <button class="qty-btn" (click)="decreaseQuantity()" [disabled]="quantity <= 1">
                  −
                </button>
                <input
                  type="number"
                  class="qty-input"
                  [(ngModel)]="quantity"
                  [min]="1"
                  [max]="99">
                <button class="qty-btn" (click)="increaseQuantity()" [disabled]="quantity >= 99">
                  +
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button
                class="btn btn-primary btn-add-to-cart"
                (click)="addToCart()"
                [disabled]="isAddingToCart || !isVariantAvailable()">
                <span class="btn-icon">🛒</span>
                <span class="btn-text">
                  {{ getAddToCartLabel() }}
                </span>
              </button>

              <button class="btn btn-secondary btn-view-details" (click)="viewDetails()">
                <span class="btn-icon">👁️</span>
                <span class="btn-text">Details ansehen</span>
              </button>
            </div>

            <!-- Zusatzinformationen -->
            <div class="additional-info">
              <div class="info-item">
                <span class="info-icon">✓</span>
                <span class="info-text">Kostenloser Versand ab 50€</span>
              </div>
              <div class="info-item">
                <span class="info-icon">↩</span>
                <span class="info-text">30 Tage Rückgaberecht</span>
              </div>
              <div class="info-item">
                <span class="info-icon">🔒</span>
                <span class="info-text">Sichere Bezahlung</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews Section (full width unterhalb der Produktinfo) -->
        <div class="reviews-section" *ngIf="product?.id">
          <app-product-reviews [productId]="product!.id"></app-product-reviews>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quick-view-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      animation: fadeIn 0.3s ease;
      overflow-y: auto;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .quick-view-modal {
      background: white;
      border-radius: 16px;
      max-width: 1200px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      animation: slideUp 0.3s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.2);
      transform: rotate(90deg);
    }

    .close-icon {
      font-size: 1.5rem;
      color: #333;
    }

    .modal-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      padding: 2rem;
    }

    .image-section {
      padding-right: 1rem;
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      border-radius: 12px;
      animation: fadeIn 0.2s ease;
    }

    .loading-overlay p {
      margin-top: 1rem;
      color: #667eea;
      font-weight: 600;
      font-size: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f0f4ff;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .info-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .product-header {
      padding-bottom: 1rem;
      border-bottom: 2px solid #e9ecef;
    }

    .product-title {
      margin: 0 0 1rem;
      font-size: 1.75rem;
      font-weight: 700;
      color: #333;
      line-height: 1.3;
    }

    .product-price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .price-amount {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
    }

    .price-label {
      font-size: 0.875rem;
      color: #999;
    }

    .product-description {
      font-size: 1rem;
      line-height: 1.6;
      color: #666;
      margin: 0;
    }

    .product-info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9375rem;
    }

    .info-label {
      font-weight: 600;
      color: #555;
    }

    .info-value {
      color: #333;
    }

    .compare-price {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .strikethrough {
      text-decoration: line-through;
      color: #999;
      font-size: 0.875rem;
    }

    .savings {
      color: #28a745;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
      color: #333;
    }

    .variants-section {
      padding: 1rem 0;
      border-top: 1px solid #e9ecef;
    }

    .variant-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .variant-btn {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
      gap: 0.75rem;
      position: relative;
    }

    .variant-btn:hover {
      border-color: #667eea;
      background: #f0f4ff;
      transform: translateX(4px);
    }

    .variant-btn.active {
      border-color: #667eea;
      background: #667eea;
      color: white;
      animation: pulse 0.4s ease;
    }

    @keyframes pulse {
      0%, 100% { 
        transform: scale(1); 
      }
      50% { 
        transform: scale(1.02); 
      }
    }

    .variant-btn.loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #f0f4ff;
      border-top: 2px solid #667eea;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .variant-name {
      font-weight: 600;
      flex: 1;
    }

    .variant-price {
      font-weight: 700;
      white-space: nowrap;
    }

    .variant-stock {
      font-size: 0.875rem;
      color: #28a745;
      font-weight: 500;
      white-space: nowrap;
    }

    .variant-btn.active .variant-stock {
      color: rgba(255, 255, 255, 0.9);
    }

    .quantity-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 0;
      border-top: 1px solid #e9ecef;
    }

    .quantity-label {
      font-weight: 600;
      color: #333;
    }

    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .qty-btn {
      width: 40px;
      height: 40px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.25rem;
      font-weight: 600;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qty-btn:hover:not(:disabled) {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .qty-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .qty-input {
      width: 60px;
      height: 40px;
      text-align: center;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      padding-top: 1rem;
    }

    .btn {
      flex: 1;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-secondary:hover {
      background: #667eea;
      color: white;
    }

    .btn-icon {
      font-size: 1.25rem;
    }

    .additional-info {
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9375rem;
    }

    .info-icon {
      font-size: 1.125rem;
      color: #28a745;
    }

    .info-text {
      color: #666;
    }

    .reviews-section {
      padding: 2rem;
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
    }

    /* Responsive */
    @media (max-width: 968px) {
      .modal-content {
        grid-template-columns: 1fr;
      }

      .image-section {
        padding-right: 0;
      }

      .action-buttons {
        flex-direction: column;
      }
    }

    @media (max-width: 768px) {
      .quick-view-overlay {
        padding: 1rem;
      }

      .quick-view-modal {
        max-height: 95vh;
      }

      .modal-content {
        padding: 1.5rem;
        gap: 1.5rem;
      }

      .product-title {
        font-size: 1.5rem;
      }

      .price-amount {
        font-size: 1.75rem;
      }
    }
  `]
})
export class ProductQuickViewComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() addToCartEvent = new EventEmitter<{ product: Product; quantity: number; variant?: ProductVariant }>();
  @Output() viewDetailsEvent = new EventEmitter<Product>();

  selectedVariant: ProductVariant | null = null;
  quantity = 1;
  isAddingToCart = false;
  isLoadingVariant = false;

  ngOnInit(): void {
    // Wähle erste Variante wenn vorhanden
    if (this.hasVariants() && this.product?.variants) {
      this.selectedVariant = this.product.variants[0];
    }
  }

  getProductImages(): string[] {
    const images: string[] = [];

    // FIXED: Zeige Varianten-Bilder wenn Variante ausgewählt ist
    if (this.selectedVariant) {
      // Varianten-Bilder (mehrere)
      if (this.selectedVariant.images && this.selectedVariant.images.length > 0) {
        images.push(...this.selectedVariant.images);
      } 
      // Varianten-Haupt-Bild (einzelnes)
      else if (this.selectedVariant.imageUrl) {
        images.push(this.selectedVariant.imageUrl);
      }
      // Alternative field name
      else if (this.selectedVariant.mediaUrls && this.selectedVariant.mediaUrls.length > 0) {
        images.push(...this.selectedVariant.mediaUrls);
      }
    }

    // Fallback: Produkt-Bilder wenn keine Variante oder keine Varianten-Bilder
    if (images.length === 0) {
      if (this.product?.primaryImageUrl) {
        images.push(this.product.primaryImageUrl);
      }

      if (this.product?.media && this.product.media.length > 0) {
        this.product.media.forEach((media: any) => {
          if (media.url && media.url !== this.product?.primaryImageUrl) {
            images.push(media.url);
          }
        });
      }
    }

    return images;
  }

  hasVariants(): boolean {
    return !!(this.product?.variants && this.product.variants.length > 0);
  }

  /**
   * Generiert Anzeigename für Variante aus option1/option2/option3
   * Fallback: SKU oder "Variante #ID"
   */
  getVariantDisplayName(variant: ProductVariant): string {
    // Prüfe ob name direkt vorhanden ist
    if (variant.name) {
      return variant.name;
    }

    // Kombiniere option1/option2/option3 (z.B. "Rot / M / Baumwolle")
    const options = [variant.option1, variant.option2, variant.option3]
      .filter(opt => opt && opt.trim() !== '')
      .join(' / ');
    
    if (options) {
      return options;
    }

    // Fallback: SKU
    if (variant.sku) {
      return variant.sku;
    }

    // Last resort: ID
    return `Variante #${variant.id}`;
  }

  selectVariant(variant: ProductVariant): void {
    // Zeige kurze Lade-Animation beim Wechsel
    this.isLoadingVariant = true;
    
    // Setze neue Variante nach kurzer Verzögerung für visuelle Rückmeldung
    setTimeout(() => {
      this.selectedVariant = variant;
      this.isLoadingVariant = false;
    }, 200);
  }

  getCurrentPrice(): number {
    if (this.selectedVariant) {
      return this.selectedVariant.price;
    }
    return this.product?.basePrice || 0;
  }

  getComparePrice(): number {
    if (this.selectedVariant?.comparePrice) {
      return this.selectedVariant.comparePrice;
    }
    return this.product?.comparePrice || 0;
  }

  getSavings(): number {
    const comparePrice = this.getComparePrice();
    const currentPrice = this.getCurrentPrice();
    if (comparePrice > currentPrice) {
      return comparePrice - currentPrice;
    }
    return 0;
  }

  /**
   * Prüft ob die ausgewählte Variante verfügbar ist (Lagerbestand > 0)
   */
  isVariantAvailable(): boolean {
    // Wenn Varianten existieren, muss eine ausgewählt sein
    if (this.hasVariants()) {
      if (!this.selectedVariant) {
        return false;
      }
      // Prüfe Stock (stockQuantity ist das primäre Feld)
      const stock = this.selectedVariant.stockQuantity ?? this.selectedVariant.stock ?? 0;
      return stock > 0;
    }
    // Wenn keine Varianten → Produkt-Lagerbestand prüfen
    return (this.product?.stock ?? 0) > 0;
  }

  /**
   * Gibt das passende Label für den Add-to-Cart Button zurück
   */
  getAddToCartLabel(): string {
    if (this.isAddingToCart) {
      return 'Wird hinzugefügt...';
    }
    if (!this.isVariantAvailable()) {
      return 'Nicht verfügbar';
    }
    return 'In den Warenkorb';
  }

  increaseQuantity(): void {
    if (this.quantity < 99) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  async addToCart(): Promise<void> {
    if (!this.product || this.isAddingToCart) return;

    this.isAddingToCart = true;

    try {
      this.addToCartEvent.emit({
        product: this.product,
        quantity: this.quantity,
        variant: this.selectedVariant || undefined
      });

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Schließe Modal nach erfolgreichem Hinzufügen
      this.closeModal();
    } finally {
      this.isAddingToCart = false;
    }
  }

  viewDetails(): void {
    if (this.product) {
      this.viewDetailsEvent.emit(this.product);
      this.closeModal();
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.quantity = 1;
    this.selectedVariant = null;
    this.close.emit();
  }
}
