import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { SubdomainService } from '@app/core/services/subdomain.service';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { CartService } from '@app/core/services/cart.service';
import { ThemeService } from '@app/core/services/theme.service';
import { SliderService, SliderImage } from '@app/core/services/slider.service';
import { PublicApiService } from '@app/core/services/public-api.service';
import { WhatsappConfigService } from '@app/core/services/whatsapp-config.service';
import { SeoApiService } from '@app/core/services/seo-api.service';
import { SeoMetaService } from '@app/core/services/seo-meta.service';
import { Product, Category } from '@app/core/models';
import { StorefrontHeaderComponent } from './storefront-header.component';
import { StorefrontBottomNavComponent } from './storefront-bottom-nav.component';
import { ProductCardComponent } from './product-card.component';
import { StoreNotFoundComponent } from './store-not-found.component';
import { ProductQuickViewComponent } from '@app/shared/components/product-quick-view.component';
import { ImageSliderComponent } from '@app/shared/components/image-slider.component';
import { ClassicShopLayoutComponent } from './components/classic-shop-layout.component';
import { ElectronicsProLayoutComponent } from './components/electronics-pro-layout.component';
import { FashionEditorialLayoutComponent } from './components/fashion-editorial-layout.component';
import { PromoBannerComponent } from '@app/shared/components/promo-banner/promo-banner.component';
import { ProductGridClassicComponent } from './components/product-grid-classic.component';
import { ProductGridFashionComponent } from './components/product-grid-fashion.component';
import { ProductGridCompactComponent } from './components/product-grid-compact.component';
import { ProductGridMarketplaceComponent } from './components/product-grid-marketplace.component';
import { RestaurantWarmLayoutComponent } from './components/restaurant-warm-layout.component';

/**
 * Dedizierte Storefront-Landing-Page für Subdomains (abc.markt.ma)
 * Diese Komponente wird automatisch geladen wenn ein User eine Store-Subdomain aufruft
 */
@Component({
  selector: 'app-storefront-landing',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    StorefrontHeaderComponent,
    StorefrontBottomNavComponent,
    ProductCardComponent,
    StoreNotFoundComponent,
    ProductQuickViewComponent,
    ImageSliderComponent,
    ClassicShopLayoutComponent,
    ElectronicsProLayoutComponent,
    FashionEditorialLayoutComponent,
    PromoBannerComponent,
    ProductGridClassicComponent,
    ProductGridFashionComponent,
    ProductGridCompactComponent,
    ProductGridMarketplaceComponent,
    RestaurantWarmLayoutComponent
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

  // œ NEUE: Filter State
  selectedCategory: Category | null = null;
  filteredProducts: Product[] = [];

  /** Mobile Bottom-Nav State */
  bottomNavCategoryActive = false;
  bottomNavSearchActive = false;

  // ✨ NEUE: Slider State
  sliderImages: SliderImage[] = [];

  // ✅ Logo aus Store oder Theme
  storeLogo: string | null = null;
  /** true nachdem Theme-Antwort empfangen – verhindert dass loadStoreLogo() das Logo überschreibt */
  private themeLoaded = false;
  footerLogoError = false;

  /** Social & Kontakt-Daten des Stores (für Footer) */
  storeContactEmail: string | null = null;
  storeContactPhone: string | null = null;
  storeTelegramUrl: string | null = null;
  storeFacebookUrl: string | null = null;
  storeInstagramUrl: string | null = null;
  storeTiktokUrl: string | null = null;
  storeFooterText: string | null = null;
  storeDescription: string | null = null;
  readonly currentYear = new Date().getFullYear();

  // ─── Restaurant/Riad-Modus (MVP) ────────────────────────────────
  storeBusinessType: string | null = null;
  storeOpeningHours: string | null = null;
  storeAddress: string | null = null;
  storeGoogleMapsUrl: string | null = null;
  storeReservationWhatsappText: string | null = null;
  storeWhatsappNumber: string | null = null;

  /** Aktiver Template-Code für dynamisches Layout-Switching */
  activeTemplateCode: string = 'MODERN_GRID';
  
  /** Store-Währung für Currency-Selector */
  storeCurrencyCode: string = 'EUR';

  /**
   * Restaurant-Modus aktiv, wenn Theme RESTAURANT_WARM ODER
   * der Store-Geschäftstyp RESTAURANT/RIAD ist.
   */
  get isRestaurantMode(): boolean {
    const bt = (this.storeBusinessType || '').toUpperCase();
    return this.activeTemplateCode === 'RESTAURANT_WARM'
      || bt === 'RESTAURANT' || bt === 'RIAD';
  }

  /** Erstes Slider-Bild als Hero-Hintergrund (oder null → Gradient-Fallback). */
  get restaurantHeroImage(): string | null {
    return this.sliderImages?.[0]?.imageUrl ?? null;
  }

  /**
   * Gruppiert den activeTemplateCode in 4 Grid-Template-Gruppen.
   * CLASSIC | FASHION | COMPACT | MARKETPLACE
   */
  get activeGridTemplate(): string {
    const classic   = ['CLASSIC_BOOTSTRAP', 'RESTAURANT_WARM'];
    const fashion   = ['FASHION_EDITORIAL', 'BEAUTY_SOFT'];
    const compact   = ['ELECTRONICS_PRO', 'MINIMAL_DARK'];
    if (classic.includes(this.activeTemplateCode))  return 'CLASSIC';
    if (fashion.includes(this.activeTemplateCode))  return 'FASHION';
    if (compact.includes(this.activeTemplateCode))  return 'COMPACT';
    return 'MARKETPLACE';
  }

  constructor(
    private subdomainService: SubdomainService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private themeService: ThemeService,
    private sliderService: SliderService,
    private publicApiService: PublicApiService,
    private whatsappConfig: WhatsappConfigService,
    private seoApi: SeoApiService,
    private seoMeta: SeoMetaService,
    public router: Router,
    private route: ActivatedRoute   // ← für Native: /s/:slug Route-Param
  ) {}

  ngOnInit(): void {
    console.log('🏪 Storefront Landing: Initializing...');
    console.log('🌐 Current hostname:', window.location.hostname);

    // ── Native App: Route-Param /s/:slug hat Vorrang vor Subdomain ──────────
    const routeSlug = this.route.snapshot.paramMap.get('slug');
    if (routeSlug) {
      console.log('📱 Native Route-Slug erkannt:', routeSlug);
      // Subdomain-Cache mit dem Route-Slug überschreiben, damit resolveStore() korrekt läuft
      this.subdomainService['subdomainInfo'] = {
        isSubdomain: true,
        subdomain: routeSlug,
        storeId: null,
        storeName: null,
        slug: routeSlug
      };
    }

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
          this.loadStoreLogo();
          this.loadStoreData();
          this.loadSeoMeta(); // ← SEO-Tags aus gespeicherten Einstellungen

          // FIXED: loadCartCount() wird ERST nach resolveStore() aufgerufen
          // damit die storeId im SubdomainService bereits gesetzt ist
          this.loadCartCount();

          // ✅ WhatsApp-Config aus PublicStoreDTO laden (für Widget + Produkt-CTA)
          this._loadStoreWhatsappConfig();
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
        this.themeLoaded = true; // ← Theme-Antwort empfangen (auch wenn null)
        if (theme) {
          console.log('🎨 Theme angewendet:', theme.name);
          this.themeService.applyTheme(theme);
          // ✅ Template-Code für Layout-Switch setzen
          const slug = (theme.template || '').toString().toUpperCase();
          if (['MODERN_GRID', 'CLASSIC_BOOTSTRAP', 'ELECTRONICS_PRO', 'FASHION_EDITORIAL', 'MINIMAL_DARK', 'BEAUTY_SOFT', 'RESTAURANT_WARM'].includes(slug)) {
            this.activeTemplateCode = slug;
          } else {
            // Fallback-Mapping: ShopTemplate enum → Layout-Slug
            const templateMap: Record<string, string> = {
              'FASHION': 'FASHION_EDITORIAL',
              'ELECTRONICS': 'ELECTRONICS_PRO',
              'FOOD': 'RESTAURANT_WARM',
              'BEAUTY': 'BEAUTY_SOFT'
            };
            this.activeTemplateCode = templateMap[slug] || 'MODERN_GRID';
          }
          console.log('🎨 Aktives Layout-Template:', this.activeTemplateCode);
          // ✅ Immer explizit setzen – auch null (= Logo wurde entfernt).
          // Verhindert, dass loadStoreLogo() ein altes store.logoUrl überschreibt.
          this.storeLogo = theme.logoUrl ?? null;
          if (this.storeLogo) {
            console.log('✅ Logo aus Theme geladen:', this.storeLogo);
          } else {
            console.log('ℹ️ Theme hat kein Logo – Store zeigt kein Logo');
          }
        } else {
          console.log('🎨 Kein Theme gefunden, verwende Standard-Theme');
          // Kein Theme → loadStoreLogo() darf store.logoUrl als Fallback verwenden
        }
      },
      error: (error) => {
        this.themeLoaded = true; // auch bei Fehler als "fertig" markieren
        console.warn('⚠️ Theme konnte nicht geladen werden (nicht kritisch):', error);
      }
    });
  }

  /** Lädt das Store-Logo direkt via Public-API.
   *  Nur als FALLBACK, wenn kein aktives Theme vorhanden ist.
   *  Überschreibt NICHT wenn Theme bereits geladen und Logo explizit null gesetzt hat. */
  loadStoreLogo(): void {
    const host = window.location.hostname;
    this.publicApiService.resolveStore(host).subscribe({
      next: (store) => {
        // Nur setzen wenn:
        // 1. Theme noch nicht geladen ODER kein Theme vorhanden (themeLoaded = false → kein Theme)
        // 2. storeLogo noch null
        // Verhindert, dass ein altes store.logoUrl das explizit entfernte Theme-Logo überschreibt
        if (!this.themeLoaded && store.logoUrl && !this.storeLogo) {
          this.storeLogo = store.logoUrl;
          console.log('✅ Logo aus Store (Public-API, Fallback) geladen:', store.logoUrl);
        }
      },
      error: () => {
        // Nicht kritisch – Store-Name ist bereits bekannt
      }
    });
  }

  /**
   * Lädt SEO-Einstellungen aus dem Backend und setzt Meta-Tags im <head>.
   * title, description, og:image, canonical, hreflang, robots, Twitter-Cards
   */
  loadSeoMeta(): void {
    if (!this.storeId) return;

    this.seoApi.getSeoSettings(this.storeId).subscribe({
      next: (settings: any) => {
        // Hreflang JSON parsen
        let hreflang: { lang: string; url: string }[] = [];
        if (settings.hreflangConfigJson) {
          try {
            hreflang = JSON.parse(settings.hreflangConfigJson).map((e: any) => ({
              lang: e.langCode,
              url: e.absoluteUrlBase
            }));
          } catch { /* ignorieren */ }
        }

        // Page-Meta: title, description, canonical, robots, hreflang
        this.seoMeta.applyPageMeta({
          title: settings.siteName || this.storeName || undefined,
          description: settings.defaultMetaDescription || undefined,
          canonical: settings.canonicalBaseUrl || undefined,
          robots: settings.robotsIndex === false ? 'noindex, nofollow' : 'index, follow',
          hreflang: hreflang.length > 0 ? hreflang : undefined
        });

        // Social-Meta: Open Graph + Twitter Cards
        this.seoMeta.applySocialMeta({
          ogTitle:            settings.siteName || this.storeName || undefined,
          ogDescription:      settings.defaultMetaDescription || undefined,
          ogImage:            settings.ogDefaultImageUrl || undefined,
          ogUrl:              settings.canonicalBaseUrl || undefined,
          ogType:             'website',
          twitterCard:        'summary_large_image',
          twitterSite:        settings.twitterHandle || undefined,
          twitterTitle:       settings.siteName || undefined,
          twitterDescription: settings.defaultMetaDescription || undefined,
          twitterImage:       settings.ogDefaultImageUrl || undefined
        });

        // Organization JSON-LD strukturierte Daten
        if (settings.siteName) {
          this.seoMeta.injectJsonLd('organization',
            this.seoMeta.buildOrganizationJsonLd(settings)
          );
        }

        console.log('✅ SEO-Meta-Tags gesetzt für Store', this.storeId);
      },
      error: () => {
        // Nicht kritisch – Storefront funktioniert auch ohne SEO-Settings
        // Fallback: Store-Name als Tab-Titel
        if (this.storeName) {
          this.seoMeta.applyPageMeta({ title: this.storeName });
        }
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
      this.filteredProducts = this.products.filter(product => product.categoryId === category.id);
      console.log(`📊 Gefilterte Produkte: ${this.filteredProducts.length} von ${this.products.length}`);
    } else {
      console.log('🏷️ Filter zurückgesetzt - zeige alle Produkte');
      this.filteredProducts = [...this.products];
    }

    // Mobile UX: Automatisch zum Produktbereich scrollen wenn Kategorie gewählt
    // Kleine Verzögerung damit Angular das Grid zuerst aktualisiert
    setTimeout(() => this.scrollToProducts(), 80);
  }

  scrollToProducts(): void {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /** Bottom-Nav: Kategorien-Button → Drawer öffnen / Kategorie-Pills fokussieren */
  onBottomNavCategory(): void {
    this.bottomNavCategoryActive = true;
    // Scrolle zu den Category-Chips und fokussiere sie
    const el = document.querySelector('.category-pills-wrapper') as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Ersten Chip kurz hervorheben
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 800);
    }
    setTimeout(() => { this.bottomNavCategoryActive = false; }, 600);
  }

  /** Bottom-Nav: Suche-Button → Suchfeld fokussieren */
  onBottomNavSearch(): void {
    this.bottomNavSearchActive = true;
    // Suche im Marketplace-Grid fokussieren (input[type=search])
    setTimeout(() => {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
      }
    }, 100);
    setTimeout(() => { this.bottomNavSearchActive = false; }, 600);
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
    this._applySortValue(value);
  }

  /** Wird von den Grid-Template-Komponenten aufgerufen (emittieren String direkt). */
  onSortChangeStr(value: string): void {
    this._applySortValue(value);
  }

  private _applySortValue(value: string): void {
    const sorted = [...this.filteredProducts];

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

  /**
   * Lädt WhatsApp-Nummer + Greeting aus dem PublicStoreDTO und
   * schreibt sie in den WhatsappConfigService (Singleton).
   * Dadurch sind Widget + Produkt-Sticky-CTA sofort konfiguriert,
   * sobald der User von der Landing-Page auf ein Produkt navigiert.
   */
  private _loadStoreWhatsappConfig(): void {
    const host = window.location.hostname;
    this.publicApiService.resolveStore(host).subscribe({
      next: (store) => {
        this.whatsappConfig.setContext('store');
        this.whatsappConfig.setNumber(store.whatsappNumber ?? null);
        this.whatsappConfig.setMessage(
          store.greetingMessage?.trim()
            ? store.greetingMessage.trim()
            : WhatsappConfigService.DEFAULT_MESSAGE
        );
        // Social & Kontakt für Footer
        this.storeContactEmail  = store.contactEmail  ?? null;
        this.storeContactPhone  = store.contactPhone  ?? null;
        this.storeTelegramUrl   = store.telegramUrl   ?? null;
        this.storeFacebookUrl   = store.facebookUrl   ?? null;
        this.storeInstagramUrl  = store.instagramUrl  ?? null;
        this.storeTiktokUrl     = store.tiktokUrl     ?? null;
        this.storeFooterText    = store.footerText    ?? null;
        this.storeDescription   = store.description   ?? null;
        // ─── Currency & Tax ───────────────────────────────────────
        this.storeCurrencyCode  = (store.currencyCode ?? 'EUR') as string;
        // ─── Restaurant/Riad-Felder ───────────────────────────────
        this.storeBusinessType            = (store as any).businessType            ?? null;
        this.storeOpeningHours            = (store as any).openingHours            ?? null;
        this.storeAddress                 = (store as any).address                 ?? null;
        this.storeGoogleMapsUrl           = (store as any).googleMapsUrl           ?? null;
        this.storeReservationWhatsappText = (store as any).reservationWhatsappText ?? null;
        this.storeWhatsappNumber          = store.whatsappNumber ?? null;
        console.log('📱 WhatsApp-Config aus Store gesetzt:', store.whatsappNumber ?? 'kein Wert');
      },
      error: () => { /* env-Fallback bleibt aktiv */ }
    });
  }

  onFooterLogoError(): void {
    this.footerLogoError = true;
    console.warn('⚠️ Footer-Logo konnte nicht geladen werden, verwende Store-Namen als Fallback');
  }
}
