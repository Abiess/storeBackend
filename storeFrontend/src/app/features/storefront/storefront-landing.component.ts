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
    ProductCardComponent
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
  sessionId = '';

  constructor(
    private subdomainService: SubdomainService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🏪 Storefront Landing: Initializing...');
    
    // Lade Store-Informationen basierend auf Subdomain
    this.subdomainService.resolveStore().subscribe({
      next: (info) => {
        console.log('✅ Store Info:', info);
        
        if (info.isSubdomain && info.storeId) {
          this.storeId = info.storeId;
          this.storeName = info.storeName;
          this.sessionId = this.cartService.getOrCreateSessionId();
          
          // Lade Theme, Produkte und Kategorien
          this.loadTheme();
          this.loadStoreData();
          this.loadCartCount();
        } else {
          console.error('❌ Keine gültige Subdomain oder Store nicht gefunden');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden der Store-Informationen:', error);
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
        }
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden des Themes:', error);
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
    if (!this.storeId) return Promise.resolve();
    
    return new Promise((resolve) => {
      this.productService.getProducts(this.storeId!, 'ACTIVE').subscribe({
        next: (products) => {
          console.log('✅ Produkte geladen:', products.length);
          this.products = products;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Produkte:', error);
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    if (!this.storeId) return Promise.resolve();
    
    return new Promise((resolve) => {
      this.categoryService.getCategories(this.storeId!).subscribe({
        next: (categories) => {
          console.log('✅ Kategorien geladen:', categories.length);
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('❌ Fehler beim Laden der Kategorien:', error);
          resolve();
        }
      });
    });
  }

  loadCartCount(): void {
    if (!this.storeId) return;
    
    this.cartService.getCartItemCount(this.storeId, this.sessionId).subscribe({
      next: (count) => {
        this.cartItemCount = count;
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden des Warenkorbs:', error);
      }
    });
  }

  addToCart(product: Product): void {
    if (!this.storeId) return;
    
    console.log('🛒 Füge Produkt zum Warenkorb hinzu:', product.name);
    // Cart-Logik hier implementieren
  }

  filterByCategory(category: Category): void {
    console.log('🏷️ Filter nach Kategorie:', category.name);
    // Filter-Logik hier implementieren
  }

  scrollToProducts(): void {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
