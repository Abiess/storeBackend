import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

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
        <button class="btn-primary" (click)="createProduct()">
          + {{ 'product.new' | translate }}
        </button>
      </div>

      <!-- Responsive Data List -->
      <app-responsive-data-list
        [items]="products"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [emptyMessage]="'storeDetail.noProducts' | translate"
        emptyIcon="📦">
      </app-responsive-data-list>
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
      .product-list-container {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .btn-primary {
        width: 100%;
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  storeId!: number;
  loading = true;

  // Spalten-Konfiguration für responsive-data-list
  columns: ColumnConfig[] = [
    {
      key: 'primaryImageUrl',
      label: 'Bild',
      type: 'image',
      width: '80px',
      hideOnMobile: true
    },
    {
      key: 'title',
      label: 'Name',
      type: 'text',
      mobileLabel: 'Produkt',
      formatFn: (value, item) => {
        const star = item.isFeatured ? ' ⭐' : '';
        return value + star;
      }
    },
    {
      key: 'categoryName',
      label: 'Kategorie',
      type: 'text',
      mobileLabel: 'Kategorie',
      formatFn: (value, item) => {
        return value || item.category?.name || '-';
      }
    },
    {
      key: 'basePrice',
      label: 'Preis',
      type: 'currency',
      mobileLabel: 'Preis'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      mobileLabel: 'Status',
      formatFn: (value) => this.getStatusLabel(value),
      badgeClass: (value) => `status-${value.toLowerCase()}`
    }
  ];

  // Action-Buttons
  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (product) => this.editProduct(product.id)
    },
    {
      icon: '🗑️',
      label: 'Löschen',
      class: 'danger',
      handler: (product) => this.deleteProduct(product)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

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

  /** Gibt den Basis-Pfad für den aktuellen Store zurück (/stores/:id oder /dashboard/stores/:id) */
  private getStoreBasePath(): string {
    const url = this.router.url;
    if (url.startsWith('/dashboard/')) {
      return `/dashboard/stores/${this.storeId}`;
    }
    return `/stores/${this.storeId}`;
  }

  deleteProduct(product: Product): void {
    if (confirm(`هل تريد حقاً حذف "${product.title}"؟`)) {
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
      'DRAFT': 'مسودة',
      'ACTIVE': 'نشط',
      'ARCHIVED': 'مؤرشف'
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
