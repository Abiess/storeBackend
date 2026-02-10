import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Modern Store Header Component (idealo.de style)
 * Clean, minimalist header with search and cart
 */
@Component({
  selector: 'app-modern-store-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="modern-store-header">
      <div class="header-container">
        <!-- Logo / Store Name -->
        <div class="header-logo">
          <h1 class="store-name">{{ storeName }}</h1>
        </div>

        <!-- Search Bar (Desktop) -->
        <div class="header-search" *ngIf="showSearch">
          <div class="search-wrapper">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/>
              <path d="M14 14l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input
              type="search"
              class="search-input"
              placeholder="Produkte durchsuchen..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()">
            <button 
              class="search-clear" 
              *ngIf="searchQuery"
              (click)="clearSearch()"
              aria-label="Suche löschen">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Account Button -->
          <button class="header-btn" (click)="onAccountClick()" *ngIf="showAccount">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="btn-label">Konto</span>
          </button>

          <!-- Cart Button -->
          <button class="header-btn cart-btn" (click)="onCartClick()">
            <div class="cart-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 22a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM19 22a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM2 2h4l3.2 12.5a1.5 1.5 0 0 0 1.44 1.12h9.76a1.5 1.5 0 0 0 1.44-1.12L24 6H7" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="cart-badge" *ngIf="cartItemCount > 0">{{ cartItemCount }}</span>
            </div>
            <span class="btn-label">Warenkorb</span>
          </button>
        </div>
      </div>

      <!-- Mobile Search Bar -->
      <div class="mobile-search" *ngIf="showSearch">
        <div class="search-wrapper">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/>
            <path d="M14 14l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            type="search"
            class="search-input"
            placeholder="Produkte suchen..."
            [(ngModel)]="searchQuery"
            (input)="onSearchChange()">
          <button 
            class="search-clear" 
            *ngIf="searchQuery"
            (click)="clearSearch()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    /* ============================================
       Modern Store Header
       ============================================ */
    .modern-store-header {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      position: sticky;
      top: 0;
      z-index: 100;
      margin-bottom: 24px;
    }

    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }

    /* ============================================
       Logo / Store Name
       ============================================ */
    .header-logo {
      flex-shrink: 0;
    }

    .store-name {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      white-space: nowrap;
    }

    /* ============================================
       Search Bar (Desktop)
       ============================================ */
    .header-search {
      flex: 1;
      max-width: 600px;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      color: #9ca3af;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 12px 44px 12px 48px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      transition: all 0.2s ease;
      background: #f9fafb;
    }

    .search-input:focus {
      border-color: #2563eb;
      background: white;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .search-clear {
      position: absolute;
      right: 12px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: #e5e7eb;
      border-radius: 50%;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
    }

    .search-clear:hover {
      background: #d1d5db;
      color: #111827;
    }

    /* ============================================
       Header Actions
       ============================================ */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .header-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: #374151;
      transition: all 0.2s ease;
      border-radius: 8px;
    }

    .header-btn:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .btn-label {
      font-size: 12px;
      font-weight: 600;
    }

    /* ============================================
       Cart Button
       ============================================ */
    .cart-btn {
      position: relative;
    }

    .cart-icon-wrapper {
      position: relative;
    }

    .cart-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ef4444;
      color: white;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      padding: 0 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    /* ============================================
       Mobile Search (Hidden on Desktop)
       ============================================ */
    .mobile-search {
      display: none;
    }

    /* ============================================
       Tablet Styles
       ============================================ */
    @media (max-width: 1024px) {
      .header-container {
        padding: 14px 16px;
        gap: 16px;
      }

      .store-name {
        font-size: 20px;
      }

      .header-search {
        max-width: 500px;
      }

      .search-input {
        font-size: 14px;
        padding: 10px 40px 10px 44px;
      }
    }

    /* ============================================
       Mobile Styles
       ============================================ */
    @media (max-width: 768px) {
      .header-container {
        padding: 12px;
        gap: 12px;
      }

      .store-name {
        font-size: 18px;
      }

      /* Hide desktop search */
      .header-search {
        display: none;
      }

      /* Show mobile search */
      .mobile-search {
        display: block;
        padding: 0 12px 12px;
      }

      .mobile-search .search-input {
        padding: 10px 40px 10px 40px;
        font-size: 14px;
      }

      .mobile-search .search-icon {
        left: 12px;
      }

      .mobile-search .search-clear {
        right: 8px;
        width: 24px;
        height: 24px;
      }

      .header-btn {
        padding: 6px 10px;
        gap: 2px;
      }

      .header-btn svg {
        width: 22px;
        height: 22px;
      }

      .btn-label {
        font-size: 11px;
      }

      .cart-badge {
        min-width: 18px;
        height: 18px;
        font-size: 10px;
      }
    }

    @media (max-width: 480px) {
      .store-name {
        font-size: 16px;
      }

      .header-btn {
        padding: 4px 8px;
      }

      .btn-label {
        display: none;
      }

      .header-actions {
        gap: 4px;
      }
    }
  `]
})
export class ModernStoreHeaderComponent {
  @Input() storeName = 'Online Shop';
  @Input() cartItemCount = 0;
  @Input() showSearch = true;
  @Input() showAccount = true;

  @Output() cartClick = new EventEmitter<void>();
  @Output() accountClick = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  searchQuery = '';

  onCartClick(): void {
    this.cartClick.emit();
  }

  onAccountClick(): void {
    this.accountClick.emit();
  }

  onSearchChange(): void {
    this.searchChange.emit(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchChange.emit('');
  }
}
