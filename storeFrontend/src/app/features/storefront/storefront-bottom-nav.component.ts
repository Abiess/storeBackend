import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Mobile Bottom Navigation – Vibrant Redesign
 * Glass morphism background, gradient active indicator, animated icons
 * Floating cart button as center focus action
 */
@Component({
  selector: 'app-storefront-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <nav class="bottom-nav" [class.rtl]="isRtl" role="navigation" aria-label="Hauptnavigation">

      <!-- Home -->
      <a class="nav-item"
         routerLink="/"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{exact: true}"
         [attr.aria-label]="'bottomNav.home' | translate">
        <span class="nav-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </span>
        <span class="nav-label">{{ 'bottomNav.home' | translate }}</span>
      </a>

      <!-- Kategorien -->
      <button class="nav-item"
              [class.active]="categoryActive"
              (click)="categoryClick.emit()"
              type="button"
              [attr.aria-label]="'navigation.categories' | translate">
        <span class="nav-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </span>
        <span class="nav-label">{{ 'navigation.categories' | translate }}</span>
      </button>

      <!-- Warenkorb (Floating Center) -->
      <a class="nav-item nav-item-cart"
         routerLink="/cart"
         [attr.aria-label]="'cart.title' | translate">
        <span class="cart-float-btn">
          <!-- Ripple ring -->
          <span class="cart-ring" *ngIf="cartCount > 0" aria-hidden="true"></span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="nav-badge" *ngIf="cartCount > 0" [attr.aria-label]="cartCount + ' Artikel im Warenkorb'">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </span>
        <span class="nav-label">{{ 'cart.title' | translate }}</span>
      </a>

      <!-- Suche -->
      <button class="nav-item"
              [class.active]="searchActive"
              (click)="searchClick.emit()"
              type="button"
              [attr.aria-label]="'storefront.filter.search' | translate">
        <span class="nav-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <span class="nav-label">{{ 'storefront.filter.search' | translate }}</span>
      </button>

      <!-- Konto -->
      <a class="nav-item"
         routerLink="/storefront/profile"
         routerLinkActive="active"
         [attr.aria-label]="'navigation.myAccount' | translate">
        <span class="nav-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </span>
        <span class="nav-label">{{ 'navigation.myAccount' | translate }}</span>
      </a>

    </nav>
  `,
  styles: [`
    /* Only on Mobile */
    .bottom-nav { display: none; }

    @media (max-width: 767px) {
      .bottom-nav {
        display: flex;
        align-items: stretch;
        position: fixed;
        bottom: 0;
        inset-inline-start: 0;
        inset-inline-end: 0;
        z-index: 900;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-top: 1px solid rgba(102, 126, 234, 0.1);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        height: calc(64px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -8px 32px rgba(102, 126, 234, 0.12),
                    0 -2px 8px rgba(0, 0, 0, 0.06);
      }

      /* ── NAV ITEMS ── */
      .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 6px 4px;
        text-decoration: none;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 500;
        border: none;
        background: none;
        cursor: pointer;
        position: relative;
        transition: color 0.25s ease;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        letter-spacing: 0.01em;
      }

      .nav-item.active {
        color: #667eea;
      }

      /* Active top line with gradient */
      .nav-item.active::before {
        content: '';
        position: absolute;
        top: 0;
        left: 15%;
        right: 15%;
        height: 2.5px;
        background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
        border-radius: 0 0 3px 3px;
        animation: slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }

      /* ── ICON BOX ── */
      .nav-icon-box {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

        svg {
          width: 22px;
          height: 22px;
          transition: stroke 0.25s ease;
        }
      }

      .nav-item.active .nav-icon-box {
        transform: translateY(-3px) scale(1.15);
        background: rgba(102, 126, 234, 0.1);

        svg { stroke: #667eea; }
      }

      .nav-label {
        font-size: 9px;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 60px;
        transition: color 0.25s;
      }

      /* ── FLOATING CART BUTTON ── */
      .nav-item-cart {
        position: relative;
        flex: 1.2;
      }

      .cart-float-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 60%, #f093fb 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        box-shadow:
          0 4px 16px rgba(102, 126, 234, 0.5),
          0 2px 6px rgba(118, 75, 162, 0.3);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin-top: -16px;
        border: 3px solid white;

        svg { width: 22px; height: 22px; stroke: white; }
      }

      .nav-item-cart:active .cart-float-btn {
        transform: scale(0.93);
      }

      /* Pulsing ring when cart has items */
      .cart-ring {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid rgba(102, 126, 234, 0.4);
        animation: cartRing 2s ease-in-out infinite;
      }

      @keyframes cartRing {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50%       { transform: scale(1.15); opacity: 0; }
      }

      /* ── CART BADGE ── */
      .nav-badge {
        position: absolute;
        top: -2px;
        inset-inline-end: -2px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
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

      /* Active indicator override for cart */
      .nav-item-cart::before { display: none; }
      .nav-item-cart .nav-label {
        color: #667eea;
        font-weight: 600;
      }
    }
  `]
})
export class StorefrontBottomNavComponent {
  @Input() cartCount = 0;
  @Input() categoryActive = false;
  @Input() searchActive = false;

  @Output() categoryClick = new EventEmitter<void>();
  @Output() searchClick = new EventEmitter<void>();

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }
}
