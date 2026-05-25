import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig, BulkActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { FabService } from '@app/core/services/fab.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, StoreNavigationComponent, TranslatePipe, ResponsiveDataListComponent],
  template: `
    <div class="product-list-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [currentPage]="'navigation.products' | translate">
      </app-store-navigation>

      <div class="header">
        <h1>{{ 'navigation.products' | translate }}</h1>
       
      </div>

      <!-- Responsive Data List -->
      <app-responsive-data-list
        [items]="products"
        [columns]="columns"
        [actions]="actions"
        [bulkActions]="bulkActions"
        [loading]="loading"
        [selectable]="true"
        [rowClickable]="true"
        [searchable]="true"
        searchPlaceholder="Produkt suchen..."
        [emptyMessage]="'storeDetail.noProducts' | translate"
        emptyIcon="📦"
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
  `]
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  storeId!: number;
  loading = true;

  // Bulk-State
  selectedProducts: Product[] = [];
  bulkMsg = '';
  bulkError = false;
  private _bulkToastTimer: any;

  // Spalten-Konfiguration für responsive-data-list
  columns: ColumnConfig[] = [
    { key: 'primaryImageUrl', label: 'Bild', type: 'image', width: '80px', hideOnMobile: true },
    {
      key: 'title', label: 'Name', type: 'text', mobileLabel: 'Produkt', sortable: true,
      formatFn: (value, item) => value + (item.isFeatured ? ' ⭐' : '')
    },
    {
      key: 'categoryName', label: 'Kategorie', type: 'text', mobileLabel: 'Kategorie', sortable: true,
      formatFn: (value, item) => value || item.category?.name || '-'
    },
    { key: 'basePrice', label: 'Preis', type: 'currency', mobileLabel: 'Preis', sortable: true },
    {
      key: 'status', label: 'Status', type: 'badge', mobileLabel: 'Status',
      formatFn: (value) => this.getStatusLabel(value),
      badgeClass: (value) => `status-${value?.toLowerCase()}`
    }
  ];

  // Einzel-Aktionen
  actions: ActionConfig[] = [
    { icon: '✏️', label: 'Bearbeiten', handler: (p) => this.editProduct(p.id) },
    { icon: '🗑️', label: 'Löschen', class: 'danger', handler: (p) => this.deleteProduct(p) }
  ];

  // Bulk-Aktionen (erscheinen in der lila Bulk-Bar)
  bulkActions: BulkActionConfig[] = [
    {
      icon: '🟢', label: 'Aktivieren',
      handler: (items) => this.bulkSetStatus(items, 'ACTIVE')
    },
    {
      icon: '📝', label: 'Als Entwurf',
      handler: (items) => this.bulkSetStatus(items, 'DRAFT')
    },
    {
      icon: '🗄️', label: 'Archivieren',
      handler: (items) => this.bulkSetStatus(items, 'ARCHIVED')
    },
    {
      icon: '🗑️', label: 'Löschen', class: 'danger',
      handler: (items) => this.bulkDeleteProducts(items)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private fabService: FabService
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
      label: 'Produkt hinzufügen',
      color: 'green',
      action: () => this.createProduct(),
      speedDial: [
        { icon: '📦', label: 'Neues Produkt', action: () => this.createProduct(), color: '#48bb78' },
        //{ icon: '🤖', label: 'KI-Vorschlag', action: () => this.router.navigate([this.getStoreBasePath(), 'products', 'ai-suggest']), color: '#764ba2' },
        { icon: '📂', label: 'Kategorie anlegen', action: () => this.router.navigate([this.getStoreBasePath(), 'categories', 'new']), color: '#4299e1' },
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
        // Stelle sicher, dass primaryImageUrl gesetzt ist
        this.products = products.map(p => ({
          ...p,
          primaryImageUrl: this.getProductImage(p) || undefined
        }));
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
    const labels: { [key: string]: string } = {
      'DRAFT': 'Entwurf',
      'ACTIVE': 'Aktiv',
      'ARCHIVED': 'Archiviert',
      'INACTIVE': 'Inaktiv'
    };
    return labels[status] || status;
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
