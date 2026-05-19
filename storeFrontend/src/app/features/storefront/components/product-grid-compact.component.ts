import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, Category } from '@app/core/models';
import { ProductCardComponent } from '../product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 3: Compact Market Grid
 * - Compact inline filter bar (category dropdown + sort) — always visible
 * - Dense 5-col grid using app-product-card with compact CSS
 * - Suited for electronics / large catalogues
 */
@Component({
  selector: 'app-product-grid-compact',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslatePipe],
  template: `
    <div class="compact-wrapper">

      <!-- ── INLINE FILTER BAR (always visible) ── -->
      <div class="compact-filterbar">
        <div class="filterbar-left">
          <select class="filter-select" (change)="onCatChange($event)">
            <option value="">{{ 'storefront.allProducts' | translate }} ({{ products.length }})</option>
            <option *ngFor="let cat of categories" [value]="cat.id"
                    [selected]="selectedCategory?.id === cat.id">
              {{ cat.name }} ({{ countFor(cat) }})
            </option>
          </select>

          <span class="active-badge" *ngIf="selectedCategory">
            {{ selectedCategory.name }}
            <button (click)="onFilter(null)" class="badge-remove" aria-label="Filter entfernen">✕</button>
          </span>
        </div>

        <div class="filterbar-right">
          <span class="result-label">{{ filteredProducts.length }} Treffer</span>
          <select class="filter-select" (change)="onSort($event)">
            <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
            <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
            <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
            <option value="name-asc">{{ 'storefront.sort.nameAsc' | translate }}</option>
            <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
          </select>
        </div>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="compact-empty" *ngIf="filteredProducts.length === 0">
        <span>🔍</span>
        <p>Keine Treffer</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- ── KOMPAKTES 5-COL GRID (echte Produkte via app-product-card) ── -->
      <div class="compact-grid" *ngIf="filteredProducts.length > 0">
        <app-product-card
          *ngFor="let p of filteredProducts"
          [product]="p"
          (addToCart)="addToCart.emit(p)"
          (quickView)="quickView.emit(p)">
        </app-product-card>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .compact-wrapper {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.25rem 1.5rem 2.5rem;
    }

    /* ── FILTER BAR ── */
    .compact-filterbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f8f9fa;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .filterbar-left, .filterbar-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .filter-select {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      font-size: 0.825rem;
      background: #fff;
      color: #374151;
      cursor: pointer;
    }
    .active-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #f0ecff;
      border: 1px solid #764ba240;
      color: #5b21b6;
      font-size: 0.775rem;
      font-weight: 600;
      border-radius: 6px;
      padding: 0.25rem 0.6rem;
    }
    .badge-remove {
      border: none;
      background: none;
      cursor: pointer;
      color: #7c3aed;
      font-size: 0.8rem;
      padding: 0;
      line-height: 1;
    }
    .result-label {
      font-size: 0.8rem;
      color: #6b7280;
      white-space: nowrap;
    }

    /* ── KOMPAKTES GRID – 5 Spalten Desktop ── */
    .compact-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.875rem;
    }
    @media (max-width: 1200px) { .compact-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 900px)  { .compact-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px)  { .compact-grid { grid-template-columns: repeat(2, 1fr); } }

    /* Karten im kompakten Grid kleiner machen */
    .compact-grid ::ng-deep .product-card {
      border-radius: 10px;
    }
    .compact-grid ::ng-deep .product-image-section {
      padding-top: 75%; /* 4:3 Landscape */
    }
    .compact-grid ::ng-deep .product-info {
      padding: 0.625rem 0.75rem 0.75rem;
    }
    .compact-grid ::ng-deep .product-title {
      font-size: 0.8rem;
      -webkit-line-clamp: 2;
      min-height: unset;
    }
    .compact-grid ::ng-deep .product-description { display: none; }
    .compact-grid ::ng-deep .price-amount { font-size: 1rem; }
    .compact-grid ::ng-deep .btn-add-cart { width: 36px; height: 36px; }

    /* ── EMPTY ── */
    .compact-empty {
      text-align: center;
      padding: 3rem;
      color: #9ca3af;
      font-size: 1.125rem;
    }
    .compact-empty span { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
    .compact-empty button {
      margin-top: 0.75rem;
      padding: 0.5rem 1.25rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 0.875rem;
    }
  `]
})
export class ProductGridCompactComponent {
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

  onCatChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (!val) { this.filterChange.emit(null); return; }
    const cat = this.categories.find(c => c.id === +val) ?? null;
    this.filterChange.emit(cat);
  }

  onSort(event: Event): void { this.sortChange.emit((event.target as HTMLSelectElement).value); }
}
