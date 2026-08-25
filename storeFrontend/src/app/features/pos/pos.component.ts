import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { PosCartService } from '@app/core/services/pos-cart.service';
import { Product, Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, BarcodeInputComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  public posCart = inject(PosCartService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  storeId!: number;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  selectedCategoryId: number | null = null;
  searchQuery = '';
  barcodeInput = '';
  loading = signal(false);
  showMobileCart = signal(false);
  barcodeNotFound = signal(false);

  cartItems$ = this.posCart.items$;
  cartTotal$ = this.posCart.cartTotal$;
  cartTaxTotal$ = this.posCart.cartTaxTotal$;
  itemCount$ = this.posCart.itemCount$;

  ngOnInit(): void {
    this.extractStoreId();
    this.setupSearch();
    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractStoreId(): void {
    const id = this.route.snapshot.paramMap.get('storeId') || this.route.parent?.snapshot.paramMap.get('id');
    this.storeId = id ? parseInt(id, 10) : 0;
  }

  private setupSearch(): void {
    this.searchSubject.pipe(debounceTime(100), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => this.applyFilters());
  }

  private loadCategories(): void {
    this.categoryService.getCategories(this.storeId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories.filter(c => !c.parentId); // Only root categories
        },
        error: () => {
          this.categories = [];
        }
      });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts(this.storeId, 'PUBLISHED').pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onCategorySelect(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.applyFilters();
  }

  private applyFilters(): void {
    let products = [...this.allProducts];

    // Category filter
    if (this.selectedCategoryId !== null) {
      products = products.filter(p => p.categoryId === this.selectedCategoryId);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p =>
        p.title?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
      );
    }

    this.filteredProducts = products;
  }

  private filterProducts(query: string): void {
    if (!query.trim()) {
      this.filteredProducts = this.allProducts;
      return;
    }
    const q = query.toLowerCase();
    this.filteredProducts = this.allProducts.filter(p =>
      p.title?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    );
  }

  onBarcodeScanned(barcode: string): void {
    if (!barcode?.trim()) return;
    const product = this.allProducts.find(p => p.barcode === barcode);
    if (product) {
      this.posCart.addProduct(product);
      this.barcodeNotFound.set(false);
      this.barcodeInput = ''; // Clear after successful scan
    } else {
      this.barcodeNotFound.set(true);
      setTimeout(() => this.barcodeNotFound.set(false), 3000);
      this.barcodeInput = ''; // Clear after failed scan
    }
  }

  onProductClick(product: Product): void {
    this.posCart.addProduct(product);
  }

  toggleMobileCart(): void {
    this.showMobileCart.update(v => !v);
  }

  trackByProductId(_: number, product: Product): number {
    return product.id;
  }

  trackByCategoryId(_: number, category: Category): number {
    return category.id;
  }

  getProductImage(product: Product): string {
    return product.primaryImageUrl || product.imageUrl || 'assets/images/product-placeholder.svg';
  }
}
