import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, Category } from '@app/core/models';
import { ProductCardComponent } from '../product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 4: Mobile Marketplace Grid
 * - Strip-chips Filter (immer sichtbar, auch ohne Kategorien)
 * - Bottom-Sheet Drawer auf Mobile (Sticky Footer-Bar)
 * - 2-4 col Grid mit app-product-card
 */
@Component({
  selector: 'app-product-grid-marketplace',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslatePipe],
  template: `
    <div class="mp-wrapper">

      <!-- ── FILTER STRIP (IMMER sichtbar) ── -->
      <div class="mp-filter-strip">
        <div class="strip-scroll">
          <button class="strip-chip" [class.strip-chip--active]="!selectedCategory"
                  (click)="onFilter(null)">
            {{ 'storefront.allProducts' | translate }}
          </button>
          <button class="strip-chip" *ngFor="let cat of categories"
                  [class.strip-chip--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat)">
            {{ cat.name }}
          </button>
        </div>
        <select class="mp-sort" (change)="onSort($event)">
          <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
          <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
          <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
          <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
        </select>
      </div>

      <!-- ── META / BREADCRUMB ── -->
      <div class="mp-meta">
        <span class="mp-count">{{ filteredProducts.length }}
          {{ filteredProducts.length === 1 ? 'Produkt' : 'Produkte' }}
        </span>
        <span class="mp-breadcrumb" *ngIf="selectedCategory">
          › {{ selectedCategory.name }}
          <button class="mp-clear" (click)="onFilter(null)" aria-label="Filter zurücksetzen">✕</button>
        </span>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="mp-empty" *ngIf="filteredProducts.length === 0">
        <span>🔍</span>
        <p>Keine Produkte gefunden</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- ── 2-COL MARKETPLACE GRID (echte Produkte via app-product-card) ── -->
      <div class="mp-grid" *ngIf="filteredProducts.length > 0">
        <app-product-card
          *ngFor="let p of filteredProducts"
          [product]="p"
          (addToCart)="addToCart.emit(p)"
          (quickView)="quickView.emit(p)">
        </app-product-card>
      </div>

      <!-- ── MOBILE: Sticky Bottom Bar ── -->
      <div class="mp-bottom-bar">
        <button class="mp-bottom-btn" (click)="toggleDrawer()">
          ⚙ Filter
          <span class="filter-dot" *ngIf="selectedCategory"></span>
        </button>
        <div class="mp-bottom-divider"></div>
        <button class="mp-bottom-btn" (click)="toggleSortDrawer()">
          ↕ Sortieren
        </button>
      </div>

      <!-- ── CATEGORY FILTER DRAWER ── -->
      <div class="mp-backdrop" [class.mp-backdrop--open]="drawerOpen" (click)="closeDrawer()"></div>
      <div class="mp-drawer" [class.mp-drawer--open]="drawerOpen">
        <div class="drawer-handle"></div>
        <h3 class="drawer-title">Kategorie wählen</h3>
        <div class="drawer-list">
          <button class="drawer-item" [class.drawer-item--active]="!selectedCategory"
                  (click)="onFilter(null); closeDrawer()">
            {{ 'storefront.allProducts' | translate }} ({{ products.length }})
          </button>
          <button class="drawer-item" *ngFor="let cat of categories"
                  [class.drawer-item--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat); closeDrawer()">
            {{ cat.name }} ({{ countFor(cat) }})
          </button>
        </div>
        <button class="drawer-close-btn" (click)="closeDrawer()">Schließen</button>
      </div>

      <!-- ── SORT DRAWER ── -->
      <div class="mp-backdrop" [class.mp-backdrop--open]="sortDrawerOpen" (click)="closeSortDrawer()"></div>
      <div class="mp-drawer" [class.mp-drawer--open]="sortDrawerOpen">
        <div class="drawer-handle"></div>
        <h3 class="drawer-title">Sortieren nach</h3>
        <div class="drawer-list">
          <button class="drawer-item" *ngFor="let opt of sortOptions"
                  [class.drawer-item--active]="activeSort === opt.value"
                  (click)="onSortOption(opt.value)">
            {{ opt.label }}
          </button>
        </div>
        <button class="drawer-close-btn" (click)="closeSortDrawer()">Fertig</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .mp-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem 1rem 5rem;
    }
    @media (min-width: 768px) { .mp-wrapper { padding-bottom: 2rem; } }

    /* ── FILTER STRIP (immer sichtbar) ── */
    .mp-filter-strip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .strip-scroll {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      flex: 1;
      scrollbar-width: none;
    }
    .strip-scroll::-webkit-scrollbar { display: none; }
    .strip-chip {
      flex-shrink: 0;
      padding: 0.35rem 0.9rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 999px;
      background: #fff;
      font-size: 0.8rem;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .strip-chip:hover { border-color: #764ba2; color: #764ba2; }
    .strip-chip--active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
    .mp-sort {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.35rem 0.65rem;
      font-size: 0.8rem;
      background: #fff;
      color: #374151;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* ── META ── */
    .mp-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.875rem;
      font-size: 0.825rem;
      color: #6b7280;
    }
    .mp-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      color: #374151;
    }
    .mp-clear {
      border: none;
      background: none;
      cursor: pointer;
      color: #9ca3af;
      font-size: 0.875rem;
      padding: 0 0 0 0.25rem;
    }

    /* ── EMPTY ── */
    .mp-empty {
      text-align: center;
      padding: 3rem 1rem;
      color: #9ca3af;
    }
    .mp-empty span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .mp-empty button {
      margin-top: 0.75rem;
      padding: 0.5rem 1.25rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
    }

    /* ── MARKETPLACE GRID (2-col mobile → 4-col desktop) ── */
    .mp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 640px)  { .mp-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; } }
    @media (min-width: 1024px) { .mp-grid { grid-template-columns: repeat(4, 1fr); gap: 1.25rem; } }

    /* ── STICKY BOTTOM BAR (nur Mobile) ── */
    .mp-bottom-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 54px;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
      z-index: 200;
      align-items: stretch;
    }
    @media (max-width: 767px) { .mp-bottom-bar { display: flex; } }

    .mp-bottom-btn {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      position: relative;
    }
    .mp-bottom-btn:active { background: #f3f4f6; }
    .mp-bottom-divider { width: 1px; background: #e5e7eb; margin: 10px 0; }
    .filter-dot { width: 7px; height: 7px; border-radius: 50%; background: #667eea; }

    /* ── BOTTOM-SHEET DRAWER ── */
    .mp-backdrop {
      display: none;
      pointer-events: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 300;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .mp-backdrop--open { opacity: 1; pointer-events: all; }
    @media (max-width: 767px) { .mp-backdrop { display: block; } }

    .mp-drawer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-radius: 20px 20px 0 0;
      padding: 0.75rem 1.25rem 2rem;
      z-index: 400;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 80vh;
      overflow-y: auto;
    }
    .mp-drawer--open { transform: translateY(0); }

    .drawer-handle {
      width: 40px;
      height: 4px;
      background: #d1d5db;
      border-radius: 999px;
      margin: 0 auto 1rem;
    }
    .drawer-title {
      font-size: 1rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 1rem;
    }
    .drawer-list { display: flex; flex-direction: column; gap: 4px; }
    .drawer-item {
      width: 100%;
      padding: 0.875rem 1rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      text-align: left;
      font-size: 0.95rem;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
    }
    .drawer-item:hover { background: #f3f4f6; }
    .drawer-item--active { background: #f0ecff; color: #5b21b6; font-weight: 600; }
    .drawer-close-btn {
      margin-top: 1rem;
      width: 100%;
      padding: 0.875rem;
      border: 2px solid #1d1d1f;
      border-radius: 12px;
      background: transparent;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class ProductGridMarketplaceComponent {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() filteredProducts: Product[] = [];
  @Input() selectedCategory: Category | null = null;

  @Output() filterChange = new EventEmitter<Category | null>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() sortChange = new EventEmitter<string>();

  drawerOpen = false;
  sortDrawerOpen = false;
  activeSort = 'relevant';

  readonly sortOptions = [
    { value: 'relevant', label: 'Relevanz' },
    { value: 'price-asc', label: 'Preis: Niedrig → Hoch' },
    { value: 'price-desc', label: 'Preis: Hoch → Niedrig' },
    { value: 'name-asc', label: 'Name A–Z' },
    { value: 'newest', label: 'Neueste zuerst' }
  ];

  countFor(cat: Category): number {
    return this.products.filter(p => p.categoryId === cat.id).length;
  }

  onFilter(cat: Category | null): void { this.filterChange.emit(cat); }
  onSort(event: Event): void { this.sortChange.emit((event.target as HTMLSelectElement).value); }
  onSortOption(value: string): void {
    this.activeSort = value;
    this.sortChange.emit(value);
    this.closeSortDrawer();
  }

  toggleDrawer(): void { this.drawerOpen = !this.drawerOpen; }
  closeDrawer(): void { this.drawerOpen = false; }
  toggleSortDrawer(): void { this.sortDrawerOpen = !this.sortDrawerOpen; }
  closeSortDrawer(): void { this.sortDrawerOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.drawerOpen = false; this.sortDrawerOpen = false; }
}

