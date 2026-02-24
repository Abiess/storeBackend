import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-storefront-nav',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <nav class="category-nav">
      <div class="container">
        <!-- Mobile Filter Toggle -->
        <button class="mobile-filter-toggle" (click)="toggleMobileFilter()" *ngIf="categories.length > 0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 4h14M3 10h14M3 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Filter ({{ categories.length }})</span>
          <span class="active-badge" *ngIf="selectedCategory">1</span>
        </button>

        <!-- Category Pills - Desktop & Mobile -->
        <div class="category-pills" [class.mobile-open]="mobileFilterOpen">
          <div class="pills-header" *ngIf="mobileFilterOpen">
            <h3>{{ 'sidebar.categories' | translate }}</h3>
            <button class="close-btn" (click)="toggleMobileFilter()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="pills-scroll">
            <!-- All Products -->
            <button 
              class="category-pill"
              [class.active]="selectedCategory === null"
              (click)="selectCategory(null)">
              <span class="pill-icon">🏪</span>
              <span class="pill-label">{{ 'sidebar.allProducts' | translate }}</span>
              <span class="pill-check" *ngIf="selectedCategory === null">✓</span>
            </button>

            <!-- Category Pills -->
            <button 
              *ngFor="let category of categories; let i = index"
              class="category-pill"
              [class.active]="selectedCategory?.id === category.id"
              [style.animation-delay]="(i * 0.05) + 's'"
              (click)="selectCategory(category)">
              <span class="pill-icon">{{ getCategoryIcon(category) }}</span>
              <span class="pill-label">{{ category.name }}</span>
              <span class="pill-check" *ngIf="selectedCategory?.id === category.id">✓</span>
            </button>
          </div>

          <!-- Reset Filter -->
          <div class="filter-footer" *ngIf="selectedCategory && mobileFilterOpen">
            <button class="reset-btn" (click)="selectCategory(null)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L2 14M2 2l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Filter zurücksetzen
            </button>
          </div>
        </div>

        <!-- Active Filter Badge -->
        <div class="active-filter" *ngIf="selectedCategory && !mobileFilterOpen">
          <span class="filter-label">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ selectedCategory.name }}
          </span>
          <button class="remove-filter" (click)="selectCategory(null)" [attr.aria-label]="'common.filter' | translate">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M2 12L12 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* ==================== MODERN CATEGORY NAVIGATION ==================== */
    .category-nav {
      background: white;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 73px; /* Below header */
      z-index: 90;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 clamp(1rem, 5vw, 3rem);
    }

    /* ==================== MOBILE FILTER TOGGLE ==================== */
    .mobile-filter-toggle {
      display: none;
      width: 100%;
      padding: 1rem;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9375rem;
      color: #1d1d1f;
      cursor: pointer;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      position: relative;
      margin: 1rem 0;

      &:hover {
        background: #f5f5f7;
        border-color: rgba(0, 0, 0, 0.15);
      }

      svg {
        flex-shrink: 0;
      }

      span {
        flex: 1;
        text-align: left;
      }
    }

    .active-badge {
      background: #0071e3;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: auto;
    }

    /* ==================== CATEGORY PILLS ==================== */
    .category-pills {
      padding: 1rem 0;
    }

    .pills-header {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1d1d1f;
      }
    }

    .close-btn {
      background: #f5f5f7;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #e8e8ed;
        transform: rotate(90deg);
      }
    }

    .pills-scroll {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;

      /* Custom Scrollbar */
      &::-webkit-scrollbar {
        height: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f5f5f7;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #d2d2d7;
        border-radius: 3px;

        &:hover {
          background: #86868b;
        }
      }
    }

    /* ==================== CATEGORY PILL ==================== */
    .category-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: #f5f5f7;
      border: 2px solid transparent;
      border-radius: 980px;
      font-weight: 500;
      font-size: 0.9375rem;
      color: #1d1d1f;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      position: relative;
      animation: slideIn 0.3s ease-out;

      &:hover {
        background: #e8e8ed;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      &.active {
        background: #0071e3;
        color: white;
        border-color: #0071e3;
        box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);

        .pill-icon {
          filter: none;
        }

        .pill-count {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }
      }

      &:active {
        transform: scale(0.97);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .pill-icon {
      font-size: 1.125rem;
      line-height: 1;
      filter: grayscale(0.3);
      transition: filter 0.3s;
    }

    .pill-label {
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .pill-count {
      background: rgba(0, 0, 0, 0.08);
      color: #6e6e73;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .pill-check {
      font-size: 1rem;
      margin-left: -0.25rem;
    }

    /* ==================== ACTIVE FILTER BADGE ==================== */
    .active-filter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #0071e3;
      color: white;
      border-radius: 980px;
      font-size: 0.875rem;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .remove-filter {
      background: #f5f5f7;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
      color: #6e6e73;

      &:hover {
        background: #ff3b30;
        color: white;
        transform: rotate(90deg);
      }
    }

    /* ==================== FILTER FOOTER ==================== */
    .filter-footer {
      display: none;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .reset-btn {
      width: 100%;
      padding: 0.875rem;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9375rem;
      color: #ff3b30;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s;

      &:hover {
        background: #fff5f5;
        border-color: #ff3b30;
      }
    }

    /* ==================== RESPONSIVE - MOBILE ==================== */
    @media (max-width: 768px) {
      .category-nav {
        top: 65px;
        border-bottom: none;
        box-shadow: none;
      }

      .mobile-filter-toggle {
        display: flex;
      }

      .category-pills {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        z-index: 1000;
        padding: 0;
        overflow-y: auto;

        &.mobile-open {
          display: block;
          animation: slideUp 0.3s ease-out;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }

      .pills-header {
        display: flex;
      }

      .pills-scroll {
        flex-direction: column;
        gap: 0.5rem;
        padding: 1.5rem;
        overflow-x: visible;
      }

      .category-pill {
        width: 100%;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border-radius: 12px;
      }

      .filter-footer {
        display: block;
      }

      .active-filter {
        display: none;
      }
    }

    /* ==================== TABLET ==================== */
    @media (min-width: 769px) and (max-width: 1024px) {
      .pills-scroll {
        gap: 0.5rem;
      }

      .category-pill {
        padding: 0.5rem 0.875rem;
        font-size: 0.875rem;
      }
    }
  `]
})
export class StorefrontNavComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategory: Category | null = null;
  @Output() categorySelect = new EventEmitter<Category | null>();

  mobileFilterOpen = false;

  selectCategory(category: Category | null): void {
    this.categorySelect.emit(category);
    this.mobileFilterOpen = false;

    // Smooth scroll to products
    if (typeof window !== 'undefined') {
      const productsSection = document.getElementById('products');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  toggleMobileFilter(): void {
    this.mobileFilterOpen = !this.mobileFilterOpen;

    // Prevent body scroll when filter is open
    if (typeof document !== 'undefined') {
      if (this.mobileFilterOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  getCategoryIcon(category: Category): string {
    // Smart icon matching based on category name
    const name = category.name.toLowerCase();

    if (name.includes('elektronik') || name.includes('tech')) return '💻';
    if (name.includes('mode') || name.includes('kleidung') || name.includes('fashion')) return '👕';
    if (name.includes('sport') || name.includes('fitness')) return '⚽';
    if (name.includes('haus') || name.includes('home') || name.includes('möbel')) return '🏡';
    if (name.includes('buch') || name.includes('bücher') || name.includes('book')) return '📚';
    if (name.includes('beauty') || name.includes('kosmetik')) return '💄';
    if (name.includes('spielzeug') || name.includes('toy')) return '🧸';
    if (name.includes('schmuck') || name.includes('jewelry')) return '💎';
    if (name.includes('essen') || name.includes('food') || name.includes('lebensmittel')) return '🍕';
    if (name.includes('getränk') || name.includes('drink')) return '🥤';
    if (name.includes('garten') || name.includes('garden')) return '🌱';
    if (name.includes('tier') || name.includes('pet')) return '🐾';
    if (name.includes('baby') || name.includes('kinder') || name.includes('kid')) return '👶';
    if (name.includes('auto') || name.includes('car')) return '🚗';
    if (name.includes('musik') || name.includes('music')) return '🎵';

    return '📦'; // Default icon
  }
}
