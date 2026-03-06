import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomepageSection } from '@app/core/models';
import { FeaturedProductsComponent } from '@app/shared/components/featured-products.component';
import { StoreSliderViewerComponent } from './components/store-slider-viewer.component';

@Component({
  selector: 'app-homepage-section-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule, FeaturedProductsComponent, StoreSliderViewerComponent],
  template: `
    <div class="homepage-sections">
      <ng-container *ngFor="let section of sections">
        <!-- Hero / Slider Section -->
        <div class="section hero-section" *ngIf="section.sectionType === 'HERO' && section.isActive">
          <app-store-slider-viewer 
            *ngIf="storeId"
            [storeId]="storeId">
          </app-store-slider-viewer>
        </div>

        <!-- Featured Products Section -->
        <div class="section featured-section" *ngIf="section.sectionType === 'FEATURED_PRODUCTS' && section.isActive">
          <app-featured-products
            [storeId]="storeId"
            [type]="getProductType(section)"
            [limit]="getLimit(section)"
            [title]="getTitle(section) || ''">
          </app-featured-products>
        </div>

        <!-- Best Sellers Section -->
        <div class="section bestseller-section" *ngIf="section.sectionType === 'BEST_SELLERS' && section.isActive">
          <app-featured-products
            [storeId]="storeId"
            type="top"
            [limit]="getLimit(section)"
            [title]="getTitle(section) || '🔥 Bestseller'">
          </app-featured-products>
        </div>

        <!-- Categories Section -->
        <div class="section categories-section" *ngIf="section.sectionType === 'CATEGORIES' && section.isActive">
          <div class="section-header">
            <h2>{{ getTitle(section) || '📂 Kategorien' }}</h2>
          </div>
          <!-- Categories grid would go here -->
          <p class="coming-soon">Kategorien-Ansicht wird geladen...</p>
        </div>

        <!-- Banner Section -->
        <div class="section banner-section" *ngIf="section.sectionType === 'BANNER' && section.isActive">
          <div *ngIf="getBannerImage(section)" 
               class="banner-link" 
               (click)="onBannerClick($event, section)"
               role="button"
               tabindex="0">
            <img [src]="getBannerImage(section)" [alt]="getTitle(section) || 'Banner'" class="banner-image">
            <div class="banner-overlay" *ngIf="getTitle(section)">
              <h3>{{ getTitle(section) }}</h3>
            </div>
          </div>
        </div>

        <!-- Newsletter Section -->
        <div class="section newsletter-section" *ngIf="section.sectionType === 'NEWSLETTER' && section.isActive">
          <div class="newsletter-content">
            <h2>{{ getTitle(section) || '📧 Newsletter' }}</h2>
            <p>{{ getDescription(section) || 'Bleiben Sie auf dem Laufenden mit unseren neuesten Angeboten!' }}</p>
            <div class="newsletter-form">
              <input 
                type="email" 
                placeholder="Ihre E-Mail-Adresse" 
                class="email-input"
                [(ngModel)]="newsletterEmail"
                (keyup.enter)="onNewsletterSubmit($event, section)">
              <button 
                class="subscribe-btn"
                (click)="onNewsletterSubmit($event, section)"
                type="button">
                Abonnieren
              </button>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .homepage-sections {
      display: flex;
      flex-direction: column;
    }

    .section {
      width: 100%;
    }

    .hero-section {
      margin-bottom: 2rem;
    }

    .featured-section,
    .bestseller-section {
      margin-bottom: 3rem;
    }

    .categories-section,
    .banner-section,
    .newsletter-section {
      margin-bottom: 3rem;
      padding: 0 2rem;
    }

    .section-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .section-header h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a202c;
    }

    .coming-soon {
      text-align: center;
      color: #718096;
      padding: 2rem;
    }

    .banner-link {
      display: block;
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      max-width: 1400px;
      margin: 0 auto;
      cursor: pointer;
    }

    .banner-image {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.3s;
    }

    .banner-link:hover .banner-image {
      transform: scale(1.05);
    }

    .banner-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
      color: white;
      padding: 2rem;
    }

    .banner-overlay h3 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .newsletter-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4rem 2rem;
      border-radius: 12px;
      max-width: 1400px;
      margin: 3rem auto;
    }

    .newsletter-content {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }

    .newsletter-content h2 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 1rem;
    }

    .newsletter-content p {
      font-size: 1.125rem;
      margin: 0 0 2rem;
      opacity: 0.9;
    }

    .newsletter-form {
      display: flex;
      gap: 0.75rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .email-input {
      flex: 1;
      padding: 0.875rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
    }

    .subscribe-btn {
      padding: 0.875rem 2rem;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .subscribe-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    @media (max-width: 768px) {
      .newsletter-form {
        flex-direction: column;
      }

      .banner-overlay h3 {
        font-size: 1.5rem;
      }

      .newsletter-content h2 {
        font-size: 1.5rem;
      }

      .section-header h2 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class HomepageSectionRendererComponent implements OnInit {
  @Input() storeId!: number;
  @Input() sections: HomepageSection[] = [];

  newsletterEmail = '';

  ngOnInit(): void {
    console.log('📄 Rendering', this.sections.length, 'homepage sections');
  }

  getProductType(section: HomepageSection): 'featured' | 'top' | 'new' {
    // Default to featured
    return 'featured';
  }

  getLimit(section: HomepageSection): number {
    try {
      const settings = JSON.parse(section.settings || '{}');
      return settings.limit || 8;
    } catch (e) {
      return 8;
    }
  }

  getTitle(section: HomepageSection): string | undefined {
    try {
      const settings = JSON.parse(section.settings || '{}');
      return settings.title;
    } catch (e) {
      return undefined;
    }
  }

  getDescription(section: HomepageSection): string | undefined {
    try {
      const settings = JSON.parse(section.settings || '{}');
      return settings.description;
    } catch (e) {
      return undefined;
    }
  }

  getBannerImage(section: HomepageSection): string | undefined {
    try {
      const settings = JSON.parse(section.settings || '{}');
      return settings.imageUrl;
    } catch (e) {
      return undefined;
    }
  }

  getBannerLink(section: HomepageSection): string {
    try {
      const settings = JSON.parse(section.settings || '{}');
      return settings.link || '#';
    } catch (e) {
      return '#';
    }
  }

  onBannerClick(event: Event, section: HomepageSection): void {
    event.preventDefault();
    event.stopPropagation();

    const link = this.getBannerLink(section);

    if (!link || link === '#') {
      console.log('🚫 Banner has no valid link');
      return;
    }

    // Check if external link
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      // Internal navigation - use window.location for simplicity
      window.location.href = link;
    }
  }

  onNewsletterSubmit(event: Event, section: HomepageSection): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.newsletterEmail || !this.newsletterEmail.includes('@')) {
      console.log('🚫 Invalid email address');
      alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    console.log('📧 Newsletter subscription:', this.newsletterEmail);
    // TODO: Implement actual newsletter subscription API call
    alert(`Vielen Dank! Sie wurden mit ${this.newsletterEmail} für unseren Newsletter angemeldet.`);
    this.newsletterEmail = '';
  }
}

