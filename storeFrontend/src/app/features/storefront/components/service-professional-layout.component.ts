import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { Product, Category, StoreTheme } from '@app/core/models';
import { SliderImage } from '@app/core/services/slider.service';

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
  imports: [CommonModule, TranslatePipe],
  templateUrl: './service-professional-layout.component.html',
  styleUrls: ['./service-professional-layout.component.scss']
})
export class ServiceProfessionalLayoutComponent implements OnInit {
  @Input() storeName = '';
  @Input() description: string | null = null;
  @Input() logoUrl: string | null = null;
  @Input() bannerImageUrl: string | null = null;
  @Input() sliderImages: SliderImage[] = [];
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() whatsappNumber: string | null = null;
  @Input() contactPhone: string | null = null;
  @Input() contactEmail: string | null = null;
  @Input() theme: StoreTheme | null = null;
  @Input() currency = 'EUR';

  // Component state
  mobileMenuOpen = false;

  // Computed hero image
  heroImage: string | null = null;

  ngOnInit(): void {
    // Determine hero image: bannerImageUrl > first slider image > null
    this.heroImage = this.bannerImageUrl 
      || (this.sliderImages && this.sliderImages.length > 0 ? this.sliderImages[0].imageUrl : null);
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

  buildWhatsAppLink(): string {
    if (!this.whatsappNumber) return '#';
    const num = this.whatsappNumber.replace(/[^0-9]/g, '');
    const text = `Anfrage – ${this.storeName}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
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
