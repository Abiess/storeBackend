import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubdomainService } from '@app/core/services/subdomain.service';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { CartService } from '@app/core/services/cart.service';
import { ThemeService } from '@app/core/services/theme.service';
import { SliderService, SliderImage } from '@app/core/services/slider.service';
import { Product, Category } from '@app/core/models';
import { StorefrontHeaderComponent } from './storefront-header.component';
import { ProductCardComponent } from './product-card.component';
import { StoreNotFoundComponent } from './store-not-found.component';
import { ProductQuickViewComponent } from '@app/shared/components/product-quick-view.component';
import { ImageSliderComponent } from '@app/shared/components/image-slider.component';

/**
 * Dedizierte Storefront-Landing-Page für Subdomains (abc.markt.ma)
 * Diese Komponente wird automatisch geladen wenn ein User eine Store-Subdomain aufruft
 */
@Component({
  selector: 'app-storefront-landing',
  standalone: true,
  imports: [
    CommonModule,
    StorefrontHeaderComponent,
    ProductCardComponent,
    StoreNotFoundComponent,
    ProductQuickViewComponent,
    ImageSliderComponent
  ],
  templateUrl: './storefront-landing.component.html',
  styleUrls: ['./storefront-landing.component.scss']
})
export class StorefrontLandingComponent implements OnInit {
  storeId: number | null = null;
  storeName: string | null = null;
  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  cartItemCount = 0;
  storeNotFound = false;
  isReservedSlug = false;

  // NEUE: Featured Products Features
  featuredProducts: Product[] = [];
  topProducts: Product[] = [];
  newArrivals: Product[] = [];

  // NEUE: Quick View State
  quickViewProduct: Product | null = null;
  isQuickViewOpen = false;

  // ✨ NEUE: Filter State
  selectedCategory: Category | null = null;
  filteredProducts: Product[] = [];

  // ✨ NEUE: Slider State
  sliderImages: SliderImage[] = [];

  constructor(
    private subdomainService: SubdomainService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private themeService: ThemeService,
    private sliderService: SliderService,
    public router: Router  // public statt private für Template-Zugriff
  ) {}

  ngOnInit(): void {
    console.log('🏪 Storefront Landing: Initializing...');
    console.log('🌐 Current hostname:', window.location.hostname);

    // NEUE: Prüfe zuerst, ob der Slug reserviert ist
    const info = this.subdomainService.detectSubdomain();
    if (info.slug && this.subdomainService.isReservedSlug(info.slug)) {
      console.warn('⚠️ Reservierter Slug erkannt:', info.slug);
      this.isReservedSlug = true;
      this.storeNotFound = true;
      this.loading = false;
      return;
    }

    // Lade Store-Informationen basierend auf Subdomain
    this.subdomainService.resolveStore().subscribe({
      next: (info) => {
        console.log('✅ Store Info resolved:', info);

        if (info.isSubdomain && info.storeId) {
          this.storeId = info.storeId;
          this.storeName = info.storeName || `Store ${info.storeId}`;

          console.log('📋 Store Details:', {
            storeId: this.storeId,
            storeName: this.storeName
          });

          // FIXED: Lade Theme, Produkte und Kategorien
          this.loadTheme();
          this.loadStoreData();

          // FIXED: loadCartCount() wird ERST nach resolveStore() aufgerufen
          // damit die storeId im SubdomainService bereits gesetzt ist
          this.loadCartCount();
        } else if (info.isSubdomain && !info.storeId) {
          // NEUE: Subdomain erkannt, aber kein Store gefunden
          console.warn('⚠️ Subdomain erkannt, aber Store nicht gefunden');
          this.storeNotFound = true;
          this.loading = false;
        } else {
          console.error('❌ Keine gültige Subdomain');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden der Store-Informationen:', error);
        // NEUE: Bei Fehler "Store nicht gefunden" anzeigen
        this.storeNotFound = true;
        this.loading = false;
      }
    });
  }

  loadTheme(): void {
    if (!this.storeId) return;
    
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        if (theme) {
          console.log('🎨 Theme angewendet:', theme.name);
          this.themeService.applyTheme(theme);
        } else {
          console.log('🎨 Kein Theme gefunden, verwende Standard-Theme');
        }
      },
      error: (error) => {
        console.warn('⚠️ Theme konnte nicht geladen werden (nicht kritisch):', error);
      }
    });
  }

  loadStoreData(): void {
    this.loading = true;
    console.log('📦 Lade Store-Daten für Store ID:', this.storeId);

    Promise.all([
      this.loadProducts(),
      this.loadCategories(),
      this.loadFeaturedProducts(),
      this.loadTopProducts(),
      this.loadNewArrivals(),
      this.loadSliderImages()
    ])
      .then(() => {
        this.loading = false;
        console.log('✅ Alle Store-Daten geladen');
        console.log(`📊 Summary: ${this.products.length} Produkte, ${this.categories.length} Kategorien, ${this.sliderImages.length} Slider-Bilder`);
      })
      .catch((err) => {
        this.loading = false;
        console.error('❌ Fehler beim Laden der Store-Daten:', err);
      });
  }

  loadProducts(): Promise<void> {
    if (!this.storeId) {
      console.warn('⚠️ Keine Store-ID vorhanden, überspringe Produkte-Laden');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('🔄 Lade Produkte für Store', this.storeId);
      this.productService.getProducts(this.storeId!, 'ACTIVE').subscribe({
        next: (products) => {
          console.log('✅ Produkte geladen:', products.length);
          if (products.length > 0) {
            console.log('📦 Erste 3 Produkte:', products.slice(0, 3).map(p => p.name));
          }
          this.products = products;
          // ✨ Initialisiere filteredProducts mit allen Produkten
          this.filteredProducts = [...products];
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Produkte:', error);
          console.error('Error details:', error.status, error.statusText);
          this.products = [];
          this.filteredProducts = [];
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    if (!this.storeId) {
      console.warn('⚠️ Keine Store-ID vorhanden, überspringe Kategorien-Laden');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('🔄 Lade Kategorien für Store', this.storeId);
      this.categoryService.getCategories(this.storeId!).subscribe({
        next: (categories) => {
          console.log('✅ Kategorien geladen:', categories.length);
          if (categories.length > 0) {
            console.log('🏷️ Kategorien:', categories.map(c => c.name));
          }
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Kategorien:', error);
          console.error('Error details:', error.status, error.statusText);
          this.categories = [];  // Explizit leeres Array setzen
          resolve();
        }
      });
    });
  }

  // NEUE: Lade Featured Products
  loadFeaturedProducts(): Promise<void> {
    if (!this.storeId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('⭐ Lade Featured Products für Store', this.storeId);
      this.productService.getFeaturedProducts(this.storeId!).subscribe({
        next: (products) => {
          console.log('✅ Featured Products geladen:', products.length);
          this.featuredProducts = products;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Featured Products:', error);
          this.featuredProducts = [];
          resolve();
        }
      });
    });
  }

  // NEUE: Lade Top Products (Bestseller)
  loadTopProducts(): Promise<void> {
    if (!this.storeId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('🔥 Lade Top Products für Store', this.storeId);
      this.productService.getTopProducts(this.storeId!, 6).subscribe({
        next: (products) => {
          console.log('✅ Top Products geladen:', products.length);
          this.topProducts = products;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Top Products:', error);
          this.topProducts = [];
          resolve();
        }
      });
    });
  }

  // NEUE: Lade Neue Produkte
  loadNewArrivals(): Promise<void> {
    if (!this.storeId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('✨ Lade Neue Produkte für Store', this.storeId);
      this.productService.getNewArrivals(this.storeId!, 6).subscribe({
        next: (products) => {
          console.log('✅ Neue Produkte geladen:', products.length);
          this.newArrivals = products;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der neuen Produkte:', error);
          this.newArrivals = [];
          resolve();
        }
      });
    });
  }

  // ✨ NEUE: Lade Slider-Bilder
  loadSliderImages(): Promise<void> {
    if (!this.storeId) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      console.log('🖼️ Lade Slider-Bilder für Store', this.storeId);
      this.sliderService.getActiveSliderImages(this.storeId!).subscribe({
        next: (images) => {
          console.log('✅ Slider-Bilder geladen:', images.length);
          this.sliderImages = images;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Slider-Bilder:', error);
          this.sliderImages = [];
          resolve();
        }
      });
    });
  }

  // NEUE: Track Product View
  trackProductView(product: Product): void {
    if (!this.storeId) return;

    this.productService.trackProductView(this.storeId, product.id).subscribe({
      next: () => {
        console.log('👁️ Product view tracked:', product.title);
      },
      error: (error) => {
        console.warn('⚠️ Could not track view:', error);
      }
    });
  }

  loadCartCount(): void {
    if (!this.storeId) {
      console.warn('⚠️ Keine Store-ID vorhanden, überspringe Cart-Count');
      return;
    }

    console.log('🔄 Lade Warenkorb-Count für Store', this.storeId);
    this.cartService.getCartItemCount().subscribe({
      next: (count: number) => {
        console.log('✅ Cart Count geladen:', count);
        this.cartItemCount = count;
      },
      error: (error: any) => {
        console.error('❌ Fehler beim Laden des Warenkorb-Counts:', error);
        console.warn('💡 Fallback: Cart Count = 0');
        this.cartItemCount = 0;  // Explizit 0 setzen
      }
    });
  }

  addToCart(product: Product): void {
    if (!this.storeId) {
      console.error('❌ Keine Store-ID vorhanden');
      return;
    }

    // NEUE: Speichere Store-ID in localStorage für späteren Zugriff
    localStorage.setItem('last_store_id', this.storeId.toString());

    // FIXED: Robusteres Logging - verwende alle verfügbaren Felder
    const productName = product.title || product.name || product.description || `Produkt ${product.id}`;
    console.log('🛒 Füge Produkt zum Warenkorb hinzu:', productName);
    console.log('📋 Produkt-Details:', {
      id: product.id,
      storeId: this.storeId,
      title: product.title,
      name: product.name,
      fullProduct: product
    });

    this.cartService.addItem({
      storeId: this.storeId,
      productId: product.id,
      quantity: 1
    }).subscribe({
      next: (response) => {
        console.log('✅ Produkt erfolgreich hinzugefügt:', response);
        this.loadCartCount();
      },
      error: (error) => {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
      }
    });
  }

  filterByCategory(category: Category | null): void {
    this.selectedCategory = category;

    if (category) {
      console.log('🏷️ Filter nach Kategorie:', category.name, '(ID:', category.id, ')');

      // Filter Produkte nach Kategorie-ID
      this.filteredProducts = this.products.filter(product => {
        return product.categoryId === category.id;
      });

      console.log(`📊 Gefilterte Produkte: ${this.filteredProducts.length} von ${this.products.length}`);
    } else {
      console.log('🏷️ Filter zurückgesetzt - zeige alle Produkte');
      this.filteredProducts = [...this.products];
    }
  }

  scrollToProducts(): void {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // NEUE: Quick View Handlers
  openQuickView(product: Product): void {
    console.log('📱 Quick View öffnen für:', product.title);
    this.quickViewProduct = product;
    this.isQuickViewOpen = true;

    // Track product view
    this.trackProductView(product);

    // Disable body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeQuickView(): void {
    console.log('📱 Quick View schließen');
    this.isQuickViewOpen = false;
    this.quickViewProduct = null;

    // Re-enable body scroll
    document.body.style.overflow = '';
  }

  onQuickViewAddToCart(event: { product: Product; quantity: number; variant?: any }): void {
    console.log('🛒 Add to cart from Quick View:', event);

    if (!this.storeId) {
      console.error('❌ Keine Store-ID vorhanden');
      return;
    }

    this.cartService.addItem({
      storeId: this.storeId,
      productId: event.product.id,
      variantId: event.variant?.id,
      quantity: event.quantity
    }).subscribe({
      next: (response) => {
        console.log('✅ Produkt erfolgreich hinzugefügt:', response);
        this.loadCartCount();
      },
      error: (error) => {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
      }
    });
  }

  onQuickViewDetails(product: Product): void {
    console.log('👁️ Navigate to product details:', product.id);
    this.router.navigate(['/products', product.id]);
  }

  // Neue Methoden für verbessertes UI
  getProductCountForCategory(category: Category): number {
    return this.products.filter(p => p.categoryId === category.id).length;
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    console.log('🔄 Sort changed:', value);

    let sorted = [...this.filteredProducts];

    switch (value) {
      case 'price-asc':
        sorted.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      default: // relevant
        // Keep original order (featured/bestsellers first)
        break;
    }

    this.filteredProducts = sorted;
  }
}
