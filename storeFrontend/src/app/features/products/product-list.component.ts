import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig, BulkActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { FabService } from '@app/core/services/fab.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, StoreNavigationComponent, TranslatePipe, ResponsiveDataListComponent, PageHeaderComponent],
  template: `
    <div class="product-list-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [currentPage]="'navigation.products' | translate">
      </app-store-navigation>

      <app-page-header
        [title]="'Produkte'"
        [showBackButton]="false"
        [actions]="headerActions">
      </app-page-header>

      <!-- Filter-Leiste: Status-Filter (immer sichtbar) + Telegram-Filter (wenn vorhanden) -->
      <div class="filter-bar">
        <!-- Status-Filter -->
        <button class="filter-btn" [class.active]="statusFilter === 'ALL'" (click)="setStatusFilter('ALL')">
          📦 {{ 'productList.filterAll' | translate }} ({{ products.length }})
        </button>
        <button class="filter-btn filter-btn--active" [class.active]="statusFilter === 'ACTIVE'" (click)="setStatusFilter('ACTIVE')">
          🟢 {{ 'productList.filterActive' | translate }} ({{ countByStatus('ACTIVE') }})
        </button>
        <button class="filter-btn filter-btn--draft" [class.active]="statusFilter === 'DRAFT'" (click)="setStatusFilter('DRAFT')">
          📝 {{ 'productList.filterDraft' | translate }} ({{ countByStatus('DRAFT') }})
        </button>
        <button class="filter-btn filter-btn--archived" [class.active]="statusFilter === 'ARCHIVED'" (click)="setStatusFilter('ARCHIVED')">
          🗄️ {{ 'productList.filterArchived' | translate }} ({{ countByStatus('ARCHIVED') }})
        </button>
        <!-- Telegram-Filter (nur wenn vorhanden) -->
        <button *ngIf="hasTelegramProducts" class="filter-btn filter-btn--telegram"
                [class.active]="statusFilter === 'TELEGRAM'" (click)="setStatusFilter('TELEGRAM')">
          📡 {{ 'productList.filterTelegram' | translate }} ({{ telegramCount }})
        </button>
        <!-- Preis-Review-Filter -->
        <button *ngIf="priceReviewCount > 0" class="filter-btn filter-btn--review"
                [class.active]="statusFilter === 'REVIEW'" (click)="setStatusFilter('REVIEW')">
          ⚠️ {{ 'productList.filterPriceReview' | translate }} ({{ priceReviewCount }})
        </button>
      </div>

      <!-- Responsive Data List -->
      <app-responsive-data-list
        [items]="filteredProducts"
        [columns]="columns"
        [actions]="actions"
        [bulkActions]="bulkActions"
        [loading]="loading"
        [selectable]="true"
        [rowClickable]="true"
        [searchable]="true"
        [searchPlaceholder]="'productList.searchPlaceholder' | translate"
        [emptyMessage]="statusFilter === 'TELEGRAM' ? ('productList.noTelegramProducts' | translate) : statusFilter === 'ALL' ? ('storeDetail.noProducts' | translate) : ('productList.noProductsInStatus' | translate)"
        [emptyIcon]="statusFilter === 'TELEGRAM' ? '📡' : '📦'"
        (rowClick)="editProduct($event.id)"
        (selectionChange)="onSelectionChange($event)">
      </app-responsive-data-list>

      <!-- Bulk-Feedback Toast -->
      <div class="bulk-toast" *ngIf="bulkMsg" [class.bulk-toast--error]="bulkError">
        {{ bulkMsg }}
      </div>
    </div>
  `,
  styles: [`
    .product-list-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      margin: 0;
      color: #333;
      font-size: 1.875rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    @media (max-width: 768px) {
      .product-list-container { padding: 1rem; }
      .header { flex-direction: column; align-items: stretch; gap: 1rem; }
      .btn-primary { width: 100%; }
    }

    .bulk-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #166534;
      color: #fff;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: toast-in 0.2s ease;
    }
    .bulk-toast--error { background: #991b1b; }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    /* Filter Bar – immer sichtbar */
    .filter-bar {
      display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem;
    }
    .filter-btn {
      padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb;
      background: #f9fafb; color: #374151; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all .15s ease;
    }
    .filter-btn:hover { border-color: #667eea; color: #667eea; }
    .filter-btn.active { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border-color: transparent; }
    /* Status-spezifische Farben im inaktiven Zustand */
    .filter-btn--active  { border-color: #16a34a; color: #16a34a; }
    .filter-btn--active.active  { background: linear-gradient(135deg,#22c55e,#16a34a); }
    .filter-btn--draft   { border-color: #9ca3af; color: #6b7280; }
    .filter-btn--draft.active   { background: linear-gradient(135deg,#9ca3af,#6b7280); }
    .filter-btn--archived{ border-color: #d97706; color: #b45309; }
    .filter-btn--archived.active{ background: linear-gradient(135deg,#f59e0b,#d97706); }
    .filter-btn--telegram{ border-color: #2481cc; color: #2481cc; }
    .filter-btn--telegram.active{ background: linear-gradient(135deg,#2481cc,#1a6db8); }
    .filter-btn--review  { border-color: #d97706; color: #d97706; }
    .filter-btn--review.active  { background: linear-gradient(135deg,#f59e0b,#d97706); }
  `]
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  storeId!: number;
  loading = true;
  /** Aktiver Filter: Status oder spezielle Filter-Modi */
  statusFilter: 'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'INACTIVE' | 'TELEGRAM' | 'REVIEW' = 'ALL';
  headerActions: HeaderAction[] = [];


  get hasTelegramProducts(): boolean {
    return this.products.some(p => !!p.telegramSource);
  }
  get telegramCount(): number {
    return this.products.filter(p => !!p.telegramSource).length;
  }
  get priceReviewCount(): number {
    return this.products.filter(p => p.priceNeedsReview).length;
  }

  countByStatus(status: string): number {
    return this.products.filter(p => p.status === status).length;
  }

  setStatusFilter(mode: typeof this.statusFilter): void {
    this.statusFilter = mode;
    this.applyFilter();
  }


  private applyFilter(): void {
    switch (this.statusFilter) {
      case 'TELEGRAM':
        this.filteredProducts = this.products.filter(p => !!p.telegramSource);
        break;
      case 'REVIEW':
        this.filteredProducts = this.products.filter(p => p.priceNeedsReview);
        break;
      case 'ALL':
        this.filteredProducts = [...this.products];
        break;
      default:
        this.filteredProducts = this.products.filter(p => p.status === this.statusFilter);
    }
  }

  // Bulk-State
  selectedProducts: Product[] = [];
  bulkMsg = '';
  bulkError = false;
  private _bulkToastTimer: any;

  private t(key: string): string {
    return this.translationService.translate(key);
  }

  // Spalten-Konfiguration – als Getter für reaktive Übersetzungen
  get columns(): ColumnConfig[] {
    return [
      { key: 'primaryImageUrl', label: this.t('productList.colImage'), type: 'image', width: '80px', hideOnMobile: true },
      {
        key: 'title', label: this.t('productList.colName'), type: 'text', mobileLabel: this.t('productList.colName'), sortable: true,
        formatFn: (value, item) => {
          let label = value + (item.isFeatured ? ' ⭐' : '');
          if (item.telegramSource) label = '📡 ' + label;
          if (item.priceNeedsReview) label = label + ' ⚠️';
          return label;
        }
      },
      {
        key: 'categoryName', label: this.t('productList.colCategory'), type: 'text', mobileLabel: this.t('productList.colCategory'), sortable: true,
        formatFn: (value, item) => value || item.category?.name || '-'
      },
      { key: 'basePrice', label: this.t('productList.colPrice'), type: 'currency', mobileLabel: this.t('productList.colPrice'), sortable: true },
      {
        key: 'status', label: this.t('productList.colStatus'), type: 'badge', mobileLabel: this.t('productList.colStatus'),
        formatFn: (value) => this.getStatusLabel(value),
        badgeClass: (value) => `status-${value?.toLowerCase()}`
      }
    ];
  }

  // Einzel-Aktionen – als Getter für reaktive Übersetzungen
  get actions(): ActionConfig[] {
    return [
      { icon: '✏️', label: this.t('productList.actionEdit'), handler: (p) => this.editProduct(p.id) },
      { icon: '🗑️', label: this.t('productList.actionDelete'), class: 'danger', handler: (p) => this.deleteProduct(p) }
    ];
  }

  // Bulk-Aktionen – als Getter für reaktive Übersetzungen
  get bulkActions(): BulkActionConfig[] {
    return [
      { icon: '🟢', label: this.t('productList.bulkActivate'), handler: (items) => this.bulkSetStatus(items, 'ACTIVE') },
      { icon: '📝', label: this.t('productList.bulkSetDraft'), handler: (items) => this.bulkSetStatus(items, 'DRAFT') },
      { icon: '🗄️', label: this.t('productList.bulkArchive'), handler: (items) => this.bulkSetStatus(items, 'ARCHIVED') },
      { icon: '🗑️', label: this.t('productList.bulkDelete'), class: 'danger', handler: (items) => this.bulkDeleteProducts(items) }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private fabService: FabService,
    private translationService: TranslationService
  ) {}

  ngOnDestroy(): void {
    this.fabService.clear();
    if (this._bulkToastTimer) clearTimeout(this._bulkToastTimer);
  }

  ngOnInit(): void {
    // Mehrstufige StoreId Extraktion
    let storeIdParam = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');

    if (!storeIdParam && this.route.parent) {
      storeIdParam = this.route.parent.snapshot.paramMap.get('id') || this.route.parent.snapshot.paramMap.get('storeId');
    }

    if (storeIdParam) {
      this.storeId = Number(storeIdParam);
    } else {
      // Fallback: Aus URL extrahieren
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
      }
    }

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', storeIdParam);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID geladen:', this.storeId);
    this.loadProducts();

    // FAB: Produkt hinzufügen
    this.fabService.register({
      icon: '＋',
      label: this.t('productList.fabLabel'),
      color: 'green',
      action: () => this.createProduct(),
      speedDial: [
        { icon: '📦', label: this.t('productList.fabNewProduct'), action: () => this.createProduct(), color: '#48bb78' },
        //{ icon: '🤖', label: 'KI-Vorschlag', action: () => this.router.navigate([this.getStoreBasePath(), 'products', 'ai-suggest']), color: '#764ba2' },
        { icon: '📂', label: this.t('productList.fabCreateCategory'), action: () => this.router.navigate([this.getStoreBasePath(), 'categories', 'new']), color: '#4299e1' },
      ]
    });
  }

  onSelectionChange(selected: Product[]): void {
    this.selectedProducts = selected;
  }

  bulkSetStatus(items: Product[], status: string): void {
    if (!items.length) return;
    const ids = items.map(p => p.id);
    const label = this.getStatusLabel(status);
    this.productService.bulkUpdateStatus(this.storeId, ids, status).subscribe({
      next: () => {
        this.showToast(`✅ ${ids.length} Produkte → ${label}`, false);
        this.loadProducts();
      },
      error: () => this.showToast(`❌ Status-Änderung fehlgeschlagen`, true)
    });
  }

  bulkDeleteProducts(items: Product[]): void {
    if (!items.length) return;
    if (!confirm(`${items.length} Produkte wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    const ids = items.map(p => p.id);
    this.productService.bulkDelete(this.storeId, ids).subscribe({
      next: () => {
        this.showToast(`✅ ${ids.length} Produkte gelöscht`, false);
        this.loadProducts();
      },
      error: () => this.showToast(`❌ Löschen fehlgeschlagen`, true)
    });
  }

  private showToast(msg: string, error: boolean): void {
    this.bulkMsg = msg;
    this.bulkError = error;
    if (this._bulkToastTimer) clearTimeout(this._bulkToastTimer);
    this._bulkToastTimer = setTimeout(() => { this.bulkMsg = ''; }, 3500);
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts(this.storeId).subscribe({
      next: (products) => {
        this.products = products.map(p => ({
          ...p,
          primaryImageUrl: this.getProductImage(p) || undefined
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('خطأ في تحميل المنتجات:', error);
        this.loading = false;
      }
    });
  }

  createProduct(): void {
    this.router.navigate([this.getStoreBasePath(), 'products', 'new']);
  }

  editProduct(productId: number): void {
    this.router.navigate([this.getStoreBasePath(), 'products', productId, 'edit']);
  }

  /** Gibt den kanonischen Basis-Pfad für den aktuellen Store zurück. */
  private getStoreBasePath(): string {
    // /dashboard/stores/... wird vom dashboardStoresRedirectGuard automatisch
    // auf /stores/... umgeleitet, daher gibt es nur noch eine Quelle der Wahrheit.
    return `/stores/${this.storeId}`;
  }

  deleteProduct(product: Product): void {
    if (confirm(`Produkt "${product.title}" wirklich löschen?`)) {
      this.productService.deleteProduct(this.storeId, product.id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (error) => {
          console.error('خطأ في الحذف:', error);
        }
      });
    }
  }


  getStatusLabel(status: string): string {
    const keyMap: { [key: string]: string } = {
      'DRAFT':     'status.draft',
      'ACTIVE':    'status.active',
      'ARCHIVED':  'status.archived',
      'INACTIVE':  'status.inactive'
    };
    const key = keyMap[status];
    return key ? this.t(key) : status;
  }

  getProductImage(product: Product): string | undefined {
    // 1. Versuche primaryImageUrl
    if (product.primaryImageUrl) {
      return product.primaryImageUrl;
    }

    // 2. Versuche das erste Bild aus dem media-Array
    if (product.media && product.media.length > 0) {
      // Suche nach isPrimary = true
      const primaryMedia = product.media.find((m: any) => m.isPrimary);
      if (primaryMedia?.url) {
        return primaryMedia.url;
      }
      // Sonst nimm das erste Bild
      if (product.media[0]?.url) {
        return product.media[0].url;
      }
    }

    return undefined;
  }
}
