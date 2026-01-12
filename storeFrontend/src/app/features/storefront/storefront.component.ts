import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { CartService } from '@app/core/services/cart.service';
import { ThemeService } from '@app/core/services/theme.service';
import { Product, Category, PublicStore, ProductStatus } from '@app/core/models';
import { StorefrontHeaderComponent } from './storefront-header.component';
import { StorefrontNavComponent } from './storefront-nav.component';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StorefrontHeaderComponent,
    StorefrontNavComponent,
    ProductCardComponent
  ],
  templateUrl: './storefront.component.html',
  styleUrls: ['./storefront.component.scss']
})
export class StorefrontComponent implements OnInit {
  storeId!: number;
  store: PublicStore | null = null;
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = true;
  cartItemCount = 0;
  sessionId = '';
  addingToCart = false;
  readonly ProductStatus = ProductStatus;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
    private cartService: CartService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    console.log('🏪 Storefront: Loading store with ID:', this.storeId);
    console.log('🏪 Route params:', this.route.snapshot.paramMap);

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Invalid store ID:', this.route.snapshot.paramMap.get('id'));
      this.storeId = 1; // Fallback
    }

    // Verwende store-spezifische Session-ID
    this.sessionId = this.cartService.getOrCreateStoreSessionId(this.storeId);
    console.log(`🛒 Session-ID für Store ${this.storeId}: ${this.sessionId}`);

    this.loadTheme();
    this.loadStoreData();
    this.loadCartCount();
  }

  loadTheme(): void {
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        if (theme) {
          console.log('Theme wird angewendet:', theme.name);
          this.themeService.applyTheme(theme);
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden des Themes:', error);
      }
    });
  }

  loadStoreData(): void {
    this.loading = true;
    Promise.all([this.loadProducts(), this.loadCategories()])
      .then(() => { this.loading = false; })
      .catch(() => { this.loading = false; });
  }

  loadProducts(): Promise<void> {
    return new Promise((resolve) => {
      console.log('📦 Loading products for store:', this.storeId);
      this.productService.getProducts(this.storeId, 'ACTIVE').subscribe({
        next: (products) => {
          console.log('✅ Loaded', products.length, 'products for store', this.storeId);
          this.products = products;
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading products:', error);
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      console.log('📁 Loading categories for store:', this.storeId);
      this.categoryService.getCategories(this.storeId).subscribe({
        next: (categories) => {
          console.log('✅ Loaded', categories.length, 'categories for store', this.storeId);
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading categories:', error);
          resolve();
        }
      });
    });
  }

  loadCartCount(): void {
    this.cartService.getCart(this.sessionId).subscribe({
      next: (cart) => { this.cartItemCount = cart.itemCount; },
      error: (error) => { console.error('Fehler beim Laden des Warenkorbs:', error); }
    });
  }

  selectCategory(category: Category | null): void {
    this.selectedCategory = category;
    console.log('📁 Category selected:', category?.name || 'Alle Produkte');
  }

  get filteredProducts(): Product[] {
    if (!this.selectedCategory) {
      console.log('📦 Showing all', this.products.length, 'products');
      return this.products;
    }

    // Filter products by category - hier müsste die Logik sein, aber Product hat kein categoryId
    // Für jetzt geben wir alle Produkte zurück
    console.log('📦 Showing all', this.products.length, 'products (category filter not implemented)');
    return this.products;
  }

  addToCart(product: Product): void {
    // Vereinfachte Logik: Direkt mit Produkt arbeiten, ohne Varianten
    this.addingToCart = true;

    this.cartService.addItem({
      sessionId: this.sessionId,
      storeId: this.storeId,
      productId: product.id, // Direkt Produkt-ID verwenden
      quantity: 1
    }).subscribe({
      next: () => {
        this.addingToCart = false;
        this.loadCartCount();
      },
      error: (error) => {
        this.addingToCart = false;
        console.error('Fehler beim Hinzufuegen zum Warenkorb:', error);
      }
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
