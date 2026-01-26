import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, StoreNavigationComponent, TranslatePipe],
  template: `
    <div class="product-list-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [storeId]="storeId" 
        [currentPage]="'navigation.products' | translate">
      </app-store-navigation>

      <div class="header">
        <h1>{{ 'navigation.products' | translate }}</h1>
        <button class="btn-primary" (click)="createProduct()">
          + {{ 'product.new' | translate }}
        </button>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ 'loading.products' | translate }}</p>
      </div>

      <div *ngIf="!loading && products.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>{{ 'product.noProducts' | translate }}</h2>
        <p>{{ 'product.noProductsDesc' | translate }}</p>
        <button class="btn-primary" (click)="createProduct()">
          {{ 'product.create' | translate }}
        </button>
      </div>

      <div *ngIf="!loading && products.length > 0" class="products-table">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Bild</th>
              <th>{{ 'product.name' | translate }}</th>
              <th>{{ 'product.category' | translate }}</th>
              <th>{{ 'product.description' | translate }}</th>
              <th>{{ 'product.price' | translate }}</th>
              <th>{{ 'product.status' | translate }}</th>
              <th>{{ 'common.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products">
              <td>
                <div class="product-image-cell">
                  <img *ngIf="getProductImage(product)" 
                       [src]="getProductImage(product)" 
                       [alt]="product.title"
                       class="product-thumbnail"
                       (error)="onImageError($event)">
                  <div *ngIf="!getProductImage(product)" class="product-thumbnail-placeholder">
                    📷
                  </div>
                  <span *ngIf="hasMultipleImages(product)" class="thumbnail-badge">
                    +{{ getImageCount(product) - 1 }}
                  </span>
                </div>
              </td>
              <td>
                <div class="product-name">{{ product.title }}</div>
              </td>
              <td>
                <div class="product-category">
                  {{ product.categoryName || product.category?.name || '-' }}
                </div>
              </td>
              <td>
                <div class="product-desc">{{ product.description }}</div>
              </td>
              <td>
                <div class="product-price">{{ product.basePrice | number:'1.2-2' }} €</div>
              </td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + product.status.toLowerCase()">
                  {{ getStatusLabel(product.status) }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn-action" (click)="editProduct(product.id)" [title]="'common.edit' | translate">
                    ✏️
                  </button>
                  <button class="btn-action btn-delete" (click)="deleteProduct(product)" [title]="'common.delete' | translate">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .products-table {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8f9fa;
    }

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e9ecef;
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    .product-name {
      font-weight: 600;
      color: #333;
    }

    .product-category {
      color: #666;
      font-size: 0.875rem;
    }

    .product-desc {
      color: #666;
      font-size: 0.875rem;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .product-price {
      font-weight: 600;
      color: #667eea;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-draft {
      background: #fff3cd;
      color: #856404;
    }

    .status-archived {
      background: #f8d7da;
      color: #721c24;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-action {
      background: white;
      border: 1px solid #e0e0e0;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
    }

    .btn-action:hover {
      background: #f8f9fa;
      border-color: #667eea;
    }

    .btn-delete:hover {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .product-image-cell {
      position: relative;
      width: 80px;
      height: 80px;
      overflow: hidden;
      border-radius: 8px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-thumbnail {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }

    .product-thumbnail-placeholder {
      font-size: 1.5rem;
      color: #ccc;
      line-height: 80px;
      text-align: center;
    }

    .thumbnail-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
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

      .products-table {
        overflow-x: auto;
      }

      table {
        min-width: 600px;
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  storeId!: number;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    const storeIdParam = this.route.snapshot.paramMap.get('storeId');
    this.storeId = storeIdParam ? Number(storeIdParam) : 0;

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
        this.products = products;
        this.loading = false;
      },
      error: (error) => {
        console.error('خطأ في تحميل المنتجات:', error);
        this.loading = false;
      }
    });
  }

  createProduct(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'products', 'new']);
  }

  editProduct(productId: number): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'products', productId, 'edit']);
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

  getProductImage(product: Product): string | null {
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

    return null;
  }

  hasMultipleImages(product: Product): boolean {
    return !!(product.media && product.media.length > 1);
  }

  getImageCount(product: Product): number {
    return product.media?.length || 0;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
