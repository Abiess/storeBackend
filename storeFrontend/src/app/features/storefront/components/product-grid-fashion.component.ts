import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, Category } from '@app/core/models';
import { ProductCardComponent } from '../product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 2: Fashion Editorial Grid
 * - Horizontal scrollable category chip-filter (always visible)
 * - Editorial 2-col grid using app-product-card with tall 3:4 images
 * - First product featured as large hero card (spans 2 rows)
 */
@Component({
  selector: 'app-product-grid-fashion',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslatePipe],
  template: `
    <div class="fashion-wrapper">

      <!-- â”€â”€ CHIP FILTER BAR (always visible) â”€â”€ -->
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
        <select class="fashion-sort" (change)="onSort($event)">
          <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
          <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
          <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
          <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
        </select>
      </div>

      <!-- â”€â”€ RESULT META â”€â”€ -->
      <div class="fashion-meta">
        <span>{{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'Artikel' : 'Artikel' }}</span>
        <span *ngIf="selectedCategory" class="meta-sep"> Â· {{ selectedCategory.name }}</span>
      </div>

      <!-- â”€â”€ EMPTY STATE â”€â”€ -->
      <div class="fashion-empty" *ngIf="filteredProducts.length === 0">
        <span>ðŸ”</span>
        <p>Keine Produkte gefunden</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- â”€â”€ EDITORIAL GRID (echte Produkte via app-product-card) â”€â”€ -->
      <div class="editorial-grid" *ngIf="filteredProducts.length > 0">

        <!-- Hero â€“ erstes Produkt groÃŸ (2-col, 2-row) -->
        <div class="editorial-cell editorial-cell--hero">
          <app-product-card
            [product]="filteredProducts[0]"
            [storeId]="storeId"
            (addToCart)="addToCart.emit(filteredProducts[0])"
            (quickView)="quickView.emit(filteredProducts[0])">
          </app-product-card>
        </div>

        <!-- Nebenkarten 2-5 (rechte Spalte, je 1-row) -->
        <div class="editorial-cell editorial-cell--side"
             *ngFor="let p of filteredProducts.slice(1, 3)">
          <app-product-card
            [product]="p"
            [storeId]="storeId"
            (addToCart)="addToCart.emit(p)"
            (quickView)="quickView.emit(p)">
          </app-product-card>
        </div>

        <!-- Rest: normales 3-col Grid (paginiert) -->
        <div class="editorial-cell editorial-cell--regular"
             *ngFor="let p of visibleRest">
          <app-product-card
            [product]="p"
            [storeId]="storeId"
            (addToCart)="addToCart.emit(p)"
            (quickView)="quickView.emit(p)">
          </app-product-card>
        </div>
      </div>

      <!-- Mehr laden -->
      <div class="load-more-wrap" *ngIf="hasMore">
        <button class="load-more-btn" (click)="loadMore()" type="button">
          {{ 'storefront.filter.loadMore' | translate }} â†“
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .fashion-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 3rem;
    }

    /* â”€â”€ CHIP FILTER BAR â”€â”€ */
    .chip-filter-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
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
      white-space: nowrap;
      letter-spacing: 0.01em;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .chip:hover { border-color: #764ba2; color: #764ba2; }
    .chip--active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
    .chip-count {
      font-size: 0.72rem;
      background: rgba(0,0,0,0.12);
      border-radius: 999px;
      padding: 0 5px;
    }
    .chip--active .chip-count { background: rgba(255,255,255,0.25); }
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

    /* â”€â”€ META â”€â”€ */
    .fashion-meta {
      font-size: 0.8rem;
      color: #9ca3af;
      margin-bottom: 1.5rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .meta-sep { color: #9ca3af; }

    /* â”€â”€ EMPTY â”€â”€ */
    .fashion-empty {
      text-align: center;
      padding: 5rem 1rem;
      color: #9ca3af;
    }
    .fashion-empty span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .fashion-empty button {
      margin-top: 1rem;
      padding: 0.6rem 2rem;
      border: 2px solid #1d1d1f;
      border-radius: 999px;
      background: transparent;
      font-size: 0.875rem;
      cursor: pointer;
    }

    /* â”€â”€ EDITORIAL GRID â”€â”€ */
    .editorial-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      grid-auto-rows: auto;
    }

    /* Hero-Karte: 2-col + 2-row */
    .editorial-cell--hero {
      grid-column: span 2;
      grid-row: span 2;
    }

    /* Kleine Seitenkarten: 1-col */
    .editorial-cell--side { grid-column: span 1; }

    /* RegulÃ¤re Karten: 1-col */
    .editorial-cell--regular { grid-column: span 1; }

    /* Bilder in der Hero-Karte taller machen */
    .editorial-cell--hero ::ng-deep .product-image-section {
      padding-top: 80%;
    }

    @media (max-width: 900px) {
      .editorial-grid { grid-template-columns: repeat(2, 1fr); }
      .editorial-cell--hero { grid-column: span 2; grid-row: span 1; }
    }
    @media (max-width: 480px) {
      .editorial-grid { grid-template-columns: 1fr; }
      .editorial-cell--hero { grid-column: span 1; }
    }

    .load-more-wrap { text-align: center; padding: 1.5rem 1rem; }
    .load-more-btn {
      padding: 0.65rem 2rem; border: 1.5px solid #667eea; border-radius: 999px;
      background: #fff; color: #667eea; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .load-more-btn:hover { background: #667eea; color: #fff; }
  `]
})
export class ProductGridFashionComponent implements OnChanges {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() filteredProducts: Product[] = [];
  @Input() selectedCategory: Category | null = null;
  @Input() storeId: number = 0;

  @Output() filterChange = new EventEmitter<Category | null>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() sortChange = new EventEmitter<string>();

  private readonly REST_PAGE = 21;
  private readonly STEP = 12;
  private restLimit = this.REST_PAGE;

  get visibleRest(): Product[] { return this.filteredProducts.slice(3, 3 + this.restLimit); }
  get hasMore(): boolean { return this.filteredProducts.length > 3 + this.restLimit; }

  ngOnChanges(): void { this.restLimit = this.REST_PAGE; }
  loadMore(): void { this.restLimit += this.STEP; }

  countFor(cat: Category): number {
    return this.products.filter(p => p.categoryId === cat.id).length;
  }
  onFilter(cat: Category | null): void { this.filterChange.emit(cat); }
  onSort(event: Event): void { this.sortChange.emit((event.target as HTMLSelectElement).value); }
}
