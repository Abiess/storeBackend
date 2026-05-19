import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, Category } from '@app/core/models';
import { ProductCardComponent } from '../product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 1: Classic Sidebar Grid
 * - Fixed left sidebar with category list + accordion filters
 * - Right: sort‑toolbar + responsive 3-col product grid
 * - Standard product cards
 */
@Component({
  selector: 'app-product-grid-classic',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslatePipe],
  template: `
    <div class="classic-layout">

      <!-- ── LEFT SIDEBAR ── -->
      <aside class="classic-sidebar">
        <div class="sidebar-block">
          <h4 class="sidebar-title">{{ 'navigation.categories' | translate }}</h4>
          <ul class="cat-list">
            <li>
              <button class="cat-item" [class.active]="!selectedCategory"
                      (click)="onFilter(null)">
                <span class="cat-label">{{ 'storefront.allProducts' | translate }}</span>
                <span class="cat-count">{{ products.length }}</span>
              </button>
            </li>
            <li *ngFor="let cat of categories">
              <button class="cat-item" [class.active]="selectedCategory?.id === cat.id"
                      (click)="onFilter(cat)">
                <span class="cat-label">{{ cat.name }}</span>
                <span class="cat-count">{{ countFor(cat) }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Price range widget (static UI – purely decorative for now) -->
        <div class="sidebar-block">
          <h4 class="sidebar-title">{{ 'filter.priceRange' | translate }}</h4>
          <div class="price-range-track">
            <div class="price-range-bar"></div>
          </div>
          <div class="price-labels">
            <span>0 €</span>
            <span>{{ maxPrice | number:'1.0-0' }} €</span>
          </div>
        </div>

        <!-- Active filter indicator -->
        <div class="active-filter-banner" *ngIf="selectedCategory">
          <span>{{ selectedCategory.name }}</span>
          <button class="remove-filter" (click)="onFilter(null)" aria-label="Remove filter">✕</button>
        </div>
      </aside>

      <!-- ── MAIN CONTENT ── -->
      <div class="classic-main">

        <!-- Toolbar -->
        <div class="classic-toolbar">
          <p class="result-count">
            <strong>{{ filteredProducts.length }}</strong>
            {{ filteredProducts.length === 1 ? 'Produkt' : 'Produkte' }}
            <span *ngIf="selectedCategory"> · {{ selectedCategory.name }}</span>
          </p>
          <select class="sort-select" (change)="onSort($event)">
            <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
            <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
            <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
            <option value="name-asc">{{ 'storefront.sort.nameAsc' | translate }}</option>
            <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
          </select>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="filteredProducts.length === 0">
          <span class="empty-icon">🔍</span>
          <h3>Keine Produkte gefunden</h3>
          <button class="btn-reset" (click)="onFilter(null)" *ngIf="selectedCategory">
            Alle Produkte anzeigen
          </button>
        </div>

        <!-- Product Grid – 3 col desktop -->
        <div class="classic-grid" *ngIf="filteredProducts.length > 0">
          <app-product-card
            *ngFor="let p of filteredProducts"
            [product]="p"
            (addToCart)="addToCart.emit(p)"
            (quickView)="quickView.emit(p)">
          </app-product-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── LAYOUT ── */
    .classic-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 2rem;
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .classic-layout { grid-template-columns: 1fr; }
    }

    /* ── SIDEBAR ── */
    .classic-sidebar {
      position: sticky;
      top: 90px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .classic-sidebar { position: static; }
    }
    .sidebar-block {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 12px;
      padding: 1.25rem;
    }
    .sidebar-title {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin: 0 0 1rem;
    }
    .cat-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cat-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 0.9rem;
      color: #374151;
      transition: background 0.15s, color 0.15s;
      text-align: left;
    }
    .cat-item:hover { background: #f3f4f6; }
    .cat-item.active {
      background: var(--theme-primary, #667eea);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-weight: 600;
    }
    .cat-label { flex: 1; }
    .cat-count {
      font-size: 0.75rem;
      background: rgba(0,0,0,0.08);
      border-radius: 999px;
      padding: 1px 7px;
      font-weight: 600;
    }
    .cat-item.active .cat-count { background: rgba(255,255,255,0.25); }

    /* Price range (decorative) */
    .price-range-track {
      height: 4px;
      background: #e5e7eb;
      border-radius: 999px;
      margin: 0.5rem 0;
      position: relative;
    }
    .price-range-bar {
      height: 100%;
      width: 70%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 999px;
    }
    .price-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #6b7280;
    }

    /* Active filter */
    .active-filter-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f0ecff;
      border: 1px solid #c4b5fd;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      color: #5b21b6;
      font-weight: 500;
    }
    .remove-filter {
      border: none;
      background: none;
      cursor: pointer;
      color: #7c3aed;
      font-size: 1rem;
      line-height: 1;
      padding: 0 0 0 0.5rem;
    }

    /* ── TOOLBAR ── */
    .classic-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding: 0.875rem 1rem;
      background: #fff;
      border-radius: 10px;
      border: 1px solid #e8e8e8;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .result-count {
      margin: 0;
      font-size: 0.9rem;
      color: #6b7280;
    }
    .result-count strong { color: #111827; }
    .sort-select {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font-size: 0.875rem;
      color: #374151;
      background: #fff;
      cursor: pointer;
    }

    /* ── PRODUCT GRID ── */
    .classic-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    @media (max-width: 1100px) {
      .classic-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .classic-grid { grid-template-columns: 1fr; }
    }

    /* ── EMPTY STATE ── */
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #6b7280;
    }
    .empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .btn-reset {
      margin-top: 1rem;
      padding: 0.6rem 1.5rem;
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class ProductGridClassicComponent {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() filteredProducts: Product[] = [];
  @Input() selectedCategory: Category | null = null;

  @Output() filterChange = new EventEmitter<Category | null>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() sortChange = new EventEmitter<string>();

  get maxPrice(): number {
    return this.products.reduce((m, p) => Math.max(m, p.basePrice ?? 0), 0);
  }

  countFor(cat: Category): number {
    return this.products.filter(p => p.categoryId === cat.id).length;
  }

  onFilter(cat: Category | null): void {
    this.filterChange.emit(cat);
  }

  onSort(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value);
  }
}

