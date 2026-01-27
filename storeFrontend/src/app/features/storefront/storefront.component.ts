import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { ProductQuickViewComponent } from '@app/shared/components/product-quick-view.component';
import { FeaturedProductsComponent } from '@app/shared/components/featured-products.component';
import { TopBarComponent } from '@app/shared/components/top-bar/top-bar.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StorefrontHeaderComponent,
    StorefrontNavComponent,
    ProductCardComponent,
    ProductQuickViewComponent,
    FeaturedProductsComponent,
    TopBarComponent
  ],
  templateUrl: './storefront.component.html',
  styleUrls: ['./storefront.component.scss']
})
export class StorefrontComponent implements OnInit, OnDestroy {
  storeId!: number;
  store: PublicStore | null = null;
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = true;
  cartItemCount = 0;
  addingToCart = false;
  readonly ProductStatus = ProductStatus;

  // QuickView State
  quickViewOpen = false;
  quickViewProduct: Product | null = null;

  // FIXED: Subscription für Warenkorb-Updates
  private cartUpdateSubscription?: Subscription;

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

    // FIXED: Keine Session-ID mehr - JWT-basierte Authentifizierung
    console.log(`🛒 Store ${this.storeId} - JWT-basierte Authentifizierung aktiv`);

    this.loadTheme();
    this.loadStoreData();
    this.loadCartCount();

    // FIXED: Höre auf Warenkorb-Updates (z.B. nach Logout/Login)
    this.cartUpdateSubscription = this.cartService.cartUpdate$.subscribe(() => {
      console.log('🔄 Warenkorb-Update erkannt - lade Counter neu');
      this.loadCartCount();
    });
  }

  ngOnDestroy(): void {
    // FIXED: Cleanup Subscription
    if (this.cartUpdateSubscription) {
      this.cartUpdateSubscription.unsubscribe();
    }
  }

  loadTheme(): void {
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        if (theme) {
          console.log('✅ Theme geladen und wird angewendet:', theme.name);
          this.themeService.applyTheme(theme);
        } else {
          console.log('ℹ️ Kein Theme gefunden - verwende Standard-Theme');
        }
      },
      error: (error) => {
        console.warn('⚠️ Theme konnte nicht geladen werden - verwende Standard-Theme:', error);
        // Fehler beim Laden des Themes sollte den Shop nicht blockieren
        // Das Standard-Theme wird automatisch verwendet
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
    console.log('🔢 Lade Warenkorb-Anzahl für Store:', this.storeId);

    // FIXED: Verwende getCartItemCount() statt getCart() für bessere Performance
    this.cartService.getCartItemCount(this.storeId).subscribe({
      next: (count) => {
        this.cartItemCount = count;
        console.log('✅ Warenkorb-Anzahl geladen:', count, 'Artikel');
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden der Warenkorb-Anzahl:', error);
        this.cartItemCount = 0;
      }
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
    // FIXED: Kein sessionId mehr nötig
    this.addingToCart = true;

    this.cartService.addItem({
      storeId: this.storeId,
      productId: product.id,
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

  // QuickView Methoden
  openQuickView(product: Product): void {
    console.log('👁️ Öffne QuickView für:', product.title);
    this.quickViewProduct = product;
    this.quickViewOpen = true;
  }

  closeQuickView(): void {
    console.log('❌ Schließe QuickView');
    this.quickViewOpen = false;
    this.quickViewProduct = null;
  }

  onQuickViewAddToCart(event: { product: Product; quantity: number; variant?: any }): void {
    console.log('🛒 Füge aus QuickView zum Warenkorb hinzu:', event);

    this.cartService.addItem({
      storeId: this.storeId,
      productId: event.product.id,
      quantity: event.quantity
    }).subscribe({
      next: () => {
        console.log('✅ Produkt erfolgreich zum Warenkorb hinzugefügt');
        this.loadCartCount();
        // Zeige kurz eine Bestätigung
        alert(`${event.quantity}x ${event.product.title} wurde zum Warenkorb hinzugefügt!`);
      },
      error: (error) => {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
        alert('Fehler beim Hinzufügen zum Warenkorb. Bitte versuchen Sie es erneut.');
      }
    });
  }

  onQuickViewDetails(product: Product): void {
    console.log('📄 Navigiere zu Produktdetails:', product.id);
    this.router.navigate(['/products', product.id]);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
