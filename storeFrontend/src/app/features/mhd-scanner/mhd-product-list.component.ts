import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ProductService } from '@app/core/services/product.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-mhd-product-list',
    imports: [CommonModule, FormsModule, TranslatePipe, PageHeaderComponent],
    template: `
    <div class="mhd-product-list-container">
      <app-page-header
        title="Produkte mit Ablaufdatum"
        subtitle="Übersicht aller Produkte mit MHD"
        [showBackButton]="true"
      />

      <div class="content-card">
        <!-- Search -->
        <div class="product-search">
          <input 
            type="text" 
            class="search-input"
            placeholder="Produkte suchen..."
            [(ngModel)]="searchTerm"
            (input)="onSearchChange()"
          />
        </div>

        <!-- Loading -->
        <div *ngIf="isLoadingProducts" class="loading-spinner">
          <div class="spinner"></div>
          <p>Lade Produkte...</p>
        </div>

        <!-- Product List -->
        <div *ngIf="!isLoadingProducts && products.length > 0" class="product-list">
          <div 
            *ngFor="let product of products" 
            class="product-item"
            [class.expired]="isExpired(product)"
            [class.expiring-soon]="isExpiringSoon(product)"
          >
            <div class="product-header">
              <div class="product-name">{{ product.title }}</div>
              <div class="product-id">#{{ product.id }}</div>
            </div>
            <div class="product-details">
              <div class="detail-row">
                <span class="label">Ablaufdatum:</span>
                <span class="value">{{ formatExpiryDate(product.expiryDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Restzeit:</span>
                <span 
                  class="value" 
                  [class.expired-text]="isExpired(product)"
                  [class.warning-text]="isExpiringSoon(product)"
                >
                  {{ formatRemainingTime(product.expiryDate) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoadingProducts && products.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>Keine Produkte gefunden</h3>
          <p>{{ searchTerm ? 'Versuche einen anderen Suchbegriff' : 'Es sind noch keine Produkte mit Ablaufdatum vorhanden' }}</p>
        </div>

        <!-- Pagination -->
        <div *ngIf="!isLoadingProducts && totalPages > 1" class="pagination">
          <button 
            class="pagination-btn"
            [disabled]="currentPage === 0"
            (click)="previousPage()"
          >
            ← Zurück
          </button>
          <span class="page-info">
            Seite {{ currentPage + 1 }} von {{ totalPages }}
            <span class="total-count">({{ totalElements }} Produkte)</span>
          </span>
          <button 
            class="pagination-btn"
            [disabled]="currentPage >= totalPages - 1"
            (click)="nextPage()"
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .mhd-product-list-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .content-card {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .product-search {
      margin-bottom: 2rem;
    }

    .search-input {
      width: 100%;
      padding: 1rem 1.5rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.2s;
      background: #f9fafb;
    }

    .search-input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .loading-spinner {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .spinner {
      width: 50px;
      height: 50px;
      margin: 0 auto 1rem;
      border: 4px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .product-list {
      display: grid;
      gap: 1rem;
    }

    .product-item {
      background: white;
      padding: 1.5rem;
      border-radius: 10px;
      border-left: 5px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.2s;
    }

    .product-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    .product-item.expired {
      border-left-color: #ef4444;
      background: linear-gradient(to right, #fef2f2, white);
    }

    .product-item.expiring-soon {
      border-left-color: #f59e0b;
      background: linear-gradient(to right, #fffbeb, white);
    }

    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .product-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .product-id {
      font-size: 0.875rem;
      color: #9ca3af;
      font-family: 'Courier New', monospace;
      margin-left: 1rem;
    }

    .product-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9375rem;
    }

    .detail-row .label {
      font-weight: 500;
      color: #6b7280;
    }

    .detail-row .value {
      font-weight: 600;
      color: #1f2937;
    }

    .expired-text {
      color: #ef4444 !important;
    }

    .warning-text {
      color: #f59e0b !important;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #9ca3af;
      font-size: 1rem;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      margin-top: 2rem;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 10px;
    }

    .pagination-btn {
      padding: 0.75rem 1.5rem;
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      font-size: 0.9375rem;
    }

    .pagination-btn:hover:not(:disabled) {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: #d1d5db;
      color: #9ca3af;
    }

    .page-info {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #4b5563;
    }

    .total-count {
      font-weight: 400;
      color: #9ca3af;
      margin-left: 0.5rem;
    }

    @media (max-width: 768px) {
      .mhd-product-list-container {
        padding: 1rem;
      }

      .content-card {
        padding: 1rem;
      }

      .product-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .product-id {
        margin-left: 0;
        margin-top: 0.25rem;
      }

      .pagination {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .pagination-btn {
        min-width: 100px;
      }
    }
  `]
})
export class MhdProductListComponent implements OnInit {
  storeId: number | null = null;
  
  // Product list
  products: any[] = [];
  isLoadingProducts = false;
  searchTerm = '';
  searchSubject = new Subject<string>();
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {
    // Debounce search (300ms)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadProducts();
    });
  }

  ngOnInit(): void {
    // 3-stufige Store-ID Extraktion
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) {
        id = match[1];
      }
    }
    this.storeId = id ? +id : null;
    
    if (this.storeId) {
      this.loadProducts();
    }
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  loadProducts(): void {
    if (!this.storeId) return;
    
    this.isLoadingProducts = true;
    this.productService.getProductsForExpiryList(
      this.storeId,
      this.currentPage,
      this.pageSize,
      this.searchTerm
    ).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalPages = response.page?.totalPages || response.totalPages || 0;
        this.totalElements = response.page?.totalElements || response.totalElements || 0;
        this.isLoadingProducts = false;
        console.log('✅ Products loaded:', this.products.length);
      },
      error: (error) => {
        console.error('❌ Error loading products:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  formatExpiryDate(expiryDate: string | null): string {
    if (!expiryDate) return '--';
    
    const [year, month, day] = expiryDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatRemainingTime(expiryDate: string | null): string {
    if (!expiryDate) return '--';
    
    const [year, month, day] = expiryDate.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffMs = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return absDays === 1 ? 'Seit 1 Tag abgelaufen' : `Seit ${absDays} Tagen abgelaufen`;
    }
    
    if (diffDays === 0) return 'Heute fällig';
    if (diffDays === 1) return 'Noch 1 Tag';
    if (diffDays < 60) return `Noch ${diffDays} Tage`;
    
    const months = Math.floor(diffDays / 30);
    return months === 1 ? 'Noch 1 Monat' : `Noch ${months} Monate`;
  }

  isExpired(product: any): boolean {
    if (!product.expiryDate) return false;
    
    const [year, month, day] = product.expiryDate.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return expiry < today;
  }

  isExpiringSoon(product: any): boolean {
    if (!product.expiryDate) return false;
    
    const [year, month, day] = product.expiryDate.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffMs = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Expiring within 14 days
    return diffDays >= 0 && diffDays <= 14;
  }
}
