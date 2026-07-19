import { Component, Input, Output, EventEmitter, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, Category } from '@app/core/models';
import { ProductCardComponent } from '../product-card.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 4: Mobile Marketplace Grid
 * - Strip-chips Filter (immer sichtbar, auch ohne Kategorien)
 * - Suchfeld (Live-Suche in Produkten)
 * - Pagination "Mehr laden" (verhindert dass Footer unzugänglich wird)
 * - Bottom-Sheet Drawer auf Mobile (Sticky Footer-Bar)
 * - 2-4 col Grid mit app-product-card
 * - RTL-Support via [dir] Attribut
 */
@Component({
  selector: 'app-product-grid-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, TranslatePipe],
  template: `
    <div class="mp-wrapper">

      <!-- ── SEARCH BAR ── -->
      <div class="mp-search-bar">
        <span class="mp-search-icon" aria-hidden="true">🔍</span>
        <input
          class="mp-search-input"
          type="search"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          [placeholder]="'storefront.filter.searchPlaceholder' | translate"
          [attr.aria-label]="'storefront.filter.search' | translate"
          autocomplete="off">
        <button *ngIf="searchQuery"
          class="mp-search-clear"
          (click)="clearSearch()"
          [attr.aria-label]="'storefront.filter.searchClear' | translate">✕</button>
      </div>

      <!-- ── FILTER STRIP (IMMER sichtbar) ── -->
      <div class="mp-filter-strip">
        <div class="strip-scroll">
          <button class="strip-chip"
                  [class.strip-chip--active]="!selectedCategory"
                  (click)="onFilter(null)">
            {{ 'storefront.allProducts' | translate }}
          </button>
          <button class="strip-chip"
                  *ngFor="let cat of categories"
                  [class.strip-chip--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat)">
            {{ cat.name }}
          </button>
        </div>
        <select class="mp-sort"
                (change)="onSort($event)"
                [attr.aria-label]="'storefront.filter.sortBy' | translate">
          <option value="relevant">{{ 'storefront.sort.relevant' | translate }}</option>
          <option value="price-asc">{{ 'storefront.sort.priceAsc' | translate }}</option>
          <option value="price-desc">{{ 'storefront.sort.priceDesc' | translate }}</option>
          <option value="name-asc">{{ 'storefront.sort.nameAsc' | translate }}</option>
          <option value="newest">{{ 'storefront.sort.newest' | translate }}</option>
        </select>
      </div>

      <!-- ── META / BREADCRUMB ── -->
      <div class="mp-meta">
        <span class="mp-count">
          {{ displayedProducts.length }}
          {{ displayedProducts.length === 1
            ? ('storefront.filter.product' | translate)
            : ('storefront.filter.products' | translate) }}
        </span>
        <span class="mp-breadcrumb" *ngIf="selectedCategory">
          › {{ selectedCategory.name }}
          <button class="mp-clear"
                  (click)="onFilter(null)"
                  [attr.aria-label]="'storefront.filter.resetFilter' | translate">✕</button>
        </span>
        <span class="mp-breadcrumb" *ngIf="searchQuery">
          › "{{ searchQuery }}"
          <button class="mp-clear" (click)="clearSearch()">✕</button>
        </span>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="mp-empty" *ngIf="displayedProducts.length === 0" role="status">
        <span aria-hidden="true">🔍</span>
        <p>{{ 'storefront.filter.noResults' | translate }}</p>
        <p class="mp-empty-hint">{{ 'storefront.filter.noResultsHint' | translate }}</p>
        <button (click)="resetAll()"
                *ngIf="selectedCategory || searchQuery">
          {{ 'storefront.filter.resetFilter' | translate }}
        </button>
      </div>

      <!-- ── MARKETPLACE GRID ── -->
      <div class="mp-grid" *ngIf="displayedProducts.length > 0">
        <app-product-card
          *ngFor="let p of visibleProducts; trackBy: trackById"
          [product]="p"
          [storeId]="storeId"
          (addToCart)="addToCart.emit(p)"
          (quickView)="quickView.emit(p)">
        </app-product-card>
      </div>

      <!-- "€"€ PAGINATION: "MEHR LADEN" "€"€ -->
      <div class="mp-load-more" *ngIf="hasMore && displayedProducts.length > 0">
        <p class="mp-load-more-count">
          {{ 'storefront.filter.loadMoreOf' | translate: { loaded: visibleProducts.length, total: displayedProducts.length } }}
        </p>
        <button class="mp-load-more-btn" (click)="loadMore()" type="button">
          {{ 'storefront.filter.loadMore' | translate }}
          <span class="mp-load-more-arrow" aria-hidden="true">↓</span>
        </button>
      </div>

      <!-- "€"€ ALLE GELADEN "€"€ -->
      <div class="mp-all-loaded" *ngIf="!hasMore && displayedProducts.length > PAGE_SIZE" aria-live="polite">
        ✓ {{ 'storefront.filter.allLoaded' | translate: { total: displayedProducts.length } }}
      </div>

      <!-- ── MOBILE: Sticky Bottom Bar ── -->
      <div class="mp-bottom-bar" role="toolbar" [attr.aria-label]="'storefront.filter.filter' | translate">
        <button class="mp-bottom-btn" (click)="toggleDrawer()"
                [attr.aria-expanded]="drawerOpen"
                [attr.aria-label]="'storefront.filter.filter' | translate">
          ⚙ {{ 'storefront.filter.filter' | translate }}
          <span class="filter-dot" *ngIf="selectedCategory" aria-hidden="true"></span>
        </button>
        <div class="mp-bottom-divider" aria-hidden="true"></div>
        <button class="mp-bottom-btn" (click)="toggleSortDrawer()"
                [attr.aria-expanded]="sortDrawerOpen"
                [attr.aria-label]="'storefront.filter.sort' | translate">
          ↕ {{ 'storefront.filter.sort' | translate }}
        </button>
      </div>

      <!-- ── CATEGORY FILTER DRAWER ── -->
      <div class="mp-backdrop"
           [class.mp-backdrop--open]="drawerOpen"
           (click)="closeDrawer()"
           [attr.aria-hidden]="!drawerOpen"></div>
      <div class="mp-drawer"
           [class.mp-drawer--open]="drawerOpen"
           role="dialog"
           [attr.aria-modal]="drawerOpen"
           [attr.aria-label]="'storefront.filter.chooseCategory' | translate">
        <div class="drawer-handle" aria-hidden="true"></div>
        <h3 class="drawer-title">{{ 'storefront.filter.chooseCategory' | translate }}</h3>
        <div class="drawer-list">
          <button class="drawer-item"
                  [class.drawer-item--active]="!selectedCategory"
                  (click)="onFilter(null); closeDrawer()">
            {{ 'storefront.allProducts' | translate }}
            <span class="drawer-count">({{ products.length }})</span>
          </button>
          <button class="drawer-item"
                  *ngFor="let cat of categories"
                  [class.drawer-item--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat); closeDrawer()">
            {{ cat.name }}
            <span class="drawer-count">({{ countFor(cat) }})</span>
          </button>
        </div>
        <button class="drawer-close-btn" (click)="closeDrawer()">
          {{ 'storefront.filter.close' | translate }}
        </button>
      </div>

      <!-- ── SORT DRAWER ── -->
      <div class="mp-backdrop"
           [class.mp-backdrop--open]="sortDrawerOpen"
           (click)="closeSortDrawer()"
           [attr.aria-hidden]="!sortDrawerOpen"></div>
      <div class="mp-drawer"
           [class.mp-drawer--open]="sortDrawerOpen"
           role="dialog"
           [attr.aria-modal]="sortDrawerOpen"
           [attr.aria-label]="'storefront.filter.sortBy' | translate">
        <div class="drawer-handle" aria-hidden="true"></div>
        <h3 class="drawer-title">{{ 'storefront.filter.sortBy' | translate }}</h3>
        <div class="drawer-list">
          <button class="drawer-item"
                  *ngFor="let opt of sortOptions"
                  [class.drawer-item--active]="activeSort === opt.value"
                  (click)="onSortOption(opt.value)">
            {{ opt.labelKey | translate }}
            <span class="drawer-check" *ngIf="activeSort === opt.value" aria-hidden="true">✓</span>
          </button>
        </div>
        <button class="drawer-close-btn" (click)="closeSortDrawer()">
          {{ 'storefront.filter.done' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .mp-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      /* Mobile: Platz für Bottom-Bar (54px) + Bottom-Nav (60px) + Safe-Area */
      padding: 1rem 1rem calc(54px + var(--bottom-nav-height, 60px) + var(--safe-area-bottom, 0px) + 1rem);
    }
    @media (min-width: 768px) { .mp-wrapper { padding-bottom: 2rem; } }

    /* ── SEARCH BAR ── */
    .mp-search-bar {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0.875rem;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      padding: 0 0.75rem;
      transition: border-color 0.2s;
    }

    /* Desktop: Verstecke zweite Suche (Header-Suche reicht) */
    @media (min-width: 768px) {
      .mp-search-bar {
        display: none;
      }
    }
    .mp-search-bar:focus-within {
      border-color: #764ba2;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(118,75,162,0.08);
    }
    .mp-search-icon {
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-inline-end: 0.5rem;
      color: #9ca3af;
    }
    .mp-search-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.625rem 0;
      font-size: 0.9rem;
      color: #111827;
      outline: none;
      min-width: 0;
    }
    .mp-search-input::placeholder { color: #9ca3af; }
    /* Entfernt das native Browser-X bei type=search */
    .mp-search-input::-webkit-search-cancel-button { display: none; }
    .mp-search-clear {
      border: none;
      background: none;
      cursor: pointer;
      color: #9ca3af;
      font-size: 0.8rem;
      padding: 0.25rem;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .mp-search-clear:hover { background: #f3f4f6; color: #374151; }

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
      padding-block: 2px;
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
      flex-wrap: wrap;
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
    .mp-clear:hover { color: #ef4444; }

    /* ── EMPTY ── */
    .mp-empty {
      text-align: center;
      padding: 3rem 1rem;
      color: #9ca3af;
    }
    .mp-empty span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .mp-empty-hint { font-size: 0.825rem; margin-top: 0.25rem; }
    .mp-empty button {
      margin-top: 1rem;
      padding: 0.625rem 1.5rem;
      border: 1.5px solid #764ba2;
      border-radius: 8px;
      background: #fff;
      color: #764ba2;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .mp-empty button:hover { background: #764ba2; color: #fff; }

    /* ── MARKETPLACE GRID (2-col mobile → 4-col desktop) ── */
    .mp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 640px)  { .mp-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; } }
    @media (min-width: 1024px) { .mp-grid { grid-template-columns: repeat(4, 1fr); gap: 1.25rem; } }

    /* ── PAGINATION: MEHR LADEN ── */
    .mp-load-more {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      padding: 1.5rem 1rem 0.5rem;
    }
    .mp-load-more-count {
      font-size: 0.8rem;
      color: #9ca3af;
      margin: 0;
    }
    .mp-load-more-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 2rem;
      border: 1.5px solid #e5e7eb;
      border-radius: 999px;
      background: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .mp-load-more-btn:hover {
      border-color: #764ba2;
      color: #764ba2;
      box-shadow: 0 2px 8px rgba(118,75,162,0.12);
      transform: translateY(-1px);
    }
    .mp-load-more-arrow {
      font-size: 1rem;
      transition: transform 0.2s;
    }
    .mp-load-more-btn:hover .mp-load-more-arrow { transform: translateY(2px); }

    /* "Alle geladen" Bestätigung */
    .mp-all-loaded {
      text-align: center;
      padding: 1rem;
      color: #6b7280;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
    }

    /* ── STICKY BOTTOM BAR (nur Mobile) ── */
    .mp-bottom-bar {
      display: none;
      position: fixed;
      bottom: calc(var(--bottom-nav-height, 60px) + var(--safe-area-bottom, 0px));
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
      padding: 0.75rem 1.25rem 2.5rem;
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
      /* RTL-safe: text-align: start statt left */
      text-align: start;
      font-size: 0.95rem;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .drawer-item:hover { background: #f3f4f6; }
    .drawer-item--active { background: #f0ecff; color: #5b21b6; font-weight: 600; }
    .drawer-count { font-size: 0.8rem; color: #9ca3af; font-weight: 400; }
    .drawer-check { color: #764ba2; font-weight: 700; }
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
      transition: all 0.15s;
    }
    .drawer-close-btn:hover { background: #1d1d1f; color: #fff; }

    /* ── RTL Support ── */
    :host-context([dir="rtl"]) .mp-search-icon { margin-inline-end: 0.5rem; }
    :host-context([dir="rtl"]) .strip-scroll { direction: rtl; }
    :host-context([dir="rtl"]) .drawer-item { text-align: start; }
    :host-context([dir="rtl"]) .mp-sort { direction: rtl; }
  `]
})
export class ProductGridMarketplaceComponent implements OnChanges {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() filteredProducts: Product[] = [];
  @Input() selectedCategory: Category | null = null;
  @Input() storeId: number = 0;
  @Input() externalSearchQuery = ''; // Von Header-Suche gesteuert

  @Output() filterChange = new EventEmitter<Category | null>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();
  @Output() sortChange = new EventEmitter<string>();

  drawerOpen = false;
  sortDrawerOpen = false;
  activeSort = 'relevant';
  searchQuery = '';

  /** Pagination: 24 Produkte initial (Best Practice: 24–36), dann +12 pro "Mehr laden" */
  readonly PAGE_SIZE = 24;
  /** Schrittweite beim "Mehr laden" */
  readonly LOAD_MORE_STEP = 12;
  private currentPage = 1;

  /** Alle nach Suche+Filter gefilterten Produkte */
  displayedProducts: Product[] = [];
  /** Die aktuell sichtbaren Produkte (begrenzt durch Pagination) */
  visibleProducts: Product[] = [];

  get hasMore(): boolean {
    return this.visibleProducts.length < this.displayedProducts.length;
  }

  readonly sortOptions = [
    { value: 'relevant',   labelKey: 'storefront.filter.relevance' },
    { value: 'price-asc',  labelKey: 'storefront.sort.priceAsc' },
    { value: 'price-desc', labelKey: 'storefront.sort.priceDesc' },
    { value: 'name-asc',   labelKey: 'storefront.sort.nameAsc' },
    { value: 'newest',     labelKey: 'storefront.sort.newest' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    // Externe Suche von Header synchronisieren
    if (changes['externalSearchQuery']) {
      this.searchQuery = this.externalSearchQuery;
    }
    
    // Wenn selectedCategory von außen geändert wird (z.B. Header-Pills) → Suche zurücksetzen
    if (changes['selectedCategory'] && !changes['selectedCategory'].firstChange) {
      this.searchQuery = '';
    }
    if (changes['filteredProducts'] || changes['products'] || changes['selectedCategory'] || changes['externalSearchQuery']) {
      this.applyLocalFilters();
    }
  }

  /** Lokale Suche on top von dem was die Parent-Komponente filtert */
  private applyLocalFilters(): void {
    // BUG FIX: Wenn eine Kategorie aktiv ist, immer filteredProducts verwenden –
    // auch wenn sie leer ist (Kategorie hat 0 Produkte → leeres Ergebnis zeigen, nicht alle Produkte)
    let base = this.selectedCategory !== null ? this.filteredProducts : this.products;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      base = base.filter(p =>
        (p.title || p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    
    // Sortierung anwenden
    base = this.applySorting(base);
    
    this.displayedProducts = base;
    this.currentPage = 1;
    this.updateVisibleProducts();
  }

  /** Sortierung auf Produktliste anwenden */
  private applySorting(products: Product[]): Product[] {
    const sorted = [...products];
    
    switch (this.activeSort) {
      case 'price-asc':
        sorted.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name-asc':
        sorted.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      default: // relevant
        // Keep original order
        break;
    }
    
    return sorted;
  }

  private updateVisibleProducts(): void {
    // Initial: PAGE_SIZE, dann je +LOAD_MORE_STEP
    const limit = this.currentPage === 1
      ? this.PAGE_SIZE
      : this.PAGE_SIZE + (this.currentPage - 1) * this.LOAD_MORE_STEP;
    this.visibleProducts = this.displayedProducts.slice(0, limit);
  }

  loadMore(): void {
    this.currentPage++;
    this.updateVisibleProducts();
    // Smooth scroll zu den neuen Produkten
    setTimeout(() => {
      const newItems = document.querySelectorAll('.mp-grid app-product-card');
      const firstNew = newItems[newItems.length - this.LOAD_MORE_STEP] as HTMLElement | null;
      if (firstNew) firstNew.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  onSearchChange(): void {
    this.applyLocalFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyLocalFilters();
  }

  resetAll(): void {
    this.searchQuery = '';
    this.filterChange.emit(null);
    this.applyLocalFilters();
  }

  countFor(cat: Category): number {
    return this.products.filter(p => p.categoryId === cat.id).length;
  }

  onFilter(cat: Category | null): void {
    this.searchQuery = '';
    this.filterChange.emit(cat);
  }

  onSort(event: Event): void {
    this.activeSort = (event.target as HTMLSelectElement).value;
    this.applyLocalFilters(); // Re-apply filters with new sort
    this.sortChange.emit(this.activeSort);
  }

  onSortOption(value: string): void {
    this.activeSort = value;
    this.applyLocalFilters(); // Re-apply filters with new sort
    this.sortChange.emit(value);
    this.closeSortDrawer();
  }

  trackById(_: number, p: Product): number { return p.id; }

  toggleDrawer(): void { this.drawerOpen = !this.drawerOpen; }
  closeDrawer(): void { this.drawerOpen = false; }
  toggleSortDrawer(): void { this.sortDrawerOpen = !this.sortDrawerOpen; }
  closeSortDrawer(): void { this.sortDrawerOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.drawerOpen = false; this.sortDrawerOpen = false; }
}

