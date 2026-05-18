import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
            <!-- Verbesserter Lade-Indikator für Variantenwechsel -->
            <div *ngIf="isLoadingVariant" class="loading-overlay">
              <div class="spinner-center">
                <div class="spinner"></div>
                <p class="loading-text">Lade Variante...</p>
              </div>
            </div>
            
            <!-- Kompakter Indikator oben rechts -->
            <div *ngIf="isLoadingVariant" class="loading-indicator-corner">
              <div class="spinner-small"></div>
            </div>
            
            <app-product-image-gallery
              [images]="galleryImages"
              [primaryImageUrl]="galleryPrimaryImageUrl"
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
              <div class="info-row" *ngIf="getCurrentSku()">
                <span class="info-label">SKU:</span>
                <span class="info-value">{{ getCurrentSku() }}</span>
              </div>
              <div class="info-row" *ngIf="selectedVariant?.barcode">
                <span class="info-label">EAN:</span>
                <span class="info-value">{{ selectedVariant?.barcode }}</span>
              </div>
              <div class="info-row" *ngIf="getComparePrice() > 0">
                <span class="info-label">UVP:</span>
                <span class="info-value compare-price">
                  <span class="strikethrough">{{ getComparePrice() | number:'1.2-2' }} €</span>
                  <span class="savings">Sie sparen {{ getSavings() | number:'1.2-2' }} €</span>
                </span>
              </div>
            </div>

            <!-- Varianten-Auswahl – intelligente Option-Chips -->
            <div *ngIf="hasVariants()" class="variants-section">

              <!-- Kein Variant gewählt → Hinweis-Banner -->
              <div *ngIf="!selectedVariant" class="variant-hint-banner">
                <span class="hint-icon">👆</span>
                <span>Bitte wählen Sie eine Kombination</span>
              </div>

              <!-- Ausgewählte Variante – Zusammenfassung -->
              <div *ngIf="selectedVariant" class="selected-variant-summary">
                <div class="summary-left">
                  <span class="summary-label">Gewählt:</span>
                  <span class="summary-value">{{ getVariantDisplayName(selectedVariant) }}</span>
                </div>
                <div class="summary-right">
                  <span class="summary-price">{{ selectedVariant.price | number:'1.2-2' }} €</span>
                  <span *ngIf="getStockBadge(selectedVariant) as badge"
                        class="stock-badge"
                        [ngClass]="getStockBadgeClass(selectedVariant)">
                    {{ badge }}
                  </span>
                </div>
              </div>

              <!-- Option-Gruppen als Chips -->
              <div *ngFor="let group of getOptionGroups()" class="option-group">
                <div class="option-group-header">
                  <span class="option-group-name">{{ group.label }}</span>
                  <span *ngIf="getSelectedValueForOption(group.key)" class="option-selected-label">
                    — {{ getSelectedValueForOption(group.key) }}
                  </span>
                </div>
                <div class="option-chips">
                  <button
                    *ngFor="let value of group.values"
                    class="option-chip"
                    [class.chip-selected]="getSelectedValueForOption(group.key) === value"
                    [class.chip-unavailable]="!isOptionCombinationAvailable(group.key, value)"
                    [class.chip-has-color]="getColorHex(value) !== null"
                    (click)="selectOptionValue(group.key, value)"
                    [title]="value + (!isOptionCombinationAvailable(group.key, value) ? ' – ausverkauft' : '')">

                    <!-- Farbfläche -->
                    <span *ngIf="getColorHex(value) as hex"
                          class="color-dot"
                          [style.background-color]="hex"
                          [style.border]="hex === '#fafafa' ? '1.5px solid #ccc' : 'none'">
                    </span>

                    <span class="chip-text">{{ value }}</span>

                    <!-- Durchstrich-Overlay für ausverkauft -->
                    <span *ngIf="!isOptionCombinationAvailable(group.key, value)"
                          class="chip-cross-line"></span>
                  </button>
                </div>
              </div>

              <!-- Fallback: Wenn keine option-Gruppen erkannt → alte Chip-Liste -->
              <div *ngIf="getOptionGroups().length === 0" class="option-group">
                <div class="option-group-header">
                  <span class="option-group-name">Variante wählen</span>
                </div>
                <div class="option-chips">
                  <button
                    *ngFor="let variant of product?.variants"
                    class="option-chip"
                    [class.chip-selected]="selectedVariant?.id === variant.id"
                    [class.chip-unavailable]="variant.stockQuantity !== null && variant.stockQuantity !== undefined && variant.stockQuantity <= 0"
                    (click)="selectVariant(variant)">
                    <span class="chip-text">{{ getVariantDisplayName(variant) }}</span>
                     <span class="chip-price">{{ variant.price | number:'1.2-2' }} €</span>
                  </button>
                </div>
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
                [disabled]="isAddingToCart || isAddToCartDisabled()">
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
      max-height: 95vh;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      animation: slideUp 0.3s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
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
      align-items: center;
      justify-content: center;
      z-index: 100;
      border-radius: 12px;
      animation: fadeIn 0.2s ease;
      backdrop-filter: blur(4px);
    }

    .spinner-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .loading-text {
      margin-top: 1rem;
      color: #667eea;
      font-weight: 600;
      font-size: 1rem;
      animation: pulse-text 1.5s ease-in-out infinite;
    }

    @keyframes pulse-text {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    /* Kompakter Indikator oben rechts im Bild-Bereich */
    .loading-indicator-corner {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 101;
      background: rgba(102, 126, 234, 0.95);
      padding: 0.75rem;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      animation: slideInRight 0.3s ease, pulse-corner 2s ease-in-out infinite;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(50px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes pulse-corner {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      50% {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f0f4ff;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-small {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
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
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Banner wenn nichts gewählt */
    .variant-hint-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: linear-gradient(135deg, #fff3cd, #fff8e1);
      border: 1px solid #ffc107;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #856404;
      animation: pulse-banner 2s ease-in-out infinite;
    }

    @keyframes pulse-banner {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.3); }
      50%       { box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.15); }
    }

    .hint-icon { font-size: 1.1rem; }

    /* Ausgewählte Variante – Zusammenfassung */
    .selected-variant-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: linear-gradient(135deg, #f0f4ff, #e8ecff);
      border: 1.5px solid #667eea;
      border-radius: 10px;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .summary-label {
      font-size: 0.8rem;
      color: #888;
      font-weight: 500;
    }

    .summary-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #333;
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .summary-price {
      font-size: 1.1rem;
      font-weight: 700;
      color: #667eea;
    }

    /* Stock Badges */
    .stock-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-out {
      background: #ffeef0;
      color: #c62828;
      border: 1px solid #ef9a9a;
    }

    .badge-low {
      background: #fff3e0;
      color: #e65100;
      border: 1px solid #ffcc80;
    }

    .badge-limited {
      background: #fffde7;
      color: #f57f17;
      border: 1px solid #fff176;
    }

    /* Option-Gruppe */
    .option-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .option-group-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .option-group-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .option-selected-label {
      font-size: 0.85rem;
      color: #667eea;
      font-weight: 600;
    }

    /* Chips-Container */
    .option-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    /* Einzelner Chip */
    .option-chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.9rem;
      border: 2px solid #e9ecef;
      border-radius: 24px;
      background: #fff;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      color: #444;
      transition: all 0.2s ease;
      overflow: hidden;
      min-width: 2.5rem;
      justify-content: center;
    }

    .option-chip:hover:not(.chip-unavailable) {
      border-color: #667eea;
      color: #667eea;
      background: #f0f4ff;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(102, 126, 234, 0.2);
    }

    .option-chip.chip-selected {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
      transform: translateY(-1px);
    }

    .option-chip.chip-unavailable {
      opacity: 0.45;
      cursor: not-allowed;
      background: #f8f9fa;
      color: #999;
    }

    .option-chip.chip-unavailable:hover {
      transform: none;
      box-shadow: none;
      border-color: #e9ecef;
    }

    /* Farb-Dot */
    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
    }

    .chip-selected .color-dot {
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6);
    }

    /* Hat Farbe → etwas kompakter */
    .option-chip.chip-has-color {
      padding: 0.35rem 0.75rem;
    }

    /* Chip-Text */
    .chip-text {
      line-height: 1;
      white-space: nowrap;
    }

    /* Preis-Badge im Chip (für Fallback-Ansicht) */
    .chip-price {
      font-size: 0.75rem;
      font-weight: 700;
      opacity: 0.85;
      margin-left: 0.2rem;
    }

    /* Durchstrich-Linie für ausverkauft */
    .chip-cross-line {
      position: absolute;
      top: 50%;
      left: 6%;
      width: 88%;
      height: 1.5px;
      background: rgba(180, 0, 0, 0.45);
      transform: rotate(-18deg);
      pointer-events: none;
      border-radius: 2px;
    }

    /* Alte Stile entfernt: variant-options, variant-btn, variant-name, variant-price, variant-stock */

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
      line-height: 1;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
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
export class ProductQuickViewComponent implements OnInit, OnChanges {
  @Input() product: Product | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() addToCartEvent = new EventEmitter<{ product: Product; quantity: number; variant?: ProductVariant }>();
  @Output() viewDetailsEvent = new EventEmitter<Product>();

  selectedVariant: ProductVariant | null = null;
  quantity = 1;
  isAddingToCart = false;
  isLoadingVariant = false;
  loadingVariantId: number | null = null;

  /** ✅ FIX: Stabile Properties statt Methoden-Aufrufe im Template.
   *  getProductImages() im Template erzeugt bei jedem Change-Detection-Zyklus
   *  eine neue Array-Referenz → ngOnChanges der Gallery feuert konstant → Index-Reset.
   *  Diese Properties werden nur bei echten Änderungen (Produkt/Variante) aktualisiert. */
  galleryImages: string[] = [];
  galleryPrimaryImageUrl: string | undefined = undefined;

  ngOnInit(): void {
    this.initializeProduct();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reagiere auf Produktwechsel
    if (changes['product'] && !changes['product'].firstChange) {
      console.log('🔄 Product changed in Quick View:', this.product?.title);
      this.initializeProduct();
    }

    // Reagiere auf Modal öffnen/schließen
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  /**
   * Initialisiert das Produkt und wählt erste Variante
   */
  private initializeProduct(): void {
    // Reset Zustand
    this.selectedVariant = null;
    this.quantity = 1;
    this.isLoadingVariant = false;
    this.loadingVariantId = null;

    // Wähle erste Variante wenn vorhanden
    if (this.hasVariants() && this.product?.variants && this.product.variants.length > 0) {
      this.selectedVariant = this.product.variants[0];
      console.log('✅ Selected first variant:', this.selectedVariant);
    }

    // ✅ FIX: Gallery-Images jetzt einmalig berechnen und cachen
    this.updateGalleryImages();
  }

  getProductImages(): string[] {
    const images: string[] = [];
    const addedUrls = new Set<string>();

    // Varianten-Bild zuerst (als primäres Bild), dann alle Produktbilder
    const variantImageUrl: string | null =
      (this.selectedVariant?.images && this.selectedVariant.images.length > 0)
        ? this.selectedVariant.images[0]
        : (this.selectedVariant?.imageUrl || null);

    if (variantImageUrl) {
      images.push(variantImageUrl);
      addedUrls.add(variantImageUrl);
    }

    // Immer alle Produktbilder hinzufügen (für Blättern), Duplikate vermeiden
    if (this.product?.media && this.product.media.length > 0) {
      this.product.media.forEach((media: any) => {
        if (media.url && !addedUrls.has(media.url)) {
          images.push(media.url);
          addedUrls.add(media.url);
        }
      });
    }

    // Fallback: nur primaryImageUrl
    if (images.length === 0 && this.product?.primaryImageUrl) {
      images.push(this.product.primaryImageUrl);
    }

    return [...images];
  }

  getPrimaryImageUrl(): string | undefined {
    // Wenn Variante ausgewählt, verwende Varianten-Bild als Primary
    if (this.selectedVariant) {
      if (this.selectedVariant.imageUrl) {
        return this.selectedVariant.imageUrl;
      }
      if (this.selectedVariant.images && this.selectedVariant.images.length > 0) {
        return this.selectedVariant.images[0];
      }
    }
    // Fallback: Primary-Bild des ersten Media-Eintrags oder primaryImageUrl
    const primaryMedia = this.product?.media?.find((m: any) => m.isPrimary);
    return primaryMedia?.url || this.product?.primaryImageUrl;
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

  // ============================================================
  // OPTION-GRUPPEN & CHIP-AUSWAHL
  // ============================================================

  /** Extrahiert eindeutige Option-Gruppen aus allen Varianten. */
  getOptionGroups(): Array<{ key: 'option1' | 'option2' | 'option3'; label: string; values: string[] }> {
    if (!this.product?.variants || this.product.variants.length === 0) return [];
    const groups: Array<{ key: 'option1' | 'option2' | 'option3'; label: string; values: string[] }> = [];

    (['option1', 'option2', 'option3'] as const).forEach(key => {
      const values = [
        ...new Set(
          this.product!.variants!
            .map(v => v[key])
            .filter((v): v is string => !!v && v.trim() !== '')
        )
      ];
      if (values.length > 0) {
        groups.push({ key, label: this.detectOptionLabel(values), values });
      }
    });
    return groups;
  }

  /** Erkennt Label-Namen anhand der Werte (Farbe, Größe…). */
  private detectOptionLabel(values: string[]): string {
    const lower = values.map(v => v.toLowerCase());
    const colorHints = ['rot','blau','grün','gruen','schwarz','weiss','weiß','grau','gelb','orange','pink','lila','braun','beige','gold','silber','red','blue','green','black','white','gray','grey','yellow','violet','navy','bordeaux','türkis','cyan','magenta','purple'];
    const sizeHints  = ['xs','s','m','l','xl','xxl','xxxl','2xl','3xl','small','medium','large','klein','mittel','gross','groß','one size'];
    if (lower.some(v => colorHints.includes(v))) return 'Farbe';
    if (lower.some(v => sizeHints.includes(v)))  return 'Größe';
    // Numerische Größen (Schuhe 36–50)
    if (lower.every(v => /^\d{2}(\.\d)?$/.test(v))) return 'Größe';
    return 'Option';
  }

  /** Gibt den aktuell gewählten Wert für eine Option zurück. */
  getSelectedValueForOption(key: 'option1' | 'option2' | 'option3'): string | null {
    return this.selectedVariant ? (this.selectedVariant[key] || null) : null;
  }

  /** Prüft ob eine Option-Kombination noch verfügbar ist. */
  isOptionCombinationAvailable(key: 'option1' | 'option2' | 'option3', value: string): boolean {
    if (!this.product?.variants) return false;
    const otherSelections: Partial<Record<'option1' | 'option2' | 'option3', string>> = {};
    (['option1', 'option2', 'option3'] as const).forEach(k => {
      if (k !== key) {
        const sel = this.getSelectedValueForOption(k);
        if (sel) otherSelections[k] = sel;
      }
    });

    return this.product.variants.some(v => {
      if (v[key] !== value) return false;
      for (const [k, sel] of Object.entries(otherSelections)) {
        if (v[k as 'option1' | 'option2' | 'option3'] !== sel) return false;
      }
      // Verfügbar wenn kein Stock-Tracking oder Stock > 0
      return v.stockQuantity === null || v.stockQuantity === undefined || v.stockQuantity > 0;
    });
  }

  /** Wählt einen Wert für eine Option-Dimension und findet passende Variante. */
  selectOptionValue(key: 'option1' | 'option2' | 'option3', value: string): void {
    if (!this.product?.variants) return;

    const desired: Partial<Record<'option1' | 'option2' | 'option3', string>> = {
      option1: key === 'option1' ? value : (this.selectedVariant?.option1 || undefined),
      option2: key === 'option2' ? value : (this.selectedVariant?.option2 || undefined),
      option3: key === 'option3' ? value : (this.selectedVariant?.option3 || undefined),
    };

    // Exakte Übereinstimmung suchen
    let found = this.product.variants.find(v =>
      (!desired.option1 || v.option1 === desired.option1) &&
      (!desired.option2 || v.option2 === desired.option2) &&
      (!desired.option3 || v.option3 === desired.option3)
    );
    // Fallback: irgendeine Variante mit dem neuen Wert
    if (!found) {
      found = this.product.variants.find(v => v[key] === value);
    }
    if (found && found.id !== this.selectedVariant?.id) {
      this.selectVariant(found);
    }
  }

  /** Gibt Hex-Farbe für einen Farbwert zurück (für Farbfelder). */
  getColorHex(value: string): string | null {
    const map: Record<string, string> = {
      rot:'#e53935', red:'#e53935',
      blau:'#1e88e5', blue:'#1e88e5',
      grün:'#43a047', gruen:'#43a047', green:'#43a047',
      schwarz:'#212121', black:'#212121',
      weiß:'#fafafa', weiss:'#fafafa', white:'#fafafa',
      grau:'#9e9e9e', gray:'#9e9e9e', grey:'#9e9e9e',
      gelb:'#fdd835', yellow:'#fdd835',
      orange:'#fb8c00',
      pink:'#e91e63',
      lila:'#8e24aa', purple:'#8e24aa', violet:'#8e24aa',
      braun:'#6d4c41', brown:'#6d4c41',
      beige:'#f5f0e1',
      gold:'#ffc107',
      silber:'#b0bec5', silver:'#b0bec5',
      türkis:'#00acc1', turquoise:'#00acc1', cyan:'#00acc1',
      navy:'#1a237e',
      bordeaux:'#880e4f', magenta:'#d81b60',
    };
    return map[value.toLowerCase()] ?? null;
  }

  /** Gibt Stock-Badge-Text zurück oder null wenn kein Badge nötig. */
  getStockBadge(variant: ProductVariant | null): string | null {
    if (!variant || variant.stockQuantity === null || variant.stockQuantity === undefined) return null;
    if (variant.stockQuantity <= 0) return 'Ausverkauft';
    if (variant.stockQuantity <= 3) return `Nur noch ${variant.stockQuantity}!`;
    if (variant.stockQuantity <= 10) return 'Wenige übrig';
    return null;
  }

  /** CSS-Klasse für den Stock-Badge. */
  getStockBadgeClass(variant: ProductVariant | null): string {
    if (!variant || !variant.stockQuantity || variant.stockQuantity <= 0) return 'badge-out';
    if (variant.stockQuantity <= 3) return 'badge-low';
    return 'badge-limited';
  }

  selectVariant(variant: ProductVariant): void {
    if (this.selectedVariant?.id === variant.id) {
      return; // Bereits ausgewählt, nichts zu tun
    }

    console.log('🔄 Selecting variant:', variant);
    
    // Zeige kurze Lade-Animation beim Wechsel
    this.isLoadingVariant = true;
    this.loadingVariantId = variant.id;
    
    // Setze neue Variante nach kurzer Verzögerung für visuelle Rückmeldung
    setTimeout(() => {
      this.selectedVariant = variant;
      this.isLoadingVariant = false;
      this.loadingVariantId = null;
      // ✅ FIX: Gallery-Images nach Varianten-Wechsel aktualisieren
      this.updateGalleryImages();
      console.log('✅ Variant selected:', variant);
    }, 200);
  }

  /** Berechnet und cached Gallery-Images + Primary-URL.
   *  Wird nur bei Produkt-Wechsel oder Varianten-Auswahl aufgerufen – niemals aus dem Template. */
  private updateGalleryImages(): void {
    this.galleryImages = this.getProductImages();
    this.galleryPrimaryImageUrl = this.getPrimaryImageUrl();
  }

  getCurrentPrice(): number {
    if (this.selectedVariant) {
      return this.selectedVariant.price;
    }
    return this.product?.basePrice || 0;
  }

  getCurrentSku(): string | undefined {
    // Priorität: Varianten-SKU > Produkt-SKU
    if (this.selectedVariant?.sku) {
      return this.selectedVariant.sku;
    }
    return this.product?.sku;
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
   * Prüft ob der "In den Warenkorb" Button deaktiviert sein soll
   */
  isAddToCartDisabled(): boolean {
    // Varianten vorhanden aber keine ausgewählt → deaktiviert (muss Variante wählen)
    if (this.hasVariants() && !this.selectedVariant) {
      return true;
    }
    // Explizit auf 0 gesetzter Stock → deaktiviert
    if (this.hasVariants() && this.selectedVariant &&
        this.selectedVariant.stockQuantity !== null &&
        this.selectedVariant.stockQuantity !== undefined &&
        this.selectedVariant.stockQuantity <= 0) {
      return true;
    }
    if (!this.hasVariants() &&
        this.product?.stock !== null &&
        this.product?.stock !== undefined &&
        this.product.stock <= 0) {
      return true;
    }
    return false;
  }

  /**
   * Prüft ob die ausgewählte Variante verfügbar ist (Lagerbestand > 0)
   * Wenn kein Stock-Tracking konfiguriert (null/undefined) → verfügbar
   */
  isVariantAvailable(): boolean {
    // Wenn Varianten existieren, muss eine ausgewählt sein
    if (this.hasVariants()) {
      if (!this.selectedVariant) {
        // Kein Variant ausgewählt → Button zeigt "Variante wählen" statt "Nicht verfügbar"
        return true;
      }
      // Wenn stockQuantity nicht gesetzt (null/undefined) → verfügbar
      if (this.selectedVariant.stockQuantity === null || this.selectedVariant.stockQuantity === undefined) {
        return true;
      }
      return this.selectedVariant.stockQuantity > 0;
    }
    // Wenn keine Varianten: stock null/undefined → verfügbar (kein Tracking konfiguriert)
    if (this.product?.stock === null || this.product?.stock === undefined) {
      return true;
    }
    return this.product.stock > 0;
  }

  /**
   * Gibt das passende Label für den Add-to-Cart Button zurück
   */
  getAddToCartLabel(): string {
    if (this.isAddingToCart) {
      return 'Wird hinzugefügt...';
    }
    // Varianten vorhanden aber keine ausgewählt
    if (this.hasVariants() && !this.selectedVariant) {
      return 'Variante wählen';
    }
    // Variante ausgewählt aber nicht auf Lager
    if (this.hasVariants() && this.selectedVariant &&
        this.selectedVariant.stockQuantity !== null &&
        this.selectedVariant.stockQuantity !== undefined &&
        this.selectedVariant.stockQuantity <= 0) {
      return 'Nicht verfügbar';
    }
    // Kein Variant-Produkt aber stock explizit auf 0 gesetzt
    if (!this.hasVariants() &&
        this.product?.stock !== null &&
        this.product?.stock !== undefined &&
        this.product.stock <= 0) {
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
    this.isLoadingVariant = false;
    this.loadingVariantId = null;
    document.body.style.overflow = '';
    this.close.emit();
  }
}
