import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
    <div class="vp-wrapper" *ngIf="variants && variants.length > 0">

      <!-- ── Option-Gruppen ── -->
      <div *ngFor="let option of availableOptions" class="vp-group">
        <div class="vp-group__header">
          <span class="vp-group__label">{{ option.name }}</span>
          <span class="vp-group__selected" *ngIf="selectedOptions[option.name]">
            : <strong>{{ selectedOptions[option.name] }}</strong>
          </span>
        </div>

        <div class="vp-values">
          <button
            *ngFor="let value of option.values"
            type="button"
            class="vp-btn"
            [class.vp-btn--color]="isColorOption(option.name)"
            [class.vp-btn--size]="isSizeOption(option.name)"
            [class.vp-btn--selected]="isSelected(option.name, value)"
            [class.vp-btn--disabled]="!isAvailable(option.name, value)"
            [disabled]="!isAvailable(option.name, value)"
            [style.--swatch-color]="isColorOption(option.name) ? getColorValue(value) : null"
            (click)="selectOption(option.name, value)"
            [title]="!isAvailable(option.name, value) ? (value + ' – Ausverkauft') : value"
            [attr.aria-pressed]="isSelected(option.name, value)"
            [attr.aria-label]="option.name + ': ' + value"
          >
            <!-- Farb-Swatch -->
            <span *ngIf="isColorOption(option.name)" class="vp-swatch"
                  [style.background]="getColorValue(value)">
              <span class="vp-swatch__check" *ngIf="isSelected(option.name, value)">✓</span>
              <span class="vp-swatch__cross" *ngIf="!isAvailable(option.name, value)">✕</span>
            </span>
            <!-- Farb-Label -->
            <span *ngIf="isColorOption(option.name)" class="vp-swatch__name">{{ value }}</span>

            <!-- Text-Button (Größe / Sonstiges) -->
            <span *ngIf="!isColorOption(option.name)" class="vp-btn__text">{{ value }}</span>
            <span *ngIf="!isColorOption(option.name) && !isAvailable(option.name, value)"
                  class="vp-btn__sold">ausverkauft</span>
          </button>
        </div>
      </div>

      <!-- ── Ausgewählte Varianten-Info-Karte ── -->
      <div class="vp-info" *ngIf="selectedVariant" [@fadeIn]>

        <!-- Bild + Preis-Bereich -->
        <div class="vp-info__top">
          <div class="vp-info__img-wrap" *ngIf="getVariantThumb()">
            <img [src]="getVariantThumb()!" [alt]="selectedVariant.sku" class="vp-info__img">
          </div>

          <div class="vp-info__prices">
            <div class="vp-info__price-main">
              {{ selectedVariant.price | number:'1.2-2' }} €
            </div>
            <div class="vp-info__price-compare"
                 *ngIf="selectedVariant.comparePrice && selectedVariant.comparePrice > selectedVariant.price">
              <s>{{ selectedVariant.comparePrice | number:'1.2-2' }} €</s>
              <span class="vp-info__discount">
                -{{ getDiscountPct() }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Attribute-Chips -->
        <div class="vp-info__attrs" *ngIf="selectedVariant.attributes">
          <span class="vp-attr-chip"
                *ngFor="let attr of getAttrEntries(selectedVariant.attributes)">
            <span class="vp-attr-chip__key">{{ attr.key }}</span>
            <span class="vp-attr-chip__val">{{ attr.val }}</span>
          </span>
        </div>

        <!-- Lager-Ampel -->
        <div class="vp-stock"
             [class.vp-stock--high]="selectedVariant.stockQuantity > 10"
             [class.vp-stock--low]="selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity <= 10"
             [class.vp-stock--out]="selectedVariant.stockQuantity === 0">
          <span class="vp-stock__dot"></span>
          <span *ngIf="selectedVariant.stockQuantity > 10">✓ Auf Lager</span>
          <span *ngIf="selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity <= 10">
            ⚡ Nur noch {{ selectedVariant.stockQuantity }} verfügbar
          </span>
          <span *ngIf="selectedVariant.stockQuantity === 0">✕ Ausverkauft</span>
          <span class="vp-stock__sku">SKU: {{ selectedVariant.sku }}</span>
        </div>
      </div>

      <!-- ── Hinweis wenn noch nichts ausgewählt ── -->
      <div class="vp-hint" *ngIf="!selectedVariant && availableOptions.length > 0">
        <span class="vp-hint__icon">👆</span>
        <span>Bitte wähle eine Option aus</span>
      </div>

    </div>
  `,
  styles: [`
    /* ──────────────────────────────────────────
       WRAPPER
    ────────────────────────────────────────── */
    .vp-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem 0;
      border-top: 1px solid #e5e7eb;
    }

    /* ──────────────────────────────────────────
       OPTION-GRUPPE
    ────────────────────────────────────────── */
    .vp-group__header {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .vp-group__label {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
    }

    .vp-group__selected strong {
      color: #111827;
      font-size: 0.875rem;
    }

    .vp-values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    /* ──────────────────────────────────────────
       OPTION-BUTTON (Text-Variante)
    ────────────────────────────────────────── */
    .vp-btn {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      padding: 0.5rem 1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      transition: border-color 0.18s, background 0.18s, transform 0.15s, box-shadow 0.18s;
      position: relative;
      outline: none;
    }

    .vp-btn:hover:not(:disabled) {
      border-color: #667eea;
      background: #f5f3ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102,126,234,0.15);
    }

    .vp-btn:focus-visible {
      box-shadow: 0 0 0 3px rgba(102,126,234,0.35);
      border-color: #667eea;
    }

    .vp-btn--selected {
      border-color: #667eea !important;
      background: linear-gradient(135deg, #667eea, #764ba2) !important;
      color: #fff !important;
      box-shadow: 0 4px 14px rgba(102,126,234,0.35);
      transform: translateY(-1px);
    }

    .vp-btn--selected:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(102,126,234,0.45);
    }

    .vp-btn--disabled {
      opacity: 0.42;
      cursor: not-allowed;
      background: #f9fafb !important;
      color: #9ca3af !important;
      border-color: #e5e7eb !important;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Durchstrich für ausverkaufte Text-Buttons */
    .vp-btn--disabled::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 4px,
        rgba(156,163,175,0.3) 4px,
        rgba(156,163,175,0.3) 5px
      );
      border-radius: 7px;
      pointer-events: none;
    }

    .vp-btn--size {
      min-width: 64px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .vp-btn__text { line-height: 1.2; }

    .vp-btn__sold {
      font-size: 0.6rem;
      font-weight: 500;
      color: #ef4444;
      text-transform: lowercase;
      letter-spacing: 0;
      margin-top: 1px;
    }

    /* ──────────────────────────────────────────
       FARB-SWATCH
    ────────────────────────────────────────── */
    .vp-btn--color {
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.4rem 0.5rem;
      border-radius: 10px;
      min-width: 56px;
    }

    .vp-swatch {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(0,0,0,0.12);
      background: var(--swatch-color, #ccc);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s;
      flex-shrink: 0;
    }

    .vp-btn--color:hover:not(:disabled) .vp-swatch {
      transform: scale(1.12);
      box-shadow: 0 0 0 3px rgba(102,126,234,0.3);
    }

    .vp-btn--selected .vp-swatch {
      box-shadow: 0 0 0 3px #667eea, 0 0 0 5px rgba(102,126,234,0.2);
    }

    .vp-swatch__check {
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }

    .vp-swatch__cross {
      color: #ef4444;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .vp-swatch__name {
      font-size: 0.7rem;
      color: #6b7280;
      text-align: center;
      white-space: nowrap;
      line-height: 1;
    }

    .vp-btn--color.vp-btn--selected .vp-swatch__name {
      color: #667eea;
      font-weight: 700;
    }

    /* ──────────────────────────────────────────
       INFO-KARTE
    ────────────────────────────────────────── */
    .vp-info {
      background: #fafafa;
      border: 1.5px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      animation: vpFadeIn 0.22s ease;
    }

    @keyframes vpFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .vp-info__top {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .vp-info__img-wrap {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid #e5e7eb;
      background: #f3f4f6;
    }

    .vp-info__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vp-info__prices {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .vp-info__price-main {
      font-size: 1.6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
    }

    .vp-info__price-compare {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #9ca3af;
    }

    .vp-info__discount {
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }

    /* ── Attribute-Chips ── */
    .vp-info__attrs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .vp-attr-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 0.2rem 0.65rem;
      font-size: 0.8rem;
    }

    .vp-attr-chip__key {
      color: #9ca3af;
      font-weight: 500;
    }

    .vp-attr-chip__val {
      color: #111827;
      font-weight: 700;
    }

    /* ── Lager-Ampel ── */
    .vp-stock {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.825rem;
      font-weight: 600;
      flex-wrap: wrap;
    }

    .vp-stock__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .vp-stock--high { color: #166534; }
    .vp-stock--high .vp-stock__dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }

    .vp-stock--low { color: #92400e; }
    .vp-stock--low .vp-stock__dot { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }

    .vp-stock--out { color: #991b1b; }
    .vp-stock--out .vp-stock__dot { background: #ef4444; }

    .vp-stock__sku {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 400;
      color: #9ca3af;
      font-family: ui-monospace, monospace;
    }

    /* ──────────────────────────────────────────
       HINT
    ────────────────────────────────────────── */
    .vp-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #fffbeb;
      border: 1px dashed #fbbf24;
      border-radius: 10px;
      font-size: 0.875rem;
      color: #92400e;
      animation: vpFadeIn 0.22s ease;
    }

    .vp-hint__icon { font-size: 1.1rem; }
  `]
})
export class ProductVariantPickerComponent implements OnInit, OnChanges {
  @Input() variants: ProductVariant[] = [];
  @Input() defaultVariantId?: number;
  @Output() variantSelected = new EventEmitter<ProductVariant | null>();

  selectedOptions: { [key: string]: string } = {};
  selectedVariant: ProductVariant | null = null;
  availableOptions: ProductOption[] = [];

  private colorKeywords = ['farbe', 'color', 'colour', 'couleur'];
  private sizeKeywords = ['größe', 'size', 'groesse', 'taille'];

  ngOnInit() {
    this.extractOptions();
    this.preselectDefaultVariant();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Wenn Varianten nachträglich geladen werden (async), neu initialisieren
    if (changes['variants'] && !changes['variants'].firstChange) {
      this.extractOptions();
      this.preselectDefaultVariant();
    }
    // Wenn defaultVariantId sich ändert (nach loadProductVariants())
    if (changes['defaultVariantId'] && this.variants?.length) {
      this.preselectDefaultVariant();
    }
  }

  extractOptions() {
    if (!this.variants || this.variants.length === 0) return;

    const optionsMap = new Map<string, Set<string>>();

    this.variants.forEach(variant => {
      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!optionsMap.has(key)) optionsMap.set(key, new Set());
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
    if (!this.defaultVariantId || !this.variants?.length) return;
    const variant = this.variants.find(v => v.id === this.defaultVariantId);
    if (variant?.attributes) {
      this.selectedOptions = { ...variant.attributes };
      this.selectedVariant = variant;
      this.variantSelected.emit(variant);
    }
  }

  selectOption(optionName: string, value: string) {
    if (!this.isAvailable(optionName, value)) return;
    this.selectedOptions = { ...this.selectedOptions, [optionName]: value };
    this.updateSelectedVariant();
  }

  updateSelectedVariant() {
    const selectedKeys = Object.keys(this.selectedOptions);
    const variant = this.variants.find(v => {
      if (!v.attributes) return false;
      return selectedKeys.every(key => v.attributes![key] === this.selectedOptions[key]);
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
      return Object.entries(tempSelection).every(([key, val]) =>
        v.attributes![key] === val || this.selectedOptions[key] === undefined
      ) && v.stockQuantity > 0;
    });
  }

  isColorOption(name: string): boolean {
    return this.colorKeywords.some(k => name.toLowerCase().includes(k));
  }

  isSizeOption(name: string): boolean {
    return this.sizeKeywords.some(k => name.toLowerCase().includes(k));
  }

  getColorValue(colorName: string): string {
    const colorMap: Record<string, string> = {
      'rot': '#ef4444', 'red': '#ef4444',
      'blau': '#3b82f6', 'blue': '#3b82f6',
      'grün': '#22c55e', 'green': '#22c55e',
      'gelb': '#eab308', 'yellow': '#eab308',
      'schwarz': '#111827', 'black': '#111827',
      'weiß': '#f9fafb', 'white': '#f9fafb',
      'grau': '#6b7280', 'gray': '#6b7280', 'grey': '#6b7280',
      'rosa': '#ec4899', 'pink': '#ec4899',
      'orange': '#f97316',
      'lila': '#8b5cf6', 'purple': '#8b5cf6', 'violet': '#8b5cf6',
      'braun': '#92400e', 'brown': '#92400e',
      'beige': '#d4b483',
      'gold': '#d97706', 'silber': '#94a3b8', 'silver': '#94a3b8'
    };
    const n = colorName.toLowerCase().trim();
    if (n.startsWith('#') || n.startsWith('rgb')) return n;
    return colorMap[n] || '#9ca3af';
  }

  /** Thumbnail der ausgewählten Variante (erstes Bild aus images[] oder imageUrl) */
  getVariantThumb(): string | null {
    if (!this.selectedVariant) return null;
    const imgs = this.selectedVariant.images as unknown as string[];
    if (imgs && imgs.length > 0) return imgs[0];
    return this.selectedVariant.imageUrl || null;
  }

  getDiscountPct(): number {
    if (!this.selectedVariant?.comparePrice || !this.selectedVariant.price) return 0;
    const compare = Number(this.selectedVariant.comparePrice);
    const price = Number(this.selectedVariant.price);
    return Math.round((1 - price / compare) * 100);
  }

  getAttrEntries(attrs: Record<string, string>): { key: string; val: string }[] {
    return Object.entries(attrs).map(([key, val]) => ({ key, val }));
  }
}
