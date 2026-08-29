import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { StoreCurrencyPipe } from '@app/core/pipes/store-currency.pipe';
import { ImageSliderComponent, SliderImage } from '@app/shared/components/image-slider.component';
import { LanguageSelectorComponent } from '@app/shared/components/language-selector/language-selector.component';
import { Product, Category, StoreTheme } from '@app/core/models';

/**
 * SERVICE_PROFESSIONAL – Professionelles Service-Business-Template
 *
 * Generisches Template für Service-Unternehmen (Werkstatt, Handwerker, Beratung, etc.)
 * Wiederverwendung der bestehenden Store/Product/Category-Struktur:
 *  - Product → Service/Leistung
 *  - basePrice → Preis oder 0 für "auf Anfrage"
 *  - Category → Service-Kategorie
 *  - isFeatured → Hervorhebung
 *
 * WICHTIG: Standalone Component, keine NgModules.
 */
@Component({
  selector: 'app-service-professional-layout',
  standalone: true,
  imports: [CommonModule, TranslatePipe, StoreCurrencyPipe, ImageSliderComponent, LanguageSelectorComponent],
  templateUrl: './service-professional-layout.component.html',
  styleUrls: ['./service-professional-layout.component.scss']
})
export class ServiceProfessionalLayoutComponent implements OnInit {
  @Input() storeName = '';
  @Input() description: string | null = null;
  @Input() aboutTitle: string | null = null;
  @Input() aboutSubtitle: string | null = null;
  @Input() aboutText: string | null = null;
  @Input() aboutImageUrl: string | null = null;
  @Input() logoUrl: string | null = null;
  @Input() bannerImageUrl: string | null = null;
  @Input() sliderImages: SliderImage[] = [];
  @Input() galleryImages: SliderImage[] = [];
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() whatsappNumber: string | null = null;
  @Input() contactPhone: string | null = null;
  @Input() contactEmail: string | null = null;
  @Input() openingHours: string | null = null;
  @Input() address: string | null = null;
  @Input() googleMapsUrl: string | null = null;
  @Input() legalName: string | null = null;
  @Input() footerText: string | null = null;
  @Input() facebookUrl: string | null = null;
  @Input() instagramUrl: string | null = null;
  @Input() tiktokUrl: string | null = null;
  @Input() telegramUrl: string | null = null;
  @Input() theme: StoreTheme | null = null;
  @Input() currency = 'EUR';

  // Component state
  mobileMenuOpen = false;
  selectedCategoryId: number | null = null;

  // Computed hero image
  heroImage: string | null = null;

  // Filtered services
  filteredServices: Product[] = [];

  ngOnInit(): void {
    // Determine hero image: bannerImageUrl > first slider image > null
    this.heroImage = this.bannerImageUrl 
      || (this.sliderImages && this.sliderImages.length > 0 ? this.sliderImages[0].imageUrl : null);

    // Initialize filtered services
    this.updateFilteredServices();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  buildWhatsAppLink(serviceName?: string): string {
    if (!this.whatsappNumber) return '#';
    const num = this.whatsappNumber.replace(/[^0-9]/g, '');
    const text = serviceName 
      ? `Anfrage zu "${serviceName}" – ${this.storeName}`
      : `Anfrage – ${this.storeName}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }

  // Service Filtering
  updateFilteredServices(): void {
    if (!this.selectedCategoryId) {
      this.filteredServices = [...this.products];
    } else {
      this.filteredServices = this.products.filter(
        p => p.categoryId === this.selectedCategoryId
      );
    }
  }

  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.updateFilteredServices();
  }

  // Category Helper
  get relevantCategories(): Category[] {
    // Only show categories that have products
    const categoriesWithProducts = this.categories.filter(cat => 
      this.products.some(p => p.categoryId === cat.id)
    );
    return categoriesWithProducts;
  }

  get showCategoryFilter(): boolean {
    return this.relevantCategories.length > 1;
  }

  // Service Helpers
  getServicePrice(service: Product): number | null {
    return service.basePrice > 0 ? service.basePrice : null;
  }

  truncateDescription(text: string | undefined, maxLength: number = 120): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  getServiceImage(service: Product): string {
    return service.imageUrl || service.primaryImageUrl || '/assets/img/placeholder-service.png';
  }

  // Section visibility
  get showTrustSection(): boolean {
    return !!(this.openingHours || this.address || this.contactPhone);
  }

  get showAboutSection(): boolean {
    return !!(this.aboutText || this.aboutTitle || this.aboutImageUrl || this.description);
  }

  get showGallerySection(): boolean {
    return this.galleryImages && this.galleryImages.length > 0;
  }

  get showContactSection(): boolean {
    return !!(this.contactPhone || this.contactEmail || this.whatsappNumber || this.address);
  }

  // Google Maps helper
  openGoogleMaps(): void {
    if (this.googleMapsUrl) {
      window.open(this.googleMapsUrl, '_blank', 'noopener');
    }
  }

  // Current year for footer
  get currentYear(): number {
    return new Date().getFullYear();
  }

  // Theme helper methods
  get primaryColor(): string {
    return this.theme?.colors?.primary || '#2563eb'; // Professional blue
  }

  get secondaryColor(): string {
    return this.theme?.colors?.secondary || '#1e40af'; // Darker blue
  }

  get textColor(): string {
    return this.theme?.colors?.text || '#1f2937';
  }

  get backgroundColor(): string {
    return this.theme?.colors?.background || '#ffffff';
  }

  get headingFont(): string {
    return this.theme?.typography?.headingFontFamily || this.theme?.typography?.fontFamily || 'system-ui, -apple-system, sans-serif';
  }

  get bodyFont(): string {
    return this.theme?.typography?.fontFamily || 'system-ui, -apple-system, sans-serif';
  }

  get borderRadius(): string {
    const radius = this.theme?.layout?.borderRadius || 'medium';
    const map: Record<string, string> = {
      'none': '0',
      'small': '0.375rem',
      'medium': '0.5rem',
      'large': '0.75rem'
    };
    return map[radius] || '0.5rem';
  }
}
