import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SeoMetaService } from '../../core/services/seo-meta.service';
import { SeoApiService } from '../../core/services/seo-api.service';

/**
 * Example: Product detail page with full SEO integration.
 * Demonstrates title, meta, OG, Twitter, canonical, and JSON-LD injection.
 */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-detail" *ngIf="product">
      <div class="product-image">
        <img [src]="product.imageUrl" [alt]="product.title">
      </div>
      <div class="product-info">
        <h1>{{ product.title }}</h1>
        <p class="price">{{ product.price | currency:'EUR' }}</p>
        <p class="description">{{ product.description }}</p>
        <button class="buy-button">In den Warenkorb</button>
      </div>
    </div>
  `,
  styles: [`
    .product-detail {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      padding: 48px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .product-image img {
      width: 100%;
      border-radius: 8px;
    }
    .product-info h1 {
      font-size: 32px;
      margin-bottom: 16px;
    }
    .price {
      font-size: 28px;
      color: #667eea;
      font-weight: bold;
      margin-bottom: 24px;
    }
    .description {
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .buy-button {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 16px 48px;
      font-size: 18px;
      border-radius: 8px;
      cursor: pointer;
    }
  `]
})
export class ProductDetailExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  product: any = null;
  storeSettings: any = null;
  storeId = 1; // From route or context

  constructor(
    private route: ActivatedRoute,
    private seoMeta: SeoMetaService,
    private seoApi: SeoApiService
  ) {}

  ngOnInit(): void {
    // Load product (mock data for example)
    this.loadProduct();

    // Load store SEO settings
    this.loadStoreSettings();
  }

  ngOnDestroy(): void {
    // Clean up JSON-LD when leaving page
    this.seoMeta.removeJsonLd('product');
    this.seoMeta.removeJsonLd('breadcrumb');
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct(): void {
    // In real app: load from ProductService
    this.product = {
      id: 1,
      title: 'Premium Hoodie',
      description: 'Ein super bequemer Hoodie aus Bio-Baumwolle. Perfekt für kalte Tage.',
      sku: 'HOO-001',
      price: 49.99,
      currency: 'EUR',
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      availability: 'InStock',
      slug: 'premium-hoodie'
    };

    // Apply SEO once product is loaded
    setTimeout(() => this.applySeo(), 100);
  }

  private loadStoreSettings(): void {
    this.seoApi.getSeoSettings(this.storeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.storeSettings = settings;
          this.applySeo();
        },
        error: (err) => console.error('Failed to load SEO settings', err)
      });
  }

  private applySeo(): void {
    if (!this.product || !this.storeSettings) return;

    const canonicalUrl = `${this.storeSettings.canonicalBaseUrl}/products/${this.product.slug}`;

    // 1. Apply page meta tags
    this.seoMeta.applyPageMeta({
      title: this.buildTitle(),
      description: this.product.description.substring(0, 160),
      canonical: canonicalUrl,
      robots: this.storeSettings.robotsIndex ? 'index, follow' : 'noindex, nofollow'
    });

    // 2. Apply social meta (Open Graph + Twitter)
    this.seoMeta.applySocialMeta({
      ogTitle: this.product.title,
      ogDescription: this.product.description,
      ogImage: this.product.imageUrl,
      ogUrl: canonicalUrl,
      ogType: 'product',
      twitterCard: 'summary_large_image',
      twitterSite: this.storeSettings.twitterHandle,
      twitterTitle: this.product.title,
      twitterDescription: this.product.description,
      twitterImage: this.product.imageUrl
    });

    // 3. Inject Product JSON-LD
    const productJsonLd = this.seoMeta.buildProductJsonLd(
      {
        ...this.product,
        absoluteUrl: canonicalUrl
      },
      this.storeSettings
    );
    this.seoMeta.injectJsonLd('product', productJsonLd);

    // 4. Inject Breadcrumb JSON-LD
    const breadcrumbJsonLd = this.seoMeta.buildBreadcrumbJsonLd([
      { name: 'Home', url: this.storeSettings.canonicalBaseUrl },
      { name: 'Produkte', url: `${this.storeSettings.canonicalBaseUrl}/products` },
      { name: this.product.title, url: canonicalUrl }
    ]);
    this.seoMeta.injectJsonLd('breadcrumb', breadcrumbJsonLd);
  }

  private buildTitle(): string {
    if (!this.storeSettings.defaultTitleTemplate) {
      return `${this.product.title} | ${this.storeSettings.siteName}`;
    }

    // Simple template replacement
    return this.storeSettings.defaultTitleTemplate
      .replace('{{product.title}}', this.product.title)
      .replace('{{page.title}}', this.product.title)
      .replace('{{store.siteName}}', this.storeSettings.siteName);
  }
}

