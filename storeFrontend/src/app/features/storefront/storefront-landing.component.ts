import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubdomainService } from '@app/core/services/subdomain.service';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { CartService } from '@app/core/services/cart.service';
import { ThemeService } from '@app/core/services/theme.service';
import { Product, Category } from '@app/core/models';
import { StorefrontHeaderComponent } from './storefront-header.component';
import { StorefrontNavComponent } from './storefront-nav.component';
import { ProductCardComponent } from './product-card.component';
import { StoreNotFoundComponent } from './store-not-found.component';

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
    StorefrontNavComponent,
    ProductCardComponent,
    StoreNotFoundComponent
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
  storeNotFound = false;  // NEUE: Flag für "Store nicht gefunden"
  isReservedSlug = false;  // NEUE: Flag für reservierte Slugs

  constructor(
    private subdomainService: SubdomainService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private themeService: ThemeService,
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

          // Lade Theme, Produkte und Kategorien
          this.loadTheme();
          this.loadStoreData();
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

    Promise.all([this.loadProducts(), this.loadCategories()])
      .then(() => {
        this.loading = false;
        console.log('✅ Alle Store-Daten geladen');
        console.log(`📊 Summary: ${this.products.length} Produkte, ${this.categories.length} Kategorien`);
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
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Produkte:', error);
          console.error('Error details:', error.status, error.statusText);
          this.products = [];  // Explizit leeres Array setzen
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

  loadCartCount(): void {
    if (!this.storeId) {
      console.warn('⚠️ Keine Store-ID vorhanden, überspringe Cart-Count');
      return;
    }

    console.log('🔄 Lade Warenkorb-Count für Store', this.storeId);
    this.cartService.getCartItemCount(this.storeId).subscribe({
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
    if (category) {
      console.log('🏷️ Filter nach Kategorie:', category.name);
      // Filter-Logik hier implementieren
      // TODO: Produkte nach Kategorie filtern
    } else {
      console.log('🏷️ Filter zurückgesetzt - zeige alle Produkte');
      // TODO: Alle Produkte anzeigen
    }
  }

  scrollToProducts(): void {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
