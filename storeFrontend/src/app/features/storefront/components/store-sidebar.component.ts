import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Store Sidebar Component
 * Displays categories with modern idealo-style design
 */
@Component({
  selector: 'app-store-sidebar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="store-sidebar-content">
      <!-- Header -->
      <div class="sidebar-header">
        <h3>{{ 'sidebar.categories' | translate }}</h3>
        <button 
          *ngIf="selectedCategory"
          class="clear-filter"
          (click)="clearFilter()"
          [attr.aria-label]="'sidebar.allProducts' | translate">
          {{ 'sidebar.showAll' | translate }}
        </button>
      </div>

      <!-- Categories List -->
      <div class="categories-list">
        <!-- All Products -->
        <button
          class="category-item"
          [class.active]="!selectedCategory"
          (click)="onSelectCategory(null)">
          <span class="category-icon">📦</span>
          <span class="category-name">{{ 'sidebar.allProducts' | translate }}</span>
          <span class="category-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <!-- Category Items -->
        <button
          *ngFor="let category of categories"
          class="category-item"
          [class.active]="selectedCategory?.id === category.id"
          (click)="onSelectCategory(category)">
          <span class="category-icon">{{ getCategoryIcon(category.name) }}</span>
          <span class="category-name">{{ category.name }}</span>
          <span class="category-count" *ngIf="category.productCount">
            {{ category.productCount }}
          </span>
          <span class="category-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

      <!-- Optional: Filters Section -->
      <div class="filters-section" *ngIf="showFilters">
        <div class="sidebar-header">
          <h3>{{ 'sidebar.filters' | translate }}</h3>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    /* ============================================
       Sidebar Content
       ============================================ */
    .store-sidebar-content {
      padding: 20px 0;
    }

    /* ============================================
       Header
       ============================================ */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 16px;
      border-bottom: 2px solid #f3f4f6;
    }

    .sidebar-header h3 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .clear-filter {
      font-size: 13px;
      color: #2563eb;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .clear-filter:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }

    /* ============================================
       Categories List
       ============================================ */
    .categories-list {
      padding: 8px 0;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 14px 20px;
      background: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      color: #374151;
      position: relative;
    }

    .category-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #2563eb;
      transform: scaleY(0);
      transition: transform 0.2s ease;
    }

    .category-item:hover {
      background: #f9fafb;
      color: #111827;
    }

    .category-item.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;
    }

    .category-item.active::before {
      transform: scaleY(1);
    }

    .category-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .category-name {
      flex: 1;
      font-size: 15px;
      line-height: 1.4;
    }

    .category-count {
      font-size: 13px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .category-item.active .category-count {
      background: #dbeafe;
      color: #2563eb;
    }

    .category-arrow {
      color: #9ca3af;
      opacity: 0;
      transform: translateX(-4px);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
    }

    .category-item:hover .category-arrow,
    .category-item.active .category-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    .category-item.active .category-arrow {
      color: #2563eb;
    }

    /* ============================================
       Filters Section
       ============================================ */
    .filters-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #f3f4f6;
    }

    /* ============================================
       Mobile Styles
       ============================================ */
    @media (max-width: 768px) {
      .store-sidebar-content {
        padding: 16px 0;
      }

      .sidebar-header {
        padding: 0 16px 12px;
      }

      .sidebar-header h3 {
        font-size: 16px;
      }

      .category-item {
        padding: 12px 16px;
      }

      .category-name {
        font-size: 14px;
      }

      .category-icon {
        font-size: 18px;
      }
    }

    @media (max-width: 480px) {
      .category-item {
        padding: 10px 12px;
      }
    }
  `]
})
export class StoreSidebarComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategory: Category | null = null;
  @Input() showFilters = false;

  @Output() categorySelect = new EventEmitter<Category | null>();

  onSelectCategory(category: Category | null): void {
    this.categorySelect.emit(category);
  }

  clearFilter(): void {
    this.categorySelect.emit(null);
  }

  getCategoryIcon(name: string): string {
    const lowerName = name.toLowerCase();

    // Icon mapping based on category name
    if (lowerName.includes('elektronik') || lowerName.includes('technik')) return '💻';
    if (lowerName.includes('kleidung') || lowerName.includes('mode') || lowerName.includes('fashion')) return '👕';
    if (lowerName.includes('schuhe') || lowerName.includes('shoes')) return '��';
    if (lowerName.includes('sport') || lowerName.includes('fitness')) return '⚽';
    if (lowerName.includes('buch') || lowerName.includes('bücher') || lowerName.includes('book')) return '📚';
    if (lowerName.includes('spielzeug') || lowerName.includes('toy')) return '🧸';
    if (lowerName.includes('haus') || lowerName.includes('home') || lowerName.includes('möbel')) return '🏠';
    if (lowerName.includes('küche') || lowerName.includes('kitchen')) return '🍳';
    if (lowerName.includes('garten') || lowerName.includes('garden')) return '🌱';
    if (lowerName.includes('beauty') || lowerName.includes('kosmetik')) return '💄';
    if (lowerName.includes('schmuck') || lowerName.includes('jewelry')) return '💎';
    if (lowerName.includes('auto') || lowerName.includes('car')) return '🚗';
    if (lowerName.includes('baby') || lowerName.includes('kind')) return '👶';
    if (lowerName.includes('tier') || lowerName.includes('pet')) return '🐾';
    if (lowerName.includes('musik') || lowerName.includes('music')) return '🎵';
    if (lowerName.includes('film') || lowerName.includes('movie')) return '🎬';
    if (lowerName.includes('lebensmittel') || lowerName.includes('food')) return '🍎';
    if (lowerName.includes('getränk') || lowerName.includes('drink')) return '🥤';

    return '🏷️';
  }
}
