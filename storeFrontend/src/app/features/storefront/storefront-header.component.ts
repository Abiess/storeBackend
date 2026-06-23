import { Component, Input, Output, EventEmitter, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StorefrontAuthDialogComponent } from './storefront-auth-dialog.component';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { PromoBannerComponent } from '../../shared/components/promo-banner/promo-banner.component';

@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StorefrontAuthDialogComponent, TranslatePipe, LanguageSelectorComponent, PromoBannerComponent],
  template: `
    <!-- Promo Banner mit besserer Logik -->
    <app-promo-banner [storeId]="storeId"></app-promo-banner>

    <header class="store-header" [class.scrolled]="isScrolled" [class.search-open]="searchOpen">
      <div class="header-inner">

        <!-- Brand -->
        <a class="store-brand" routerLink="/" aria-label="Zur Startseite">
          <div class="brand-logo-wrap" *ngIf="storeLogo; else textLogo">
            <img [src]="storeLogo" [alt]="storeName" class="brand-logo">
          </div>
          <ng-template #textLogo>
            <div class="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#667eea"/>
                    <stop offset="100%" stop-color="#764ba2"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="10" fill="url(#brandGrad)"/>
                <path d="M8 10h16M8 16h16M8 22h10" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
            </div>
          </ng-template>
          <div class="brand-text">
            <span class="store-name">{{ storeName }}</span>
            <span class="store-slug">{{ storeSlug }}.markt.ma</span>
          </div>
        </a>

        <!-- Search Bar (Desktop) -->
        <div class="search-bar-wrap" [class.focused]="searchFocused">
          <label class="search-bar" [class.active]="searchFocused">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              class="search-input"
              [placeholder]="'storefront.filter.searchPlaceholder' | translate"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              (focus)="searchFocused = true"
              (blur)="searchFocused = false"
              autocomplete="off"
              aria-label="Suchen">
            <button *ngIf="searchQuery" class="search-clear" (click)="clearSearch()" type="button" aria-label="Suche löschen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </label>
        </div>

        <!-- Header Actions -->
        <nav class="header-actions" aria-label="Header Navigation">
          <app-language-selector></app-language-selector>

          <!-- Search Toggle (Mobile) -->
          <button class="icon-btn search-toggle-btn" (click)="toggleSearch()" type="button" aria-label="Suche öffnen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

          <!-- Login Button -->
          <button *ngIf="!(isLoggedIn$ | async)" class="action-btn btn-login" (click)="showAuthDialog = true" [attr.aria-label]="'common.login' | translate" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="btn-label">{{ 'common.login' | translate }}</span>
          </button>

          <!-- User Menu -->
          <div *ngIf="isLoggedIn$ | async" class="user-menu-wrap">
            <button class="icon-btn user-btn" (click)="userMenuOpen = !userMenuOpen" type="button" [attr.aria-expanded]="userMenuOpen" aria-label="Mein Konto">
              <span class="user-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
            </button>
            <div class="user-dropdown" *ngIf="userMenuOpen" (clickOutside)="userMenuOpen = false">
              <a routerLink="/storefront/profile" class="dropdown-item" (click)="userMenuOpen = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ 'navigation.myAccount' | translate }}
              </a>
              <a routerLink="/orders" class="dropdown-item" (click)="userMenuOpen = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {{ 'navigation.myOrders' | translate }}
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger" (click)="logout(); userMenuOpen = false" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                {{ 'common.logout' | translate }}
              </button>
            </div>
          </div>

          <!-- Cart Button -->
          <button class="cart-btn" (click)="cartClick.emit()" type="button" aria-label="Warenkorb">
            <span class="cart-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span class="cart-badge" *ngIf="cartItemCount > 0" aria-live="polite">
                {{ cartItemCount > 99 ? '99+' : cartItemCount }}
              </span>
            </span>
            <span class="btn-label">{{ 'cart.title' | translate }}</span>
          </button>
        </nav>
      </div>

      <!-- Mobile Search Drawer -->
      <div class="mobile-search-drawer" [class.open]="searchOpen">
        <label class="mobile-search-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input #mobileSearchInput type="search" class="mobile-search-input"
            [(ngModel)]="searchQuery" (input)="onSearch()"
            placeholder="Suchen..." autocomplete="off" aria-label="Suchen">
          <button class="mobile-search-close" (click)="closeSearch()" type="button" aria-label="Schließen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </label>
      </div>
    </header>

    <!-- Auth Dialog -->
    <app-storefront-auth-dialog
      *ngIf="showAuthDialog"
      [isLogin]="true"
      (close)="showAuthDialog = false"
      (success)="onAuthSuccess()">
    </app-storefront-auth-dialog>
  `,
  styles: [`
    /* ════════════════════════════════════════
       PROMO STRIP
       ════════════════════════════════════════ */
    /* ════════════════════════════════════════
       HEADER CORE
       ════════════════════════════════════════ */
    .store-header {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid rgba(102, 126, 234, 0.12);
      position: sticky;
      top: 0;
      z-index: 200;
      transition: box-shadow 0.3s ease, background 0.3s ease;
      padding-top: env(safe-area-inset-top, 0px);
    }

    .store-header.scrolled {
      box-shadow: 0 4px 24px rgba(102, 126, 234, 0.15);
      background: rgba(255, 255, 255, 0.97);
    }

    .header-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.875rem clamp(1rem, 4vw, 2.5rem);
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1.5rem;
    }

    /* ════════════════════════════════════════
       BRAND
       ════════════════════════════════════════ */
    .store-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      flex-shrink: 0;
      transition: opacity 0.2s ease;

      &:hover { opacity: 0.85; }
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
      animation: logoPulse 3s ease-in-out infinite;

      svg { width: 100%; height: 100%; display: block; }
    }

    @keyframes logoPulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35); }
      50%       { box-shadow: 0 4px 20px rgba(118, 75, 162, 0.5); }
    }

    .brand-logo-wrap { display: flex; align-items: center; }
    .brand-logo { max-height: 44px; max-width: 140px; object-fit: contain; }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .store-name {
      font-size: 1.125rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .store-slug {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: 400;
    }

    /* ════════════════════════════════════════
       SEARCH BAR (Desktop)
       ════════════════════════════════════════ */
    .search-bar-wrap {
      max-width: 520px;
      width: 100%;
      justify-self: center;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f4f4f8;
      border: 1.5px solid transparent;
      border-radius: 50px;
      padding: 0.5rem 1rem;
      cursor: text;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &.active, &:hover {
        background: white;
        border-color: #667eea;
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
      }
    }

    .search-icon { color: #94a3b8; flex-shrink: 0; transition: color 0.2s; }
    .search-bar.active .search-icon { color: #667eea; }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.9375rem;
      color: #1e1e2e;
      outline: none;
      min-width: 0;

      &::placeholder { color: #94a3b8; }
    }

    .search-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: #e2e8f0;
      border-radius: 50%;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
      flex-shrink: 0;

      &:hover { background: #cbd5e1; color: #1e293b; }
    }

    /* ════════════════════════════════════════
       HEADER ACTIONS
       ════════════════════════════════════════ */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .icon-btn {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &:hover {
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
        transform: translateY(-1px);
      }

      &:active { transform: scale(0.95); }
    }

    .search-toggle-btn {
      display: none; /* Hidden on desktop */
    }

    /* Login Button */
    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.125rem;
      border-radius: 50px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.01em;
    }

    .btn-login {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        background: linear-gradient(135deg, #7c94f0 0%, #8a5fb8 100%);
      }

      &:active { transform: scale(0.97); }
    }

    /* User Avatar Button */
    .user-menu-wrap { position: relative; }

    .user-btn { }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      transition: all 0.3s;

      .user-btn:hover & {
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.5);
        transform: scale(1.05);
      }
    }

    /* Dropdown */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: white;
      border: 1px solid rgba(102, 126, 234, 0.15);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(102, 126, 234, 0.1);
      overflow: hidden;
      animation: dropdownOpen 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 500;
    }

    @keyframes dropdownOpen {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: #374151;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      background: transparent;
      width: 100%;
      cursor: pointer;
      transition: all 0.15s ease;

      svg { color: #6b7280; transition: color 0.15s; }

      &:hover {
        background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, transparent 100%);
        color: #667eea;
        svg { color: #667eea; }
      }

      &.danger { color: #ef4444; svg { color: #ef4444; } }
      &.danger:hover { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
    }

    .dropdown-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }

    /* Cart Button */
    .cart-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.125rem;
      border-radius: 50px;
      border: none;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      box-shadow: 0 4px 14px rgba(240, 147, 251, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(240, 147, 251, 0.5);
      }

      &:active { transform: scale(0.97); }
    }

    .cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; }

    .cart-badge {
      position: absolute;
      top: -9px;
      right: -9px;
      background: #1e1e2e;
      color: white;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      font-size: 0.6875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid white;
      animation: badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes badgePop {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }

    .btn-label { white-space: nowrap; }

    /* ════════════════════════════════════════
       MOBILE SEARCH DRAWER
       ════════════════════════════════════════ */
    .mobile-search-drawer {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
      background: white;
      border-top: 1px solid rgba(102, 126, 234, 0.1);

      &.open {
        max-height: 80px;
        padding: 0.75rem 1rem;
      }
    }

    .mobile-search-inner {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      background: #f4f4f8;
      border: 1.5px solid #667eea;
      border-radius: 50px;
      padding: 0.625rem 1rem;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
      cursor: text;

      svg { color: #667eea; flex-shrink: 0; }
    }

    .mobile-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      color: #1e1e2e;
      outline: none;

      &::placeholder { color: #94a3b8; }
    }

    .mobile-search-close {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #64748b;
      padding: 2px;

      &:hover { color: #ef4444; }
    }

    /* ════════════════════════════════════════
       RESPONSIVE
       ════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .search-bar-wrap { max-width: 340px; }
    }

    @media (max-width: 768px) {
      .header-inner {
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
      }

      .search-bar-wrap { display: none; }

      .search-toggle-btn { display: flex; }

      .store-slug { display: none; }
      .store-name { font-size: 1rem; }

      .brand-icon { width: 34px; height: 34px; }

      .btn-label { display: none; }

      .action-btn { padding: 0; width: 42px; height: 42px; border-radius: 50%; justify-content: center; }
      .cart-btn { padding: 0; width: 42px; height: 42px; border-radius: 50%; justify-content: center; }

      .cart-badge {
        top: -6px;
        right: -6px;
      }

      app-language-selector { display: none; }
    }

    @media (max-width: 400px) {
      .brand-icon { width: 30px; height: 30px; }
    }

    /* RTL Support */
    :host-context([dir="rtl"]) {
      .store-brand { flex-direction: row-reverse; }
      .brand-text { text-align: right; }
      .header-actions { flex-direction: row-reverse; }
      .cart-badge { right: auto; left: -9px; }
      .user-dropdown { right: auto; left: 0; }
    }
  `]
})
export class StorefrontHeaderComponent {
  @Input() storeName!: string;
  @Input() storeSlug!: string;
  @Input() storeLogo: string | null = null;
  @Input() storeId!: number; // Neu: für promo-banner
  @Input() cartItemCount = 0;
  @Output() cartClick = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  showAuthDialog = false;
  userMenuOpen = false;
  searchOpen = false;
  searchFocused = false;
  isScrolled = false;
  searchQuery = '';

  isLoggedIn$ = this.authService.currentUser$.pipe(
    map(user => user !== null && user !== undefined)
  );

  constructor(
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 10;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap')) {
      this.userMenuOpen = false;
    }
  }

  logout(): void { this.authService.logout(); }

  onAuthSuccess(): void {
    this.showAuthDialog = false;
  }

  onSearch(): void {
    this.searchChange.emit(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchChange.emit('');
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.searchQuery = '';
    this.searchChange.emit('');
  }
}
