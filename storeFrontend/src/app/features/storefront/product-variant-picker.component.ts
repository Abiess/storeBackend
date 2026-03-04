import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ProductVariant } from '@app/core/models';

interface ProductOption {
  name: string;
  values: string[];
}

@Component({
  selector: 'app-product-variant-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="variant-picker" *ngIf="variants && variants.length > 0">
      <!-- Options Selection -->
      <div *ngFor="let option of availableOptions" class="option-group">
        <label class="option-label">{{ option.name }}</label>
        
        <div class="option-values">
          <button
            *ngFor="let value of option.values"
            type="button"
            class="option-btn"
            [class.color-swatch]="isColorOption(option.name)"
            [class.size-btn]="isSizeOption(option.name)"
            [class.selected]="isSelected(option.name, value)"
            [class.disabled]="!isAvailable(option.name, value)"
            [disabled]="!isAvailable(option.name, value)"
            [attr.aria-disabled]="!isAvailable(option.name, value)"
            [attr.aria-label]="option.name + ': ' + value + (isSelected(option.name, value) ? ' (ausgewählt)' : '') + (!isAvailable(option.name, value) ? ' (nicht verfügbar)' : '')"
            [style.background-color]="isColorOption(option.name) ? getColorValue(value) : null"
            (click)="selectOption(option.name, value)"
            [title]="!isAvailable(option.name, value) ? value + ' - Ausverkauft' : value"
          >
            <span *ngIf="!isColorOption(option.name)">{{ value }}</span>
            <span *ngIf="isColorOption(option.name)" class="color-name">{{ value }}</span>
            <!-- ✅ STEP 4: Ausverkauft-Badge für disabled Optionen -->
            <span *ngIf="!isAvailable(option.name, value) && !isColorOption(option.name)" class="sold-out-badge">✗</span>
          </button>
        </div>
      </div>

      <!-- Selected Variant Info -->
      <div class="selected-info" *ngIf="selectedVariant">
        <div class="price-section">
          <span class="price-label">{{ 'product.price' | translate }}:</span>
          <span class="price-value">{{ selectedVariant.price | number:'1.2-2' }} €</span>
        </div>
        
        <div class="stock-section">
          <span 
            class="stock-badge" 
            [class.in-stock]="selectedVariant.stockQuantity > 0"
            [class.low-stock]="selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity <= 5"
            [class.out-of-stock]="selectedVariant.stockQuantity === 0"
          >
            <span *ngIf="selectedVariant.stockQuantity > 0">
              ✓ {{ 'product.variants.inStock' | translate }} ({{ selectedVariant.stockQuantity }})
            </span>
            <span *ngIf="selectedVariant.stockQuantity === 0">
              ✗ {{ 'product.variants.outOfStock' | translate }}
            </span>
          </span>
        </div>
        
        <div class="sku-info">
          <small>SKU: {{ selectedVariant.sku }}</small>
        </div>
      </div>

      <!-- No Selection Message -->
      <div class="no-selection" *ngIf="!selectedVariant">
        <p>{{ 'product.variants.selectOptions' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .variant-picker {
      padding: 1.5rem 0;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }

    .option-group {
      margin-bottom: 1.5rem;
    }

    .option-label {
      display: block;
      font-weight: 600;
      font-size: 1rem;
      color: #333;
      margin-bottom: 0.75rem;
    }

    .option-values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .option-btn {
      border: 2px solid #dee2e6;
      background: white;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9375rem;
      font-weight: 600;
      transition: all 0.3s;
      color: #333;
      min-width: 60px;
      text-align: center;
      position: relative;
      /* ✅ STEP 4: Focus styles für Accessibility */
      outline: none;
    }

    /* ✅ STEP 4: Focus-visible für Keyboard-Navigation */
    .option-btn:focus-visible {
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    .option-btn:hover:not(:disabled) {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
    }

    /* ✅ STEP 4: Verbesserter Selected State */
    .option-btn.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      transform: translateY(-1px);
    }

    .option-btn.selected:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    /* ✅ STEP 4: Verbesserter Disabled State */
    .option-btn:disabled,
    .option-btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f8f9fa;
      color: #999;
      border-color: #e0e0e0;
      position: relative;
    }

    .option-btn:disabled:hover,
    .option-btn.disabled:hover {
      transform: none;
      box-shadow: none;
      border-color: #e0e0e0;
    }

    /* ✅ STEP 4: Durchgestrichener Effekt für disabled */
    .option-btn:disabled::after,
    .option-btn.disabled::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 10%;
      right: 10%;
      height: 2px;
      background: #dc3545;
      transform: translateY(-50%) rotate(-15deg);
      opacity: 0.7;
    }

    /* ✅ STEP 4: Ausverkauft Badge */
    .sold-out-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: #dc3545;
      color: white;
      font-size: 0.65rem;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      border: 2px solid white;
    }

    .size-btn {
      min-width: 65px;
      text-transform: uppercase;
    }

    .color-swatch {
      width: 55px;
      height: 55px;
      padding: 0;
      border-radius: 50%;
      position: relative;
    }

    .color-swatch .color-name {
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
      white-space: nowrap;
      color: #666;
      background: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .selected-info {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.25rem;
      margin-top: 1.5rem;
    }

    .price-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .stock-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .stock-badge.in-stock {
      background: #d4edda;
      color: #155724;
    }

    .stock-badge.out-of-stock {
      background: #f8d7da;
      color: #721c24;
    }

    .no-selection {
      text-align: center;
      padding: 2rem;
      color: #999;
    }
  `]
})
export class ProductVariantPickerComponent implements OnInit {
  @Input() variants: ProductVariant[] = [];
  @Input() defaultVariantId?: number;
  @Output() variantSelected = new EventEmitter<ProductVariant | null>();

  selectedOptions: { [key: string]: string } = {};
  selectedVariant: ProductVariant | null = null;
  availableOptions: ProductOption[] = [];

  private colorKeywords = ['farbe', 'color', 'colour'];
  private sizeKeywords = ['größe', 'size', 'groesse'];

  ngOnInit() {
    this.extractOptions();
    this.preselectDefaultVariant();
  }

  extractOptions() {
    if (!this.variants || this.variants.length === 0) return;

    const optionsMap = new Map<string, Set<string>>();

    this.variants.forEach(variant => {
      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!optionsMap.has(key)) {
            optionsMap.set(key, new Set());
          }
          optionsMap.get(key)!.add(value);
        });
      }
    });

    this.availableOptions = Array.from(optionsMap.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet)
    }));
  }

  preselectDefaultVariant() {
    if (this.defaultVariantId) {
      const variant = this.variants.find(v => v.id === this.defaultVariantId);
      if (variant && variant.attributes) {
        this.selectedOptions = { ...variant.attributes };
        this.selectedVariant = variant;
        this.variantSelected.emit(variant);
      }
    }
  }

  selectOption(optionName: string, value: string) {
    // ✅ STEP 4: Guard - nicht klickbar wenn nicht verfügbar
    if (!this.isAvailable(optionName, value)) {
      console.log('⚠️ Option not available:', optionName, value);
      return;
    }

    this.selectedOptions[optionName] = value;
    this.updateSelectedVariant();
  }

  updateSelectedVariant() {
    const variant = this.variants.find(v => {
      if (!v.attributes) return false;

      return Object.entries(this.selectedOptions).every(([key, value]) => {
        return v.attributes![key] === value;
      });
    });

    this.selectedVariant = variant || null;
    this.variantSelected.emit(this.selectedVariant);
  }

  isSelected(optionName: string, value: string): boolean {
    return this.selectedOptions[optionName] === value;
  }

  isAvailable(optionName: string, value: string): boolean {
    const tempSelection = { ...this.selectedOptions, [optionName]: value };

    return this.variants.some(v => {
      if (!v.attributes) return false;

      return Object.entries(tempSelection).every(([key, val]) => {
        return v.attributes![key] === val || this.selectedOptions[key] === undefined;
      }) && v.stockQuantity > 0;
    });
  }

  isColorOption(optionName: string): boolean {
    const normalized = optionName.toLowerCase();
    return this.colorKeywords.some(keyword => normalized.includes(keyword));
  }

  isSizeOption(optionName: string): boolean {
    const normalized = optionName.toLowerCase();
    return this.sizeKeywords.some(keyword => normalized.includes(keyword));
  }

  getColorValue(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      'rot': '#dc3545', 'red': '#dc3545',
      'blau': '#007bff', 'blue': '#007bff',
      'grün': '#28a745', 'green': '#28a745',
      'gelb': '#ffc107', 'yellow': '#ffc107',
      'schwarz': '#212529', 'black': '#212529',
      'weiß': '#f8f9fa', 'white': '#f8f9fa',
      'grau': '#6c757d', 'gray': '#6c757d',
      'rosa': '#e83e8c', 'pink': '#e83e8c',
      'orange': '#fd7e14',
      'lila': '#6f42c1', 'purple': '#6f42c1',
      'braun': '#8b4513', 'brown': '#8b4513'
    };

    const normalized = colorName.toLowerCase().trim();
    if (normalized.startsWith('#')) return normalized;
    return colorMap[normalized] || '#ccc';
  }
}

