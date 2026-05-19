import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product, Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Template 3: Compact Market Grid
 * - Inline compact filter bar (dropdown + sort)
 * - Denser 5-col grid (many products at a glance)
 * - Compact horizontal product cards
 * - Suited for electronics / large catalogues
 */
@Component({
  selector: 'app-product-grid-compact',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="compact-wrapper">

      <!-- ── INLINE FILTER BAR ── -->
      <div class="compact-filterbar">
        <div class="filterbar-left">
          <!-- Category dropdown -->
          <select class="filter-select" (change)="onCatChange($event)">
            <option value="">{{ 'storefront.allProducts' | translate }} ({{ products.length }})</option>
            <option *ngFor="let cat of categories" [value]="cat.id"
                    [selected]="selectedCategory?.id === cat.id">
              {{ cat.name }} ({{ countFor(cat) }})
            </option>
          </select>

          <!-- Active badge -->
          <span class="active-badge" *ngIf="selectedCategory">
            {{ selectedCategory.name }}
            <button (click)="onFilter(null)" class="badge-remove">✕</button>
          </span>
        </div>

        <div class="filterbar-right">
          <span class="result-label">{{ filteredProducts.length }} Treffer</span>
          <select class="filter-select" (change)="onSort($event)">
            <option value="relevant">Relevanz</option>
            <option value="price-asc">Preis ↑</option>
            <option value="price-desc">Preis ↓</option>
            <option value="name-asc">Name A-Z</option>
            <option value="newest">Neueste</option>
          </select>
          <!-- View toggle (decorative) -->
          <div class="view-toggle">
            <button class="vt-btn vt-btn--active" title="Kompaktansicht">⊞</button>
            <button class="vt-btn" title="Listenansicht">☰</button>
          </div>
        </div>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div class="compact-empty" *ngIf="filteredProducts.length === 0">
        <span>🔍</span>
        <p>Keine Treffer</p>
        <button (click)="onFilter(null)" *ngIf="selectedCategory">Alle anzeigen</button>
      </div>

      <!-- ── COMPACT GRID ── -->
      <div class="compact-grid" *ngIf="filteredProducts.length > 0">
        <div class="compact-card" *ngFor="let p of filteredProducts"
             [routerLink]="['/products', p.id]">

          <!-- Image -->
          <div class="compact-image">
            <img *ngIf="getImg(p)" [src]="getImg(p)" [alt]="p.title"
                 loading="lazy" (error)="onErr($event)" />
            <div class="compact-placeholder" *ngIf="!getImg(p)">📦</div>

            <!-- Quick view on hover -->
            <button class="compact-qv"
                    (click)="$event.stopPropagation(); $event.preventDefault(); quickView.emit(p)">
              👁
            </button>
          </div>

          <!-- Info -->
          <div class="compact-info">
            <p class="compact-title">{{ p.title }}</p>
            <div class="compact-footer">
              <span class="compact-price">{{ p.basePrice | number:'1.2-2' }} €</span>
              <button class="compact-cart"
                      (click)="$event.stopPropagation(); $event.preventDefault(); addToCart.emit(p)"
                      aria-label="In den Warenkorb">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 1h2.59l.83 2H17a1 1 0 01.97 1.24l-2 7A1 1 0 0115 12H8.36l-.5 2H14a1 1 0 110 2H7a1 1 0 01-.97-1.24l.5-2H4a1 1 0 01-1-1V3H2a1 1 0 110-2zm5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
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
      background: linear-gradient(135deg, #667eea20, #764ba220);
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
    .view-toggle {
      display: flex;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
    }
    .vt-btn {
      border: none;
      background: #fff;
      padding: 0.3rem 0.55rem;
      cursor: pointer;
      font-size: 0.9rem;
      color: #9ca3af;
      line-height: 1;
    }
    .vt-btn--active { background: #f3f4f6; color: #374151; }

    /* ── COMPACT GRID ── */
    .compact-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.875rem;
    }
    @media (max-width: 1200px) { .compact-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 900px)  { .compact-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px)  { .compact-grid { grid-template-columns: repeat(2, 1fr); } }

    /* ── COMPACT CARD ── */
    .compact-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
      display: flex;
      flex-direction: column;
    }
    .compact-card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.09);
      transform: translateY(-3px);
    }

    /* Image: landscape 4:3 */
    .compact-image {
      position: relative;
      aspect-ratio: 4 / 3;
      background: #f3f4f6;
      overflow: hidden;
    }
    .compact-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .compact-card:hover .compact-image img { transform: scale(1.04); }
    .compact-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: #d1d5db;
    }
    .compact-qv {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.92);
      cursor: pointer;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .compact-card:hover .compact-qv { opacity: 1; }

    /* Info */
    .compact-info {
      padding: 0.6rem 0.75rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }
    .compact-title {
      margin: 0;
      font-size: 0.8rem;
      color: #1f2937;
      line-height: 1.35;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      flex: 1;
    }
    .compact-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
    }
    .compact-price {
      font-size: 0.9rem;
      font-weight: 700;
      color: #111827;
    }
    .compact-cart {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .compact-cart:hover { opacity: 0.85; }

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

  getImg(p: Product): string | null {
    if (p.primaryImageUrl) return p.primaryImageUrl;
    if (p.media?.length) {
      const pr = p.media.find((m: any) => m.isPrimary);
      return pr?.url ?? p.media[0]?.url ?? null;
    }
    return p.imageUrl ?? null;
  }

  onErr(e: Event): void { (e.target as HTMLImageElement).style.display = 'none'; }
}

