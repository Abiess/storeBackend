import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { CartService } from '@app/core/services/cart.service';
import { ThemeService } from '@app/core/services/theme.service';
import { ThemeApplierService } from '@app/core/services/theme-applier.service';
import { HomepageSectionService } from '@app/core/services/homepage-section.service';
import { Product, Category, PublicStore, ProductStatus, HomepageSection } from '@app/core/models';
import { StorefrontHeaderComponent } from './storefront-header.component';
import { StorefrontNavComponent } from './storefront-nav.component';
import { ProductCardComponent } from './product-card.component';
import { ProductQuickViewComponent } from '@app/shared/components/product-quick-view.component';
import { FeaturedProductsComponent } from '@app/shared/components/featured-products.component';
import { TopBarComponent } from '@app/shared/components/top-bar/top-bar.component';
import { StoreSliderViewerComponent } from './components/store-slider-viewer.component';
// NEW: Import moderne Layout-Komponenten
import { StoreLayoutComponent } from './components/store-layout.component';
import { StoreSidebarComponent } from './components/store-sidebar.component';
import { ProductGridComponent } from './components/product-grid.component';
import { ModernProductCardComponent } from './components/modern-product-card.component';
import { ModernStoreHeaderComponent } from './components/modern-store-header.component';
import { HomepageSectionRendererComponent } from './homepage-section-renderer.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
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
    TopBarComponent,
    StoreSliderViewerComponent,
    // NEW: Moderne Layout-Komponenten
    StoreLayoutComponent,
    StoreSidebarComponent,
    ProductGridComponent,
    ModernProductCardComponent,
    ModernStoreHeaderComponent,
    HomepageSectionRendererComponent,
    TranslatePipe
  ],
  templateUrl: './storefront.component.html',
  styleUrls: ['./storefront.component.scss']
})
export class StorefrontComponent implements OnInit, OnDestroy {
  storeId!: number;
  store: PublicStore | null = null;
  storeLogo: string | null = null;
  products: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  loading = true;
  cartItemCount = 0;
  addingToCart = false;
  readonly ProductStatus = ProductStatus;

  // Homepage Sections
  homepageSections: HomepageSection[] = [];

  // QuickView State
  quickViewOpen = false;
  quickViewProduct: Product | null = null;

  // FIXED: Subscription für Warenkorb-Updates
  private cartUpdateSubscription?: Subscription;

  // NEW: Für Suchfunktion
  searchQuery = '';

  // NEW: Aktuelles Jahr für Footer
  readonly currentYear = new Date().getFullYear();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
    private cartService: CartService,
    private themeService: ThemeService,
    private themeApplier: ThemeApplierService,
    private homepageSectionService: HomepageSectionService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Unterstütze beide Parameternamen: 'storeId' und 'id'
    const storeIdParam = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    this.storeId = Number(storeIdParam);

    console.log('🏪 Storefront: Loading store with ID:', this.storeId);
    console.log('🏪 Route params:', this.route.snapshot.paramMap);

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Invalid store ID:', storeIdParam);
      this.storeId = 1; // Fallback
    }

    // FIXED: Keine Session-ID mehr - JWT-basierte Authentifizierung
    console.log(`🛒 Store ${this.storeId} - JWT-basierte Authentifizierung aktiv`);

    this.loadTheme();
    this.loadStoreData();
    this.loadCartCount();
    this.loadHomepageSections();

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
          // Apply theme colors to document root as CSS variables
          this.themeApplier.applyTheme(theme.colors, theme.typography.fontFamily);

          // Set logo if available
          if (theme.logoUrl) {
            this.storeLogo = theme.logoUrl;
            console.log('✅ Logo geladen:', theme.logoUrl);
          }
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

    // FIXED: getCartItemCount() nimmt keine Parameter (verwendet JWT für storeId)
    this.cartService.getCartItemCount().subscribe({
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

  loadHomepageSections(): void {
    this.homepageSectionService.getActiveSections(this.storeId).subscribe({
      next: (sections) => {
        this.homepageSections = sections;
        console.log('✅ Loaded', sections.length, 'homepage sections');
      },
      error: (error) => {
        console.warn('⚠️ Error loading homepage sections:', error);
        this.homepageSections = [];
      }
    });
  }

  selectCategory(category: Category | null): void {
    this.selectedCategory = category;
    this.searchQuery = '';
    console.log('📁 Category selected:', category?.name || 'Alle Produkte');
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
  }

  get displayedProducts(): Product[] {
    let products = this.filteredProducts;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return products;
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
        alert(this.translationService.translate('storefront.addedToCart', { count: event.quantity, name: event.product.title }));
      },
      error: (error) => {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
        alert(this.translationService.translate('storefront.addToCartError'));
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
