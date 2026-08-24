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
import { FilterBarComponent, FilterChip } from '@app/shared/components/filter-bar/filter-bar.component';
import { FabService } from '@app/core/services/fab.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, StoreNavigationComponent, TranslatePipe, ResponsiveDataListComponent, PageHeaderComponent, FilterBarComponent],
  template: `
    <div class="product-list-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [currentPage]="'navigation.products' | translate">
      </app-store-navigation>

      <app-page-header
        [title]="'navigation.products' | translate"
        [showBackButton]="false"
        [actions]="headerActions">
      </app-page-header>

      <!-- Filter-Leiste (Shared Component) -->
      <app-filter-bar
        [chips]="filterChips"
        [activeValue]="statusFilter"
        (filterChange)="setStatusFilter($event)">
      </app-filter-bar>

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
      padding: var(--space-8, 2rem);
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8, 2rem);
    }

    .header h1 {
      margin: 0;
      color: var(--theme-text, #1e293b);
      font-size: var(--theme-font-size-xxl, 1.875rem);
    }

    .btn-primary {
      background: var(--theme-primary, #667eea);
      color: var(--theme-primary-contrast, white);
      border: none;
      padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
      border-radius: var(--radius-md, 8px);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-sm);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
      opacity: 0.95;
    }

    @media (max-width: 768px) {
      .product-list-container { padding: var(--space-4, 1rem); }
      .header { flex-direction: column; align-items: stretch; gap: var(--space-4, 1rem); }
      .btn-primary { width: 100%; }
    }

    .bulk-toast {
      position: fixed;
      bottom: var(--space-8, 2rem);
      left: 50%;
      transform: translateX(-50%);
      background: var(--theme-success, #16a34a);
      color: var(--theme-success-contrast, #fff);
      padding: var(--space-3, 12px) var(--space-6, 24px);
      border-radius: var(--radius-md, 8px);
      font-size: var(--theme-font-size-sm, 0.875rem);
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: toast-in 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .bulk-toast--error {
      background: var(--theme-error, #dc2626);
      color: var(--theme-error-contrast, #fff);
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
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

  /** Filter-Chips für FilterBarComponent (reaktiv) */
  get filterChips(): FilterChip[] {
    return [
      {
        value: 'ALL',
        label: this.t('productList.filterAll'),
        icon: '📦',
        count: this.products.length
      },
      {
        value: 'ACTIVE',
        label: this.t('productList.filterActive'),
        icon: '🟢',
        count: this.countByStatus('ACTIVE'),
        variant: 'filter-chip--variant-success'
      },
      {
        value: 'DRAFT',
        label: this.t('productList.filterDraft'),
        icon: '📝',
        count: this.countByStatus('DRAFT'),
        variant: 'filter-chip--variant-subdued'
      },
      {
        value: 'ARCHIVED',
        label: this.t('productList.filterArchived'),
        icon: '🗄️',
        count: this.countByStatus('ARCHIVED'),
        variant: 'filter-chip--variant-warning'
      },
      {
        value: 'TELEGRAM',
        label: this.t('productList.filterTelegram'),
        icon: '📡',
        count: this.telegramCount,
        variant: 'filter-chip--variant-info',
        visible: this.hasTelegramProducts
      },
      {
        value: 'REVIEW',
        label: this.t('productList.filterPriceReview'),
        icon: '⚠️',
        count: this.priceReviewCount,
        variant: 'filter-chip--variant-warning',
        visible: this.priceReviewCount > 0
      }
    ];
  }


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

  setStatusFilter(mode: string): void {
    this.statusFilter = mode as typeof this.statusFilter;
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
