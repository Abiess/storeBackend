import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, Category } from '@app/core/models';

/**
 * Template 4: Mobile Marketplace Grid
 * - Sticky bottom bar with "Filter" and "Sortieren" buttons
 * - Bottom sheet drawer slides up for category filter
 * - 2-column marketplace grid (OLX/Avito style)
 * - Compact cards: image top, info bottom
 */
@Component({
  selector: 'app-product-grid-marketplace',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mp-wrapper">

      <!-- ── ACTIVE FILTER STRIP (desktop) ── -->
      <div class="mp-filter-strip" *ngIf="categories.length > 0">
        <div class="strip-scroll">
          <button class="strip-chip" [class.strip-chip--active]="!selectedCategory"
                  (click)="onFilter(null)">
            Alle
          </button>
          <button class="strip-chip" *ngFor="let cat of categories"
                  [class.strip-chip--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat)">
            {{ cat.name }}
          </button>
        </div>
        <select class="mp-sort" (change)="onSort($event)">
          <option value="relevant">Relevanz</option>
          <option value="price-asc">Preis ↑</option>
          <option value="price-desc">Preis ↓</option>
          <option value="newest">Neueste</option>
        </select>
      </div>

      <!-- ── RESULT/BREADCRUMB BAR ── -->
      <div class="mp-meta">
        <span class="mp-count">{{ filteredProducts.length }} Anzeigen</span>
        <span class="mp-breadcrumb" *ngIf="selectedCategory">
          › {{ selectedCategory.name }}
          <button class="mp-clear" (click)="onFilter(null)">✕</button>
        </span>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="mp-empty" *ngIf="filteredProducts.length === 0">
        <span>🔍</span>
        <p>Keine Anzeigen gefunden</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- ── 2-COL MARKETPLACE GRID ── -->
      <div class="mp-grid" *ngIf="filteredProducts.length > 0">
        <div class="mp-card" *ngFor="let p of filteredProducts" [routerLink]="['/products', p.id]">

          <!-- Image -->
          <div class="mp-card-image">
            <img *ngIf="getImg(p)" [src]="getImg(p)" [alt]="p.title"
                 loading="lazy" (error)="onErr($event)" />
            <div class="mp-card-placeholder" *ngIf="!getImg(p)">🏷️</div>

            <!-- Wishlist heart -->
            <button class="mp-heart" aria-label="Merken"
                    (click)="$event.stopPropagation(); $event.preventDefault()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>

            <!-- New badge -->
            <span class="mp-badge" *ngIf="isNew(p)">Neu</span>
          </div>

          <!-- Info -->
          <div class="mp-card-info">
            <p class="mp-card-price">{{ p.basePrice | number:'1.2-2' }} €</p>
            <p class="mp-card-title">{{ p.title }}</p>
            <div class="mp-card-meta">
              <span class="mp-card-location">📍 Online</span>
              <button class="mp-card-cart"
                      (click)="$event.stopPropagation(); $event.preventDefault(); addToCart.emit(p)">
                + Warenkorb
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MOBILE: Sticky bottom action bar ── -->
      <div class="mp-bottom-bar">
        <button class="mp-bottom-btn mp-bottom-btn--filter" (click)="toggleDrawer()">
          ⚙ Filter
          <span class="filter-dot" *ngIf="selectedCategory"></span>
        </button>
        <div class="mp-bottom-divider"></div>
        <button class="mp-bottom-btn mp-bottom-btn--sort" (click)="toggleSortDrawer()">
          ↕ Sortieren
        </button>
      </div>

      <!-- ── CATEGORY FILTER DRAWER (bottom sheet) ── -->
      <div class="mp-drawer-backdrop" [class.mp-drawer-backdrop--open]="drawerOpen" (click)="closeDrawer()"></div>
      <div class="mp-drawer" [class.mp-drawer--open]="drawerOpen">
        <div class="drawer-handle"></div>
        <h3 class="drawer-title">Kategorie wählen</h3>
        <div class="drawer-cats">
          <button class="drawer-cat" [class.drawer-cat--active]="!selectedCategory"
                  (click)="onFilter(null); closeDrawer()">
            Alle Kategorien ({{ products.length }})
          </button>
          <button class="drawer-cat" *ngFor="let cat of categories"
                  [class.drawer-cat--active]="selectedCategory?.id === cat.id"
                  (click)="onFilter(cat); closeDrawer()">
            {{ cat.name }} ({{ countFor(cat) }})
          </button>
        </div>
        <button class="drawer-close" (click)="closeDrawer()">Schließen</button>
      </div>

      <!-- ── SORT DRAWER (bottom sheet) ── -->
      <div class="mp-drawer-backdrop" [class.mp-drawer-backdrop--open]="sortDrawerOpen" (click)="closeSortDrawer()"></div>
      <div class="mp-drawer" [class.mp-drawer--open]="sortDrawerOpen">
        <div class="drawer-handle"></div>
        <h3 class="drawer-title">Sortieren nach</h3>
        <div class="drawer-cats">
          <button class="drawer-cat" *ngFor="let opt of sortOptions"
                  [class.drawer-cat--active]="activeSort === opt.value"
                  (click)="onSortOption(opt.value)">
            {{ opt.label }}
          </button>
        </div>
        <button class="drawer-close" (click)="closeSortDrawer()">Fertig</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .mp-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem 1rem 5rem; /* bottom padding for sticky bar */
    }
    @media (min-width: 768px) { .mp-wrapper { padding-bottom: 2rem; } }

    /* ── FILTER STRIP (desktop) ── */
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
    .strip-chip--active {
      background: #1d1d1f;
      border-color: #1d1d1f;
      color: #fff;
    }
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

    /* ── META BAR ── */
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

    /* ── 2-COL MARKETPLACE GRID ── */
    .mp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 640px)  { .mp-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; } }
    @media (min-width: 1024px) { .mp-grid { grid-template-columns: repeat(4, 1fr); gap: 1.25rem; } }

    /* ── MARKETPLACE CARD ── */
    .mp-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .mp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }

    .mp-card-image {
      position: relative;
      aspect-ratio: 1;
      background: #f3f4f6;
      overflow: hidden;
    }
    .mp-card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s;
    }
    .mp-card:hover .mp-card-image img { transform: scale(1.04); }
    .mp-card-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: #d1d5db;
    }

    .mp-heart {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
    }
    .mp-heart:hover { color: #ef4444; }

    .mp-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: #22c55e;
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 3px;
    }

    .mp-card-info {
      padding: 0.625rem 0.75rem 0.75rem;
    }
    .mp-card-price {
      margin: 0 0 0.2rem;
      font-size: 1rem;
      font-weight: 700;
      color: #111827;
    }
    .mp-card-title {
      margin: 0 0 0.5rem;
      font-size: 0.8rem;
      color: #4b5563;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .mp-card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
    }
    .mp-card-location {
      font-size: 0.7rem;
      color: #9ca3af;
      white-space: nowrap;
    }
    .mp-card-cart {
      font-size: 0.7rem;
      padding: 0.3rem 0.65rem;
      border: 1.5px solid #667eea;
      border-radius: 6px;
      background: transparent;
      color: #667eea;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .mp-card-cart:hover { background: #667eea; color: #fff; }

    /* ── STICKY BOTTOM BAR (mobile only) ── */
    .mp-bottom-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 56px;
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
    .mp-bottom-divider {
      width: 1px;
      background: #e5e7eb;
      margin: 10px 0;
    }
    .filter-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #667eea;
    }

    /* ── BOTTOM SHEET DRAWER ── */
    .mp-drawer-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 300;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .mp-drawer-backdrop--open { opacity: 1; }
    @media (max-width: 767px) { .mp-drawer-backdrop { display: block; pointer-events: none; }
      .mp-drawer-backdrop--open { pointer-events: all; } }

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
    .drawer-cats {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .drawer-cat {
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
    .drawer-cat:hover { background: #f3f4f6; }
    .drawer-cat--active {
      background: #f0ecff;
      color: #5b21b6;
      font-weight: 600;
    }
    .drawer-close {
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

  getImg(p: Product): string | null {
    if (p.primaryImageUrl) return p.primaryImageUrl;
    if (p.media?.length) {
      const pr = p.media.find((m: any) => m.isPrimary);
      return pr?.url ?? p.media[0]?.url ?? null;
    }
    return p.imageUrl ?? null;
  }

  onErr(e: Event): void { (e.target as HTMLImageElement).style.display = 'none'; }

  isNew(p: Product): boolean {
    if (!p.createdAt) return false;
    const diff = Date.now() - new Date(p.createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // < 7 Tage
  }
}

