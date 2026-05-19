import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 2: Fashion Editorial Grid
 * - Horizontal scrollable category chip-filter at top
 * - 2-column editorial grid (large 3:4 images)
 * - Minimal text overlay at bottom of card
 * - High-end magazine aesthetic
 */
@Component({
  selector: 'app-product-grid-fashion',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="fashion-wrapper">

      <!-- ── CHIP FILTER BAR ── -->
      <div class="chip-filter-bar">
        <div class="chip-scroll">
          <button class="chip" [class.chip--active]="!selectedCategory"
                  (click)="onFilter(null)">
            {{ 'storefront.allProducts' | translate }}
          </button>
          <button class="chip" *ngFor="let cat of categories"
                  [class.chip--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat)">
            {{ cat.name }}
            <span class="chip-count">{{ countFor(cat) }}</span>
          </button>
        </div>

        <!-- Sort inline -->
        <select class="fashion-sort" (change)="onSort($event)">
          <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
          <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
          <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
          <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
        </select>
      </div>

      <!-- ── RESULT COUNT ── -->
      <div class="fashion-meta">
        <span>{{ filteredProducts.length }} Artikel</span>
        <span *ngIf="selectedCategory" class="meta-category">· {{ selectedCategory.name }}</span>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="fashion-empty" *ngIf="filteredProducts.length === 0">
        <p>Keine Produkte</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- ── EDITORIAL GRID ── -->
      <div class="editorial-grid" *ngIf="filteredProducts.length > 0">

        <!-- Featured (large) -->
        <div class="editorial-card editorial-card--large"
             *ngIf="filteredProducts[0] as hero">
          <ng-container *ngTemplateOutlet="fashionCard; context: { $implicit: hero, size: 'large' }">
          </ng-container>
        </div>

        <!-- Small cards: 2, 3, 4, 5 -->
        <div class="editorial-card editorial-card--small"
             *ngFor="let p of filteredProducts.slice(1, 5)">
          <ng-container *ngTemplateOutlet="fashionCard; context: { $implicit: p, size: 'small' }">
          </ng-container>
        </div>

        <!-- Rest: normal 3-col-->
        <div class="editorial-card editorial-card--regular"
             *ngFor="let p of filteredProducts.slice(5)">
          <ng-container *ngTemplateOutlet="fashionCard; context: { $implicit: p, size: 'regular' }">
          </ng-container>
        </div>
      </div>
    </div>

    <!-- ── FASHION CARD TEMPLATE ── -->
    <ng-template #fashionCard let-p let-size="size">
      <div class="fashion-card" [class]="'fashion-card--' + size" [routerLink]="['/products', p.id]">

        <!-- Image -->
        <div class="fashion-image">
          <img *ngIf="getFashionImage(p)" [src]="getFashionImage(p)" [alt]="p.title"
               loading="lazy" class="fashion-img" (error)="onImgErr($event)" />
          <div class="fashion-placeholder" *ngIf="!getFashionImage(p)">
            <span>✦</span>
          </div>

          <!-- Hover overlay -->
          <div class="fashion-overlay">
            <button class="overlay-btn overlay-btn--cart"
                    (click)="$event.stopPropagation(); $event.preventDefault(); addToCart.emit(p)">
              In den Warenkorb
            </button>
            <button class="overlay-btn overlay-btn--view"
                    (click)="$event.stopPropagation(); $event.preventDefault(); quickView.emit(p)">
              Quick View
            </button>
          </div>

          <!-- Sale badge -->
          <span class="fashion-badge" *ngIf="p.featured">Featured</span>
        </div>

        <!-- Info -->
        <div class="fashion-info">
          <p class="fashion-title">{{ p.title }}</p>
          <p class="fashion-price">{{ p.basePrice | number:'1.2-2' }} €</p>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    /* ── WRAPPER ── */
    .fashion-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* ── CHIP FILTER BAR ── */
    .chip-filter-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .chip-scroll {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      flex: 1;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .chip-scroll::-webkit-scrollbar { display: none; }
    .chip {
      flex-shrink: 0;
      padding: 0.45rem 1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 999px;
      background: #fff;
      cursor: pointer;
      font-size: 0.85rem;
      color: #374151;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }
    .chip:hover { border-color: #764ba2; color: #764ba2; }
    .chip--active {
      background: #1d1d1f;
      border-color: #1d1d1f;
      color: #fff;
    }
    .chip-count {
      font-size: 0.72rem;
      background: rgba(255,255,255,0.25);
      border-radius: 999px;
      padding: 0 5px;
    }
    .chip:not(.chip--active) .chip-count {
      background: rgba(0,0,0,0.08);
    }
    .fashion-sort {
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
      color: #374151;
      background: #fff;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* ── META ── */
    .fashion-meta {
      font-size: 0.825rem;
      color: #9ca3af;
      margin-bottom: 1.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .meta-category { margin-left: 0.25rem; }

    /* ── EMPTY ── */
    .fashion-empty {
      text-align: center;
      padding: 5rem 1rem;
      color: #9ca3af;
      font-size: 1.125rem;
    }
    .fashion-empty button {
      margin-top: 1rem;
      padding: 0.6rem 2rem;
      border: 2px solid #1d1d1f;
      border-radius: 999px;
      background: transparent;
      font-size: 0.875rem;
      cursor: pointer;
    }

    /* ── EDITORIAL GRID ── */
    .editorial-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: auto;
      gap: 1rem;
    }

    /* Large hero card spans 2 cols + 2 rows */
    .editorial-card--large {
      grid-column: span 2;
      grid-row: span 2;
    }
    .editorial-card--small {
      grid-column: span 1;
      grid-row: span 1;
    }
    /* After the 5-card hero block, regular cards 3-col */
    .editorial-card--regular {
      grid-column: span 1;
    }

    @media (max-width: 900px) {
      .editorial-grid { grid-template-columns: repeat(2, 1fr); }
      .editorial-card--large { grid-column: span 2; grid-row: span 1; }
    }
    @media (max-width: 480px) {
      .editorial-grid { grid-template-columns: 1fr; }
      .editorial-card--large { grid-column: span 1; }
    }

    /* ── FASHION CARD ── */
    .fashion-card {
      position: relative;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      overflow: hidden;
      border-radius: 4px;
    }

    /* Image container - different aspect ratios by size */
    .fashion-image {
      position: relative;
      overflow: hidden;
      background: #f5f5f5;
    }
    .fashion-card--large .fashion-image { aspect-ratio: 3 / 4; }
    .fashion-card--small .fashion-image { aspect-ratio: 3 / 4; }
    .fashion-card--regular .fashion-image { aspect-ratio: 4 / 5; }

    .fashion-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
      display: block;
    }
    .fashion-card:hover .fashion-img { transform: scale(1.06); }

    .fashion-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      color: #d1d5db;
      background: linear-gradient(135deg, #f9fafb, #f3f4f6);
    }

    /* Overlay on hover */
    .fashion-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      opacity: 0;
      transition: opacity 0.35s;
    }
    .fashion-card:hover .fashion-overlay { opacity: 1; }

    .overlay-btn {
      padding: 0.65rem 1.75rem;
      border-radius: 999px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.03em;
      transition: all 0.2s;
      border: none;
    }
    .overlay-btn--cart {
      background: #fff;
      color: #1d1d1f;
    }
    .overlay-btn--cart:hover { background: #f3f4f6; }
    .overlay-btn--view {
      background: transparent;
      border: 1.5px solid rgba(255,255,255,0.8);
      color: #fff;
    }
    .overlay-btn--view:hover { background: rgba(255,255,255,0.15); }

    .fashion-badge {
      position: absolute;
      top: 14px;
      left: 14px;
      background: #1d1d1f;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 2px;
    }

    /* Info below image */
    .fashion-info {
      padding: 0.875rem 0.25rem 0.5rem;
    }
    .fashion-title {
      margin: 0;
      font-size: 0.9rem;
      color: #1d1d1f;
      font-weight: 400;
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      letter-spacing: -0.01em;
    }
    .fashion-card--large .fashion-title {
      font-size: 1rem;
      -webkit-line-clamp: 2;
    }
    .fashion-price {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
      color: #374151;
      font-weight: 500;
    }
    .fashion-card--large .fashion-price { font-size: 1rem; }

    /* RTL support */
    :host-context([dir="rtl"]) .fashion-badge { left: auto; right: 14px; }
  `]
})
export class ProductGridFashionComponent {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() filteredProducts: Product[] = [];
  @Input() selectedCategory: Category | null = null;

  @Output() filterChange = new EventEmitter<Category | null>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() sortChange = new EventEmitter<string>();

  countFor(cat: Category): number {
    return this.products.filter(p => p.categoryId === cat.id).length;
  }

  onFilter(cat: Category | null): void { this.filterChange.emit(cat); }
  onSort(event: Event): void { this.sortChange.emit((event.target as HTMLSelectElement).value); }

  getFashionImage(p: Product): string | null {
    if (p.primaryImageUrl) return p.primaryImageUrl;
    if (p.media?.length) {
      const primary = p.media.find((m: any) => m.isPrimary);
      return (primary?.url ?? p.media[0]?.url) || null;
    }
    return p.imageUrl ?? null;
  }

  onImgErr(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}

