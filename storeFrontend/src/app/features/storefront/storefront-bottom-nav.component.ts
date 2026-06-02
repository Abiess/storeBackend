import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule, House, LayoutGrid, Search, ShoppingCart, User } from 'lucide-angular';

/**
 * Mobile Bottom Navigation für den Storefront.
 * Nur auf Screens < 768px sichtbar (via CSS).
 * Tabs: Home | Kategorien | Suche | Warenkorb | Konto
 * Icons via lucide-angular (bereits global via LUCIDE_ICONS in app.config.ts registriert).
 * RTL-fähig via logical properties. Safe-Area via --safe-area-bottom.
 */
@Component({
  selector: 'app-storefront-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LucideAngularModule],
  template: `
    <nav class="bottom-nav" [class.rtl]="isRtl" aria-label="Hauptnavigation">

      <!-- Home -->
      <a class="nav-item"
         routerLink="/"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{exact: true}"
         [attr.aria-label]="'bottomNav.home' | translate">
        <lucide-icon name="house" class="nav-icon" [size]="22" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
        <span class="nav-label">{{ 'bottomNav.home' | translate }}</span>
      </a>

      <!-- Kategorien -->
      <button class="nav-item"
              [class.active]="categoryActive"
              (click)="categoryClick.emit()"
              type="button"
              [attr.aria-label]="'navigation.categories' | translate">
        <lucide-icon name="layout-grid" class="nav-icon" [size]="22" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
        <span class="nav-label">{{ 'navigation.categories' | translate }}</span>
      </button>

      <!-- Suche -->
      <button class="nav-item"
              [class.active]="searchActive"
              (click)="searchClick.emit()"
              type="button"
              [attr.aria-label]="'storefront.filter.search' | translate">
        <lucide-icon name="search" class="nav-icon" [size]="22" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
        <span class="nav-label">{{ 'storefront.filter.search' | translate }}</span>
      </button>

      <!-- Warenkorb -->
      <a class="nav-item"
         routerLink="/cart"
         routerLinkActive="active"
         [attr.aria-label]="'cart.title' | translate">
        <span class="nav-icon-wrap">
          <lucide-icon name="shopping-cart" class="nav-icon" [size]="22" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
          <span class="nav-badge" *ngIf="cartCount > 0" [attr.aria-label]="cartCount + ' Artikel'">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </span>
        <span class="nav-label">{{ 'cart.title' | translate }}</span>
      </a>

      <!-- Konto -->
      <a class="nav-item"
         routerLink="/storefront/profile"
         routerLinkActive="active"
         [attr.aria-label]="'navigation.myAccount' | translate">
        <lucide-icon name="user" class="nav-icon" [size]="22" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
        <span class="nav-label">{{ 'navigation.myAccount' | translate }}</span>
      </a>

    </nav>
  `,
  styles: [`
    /* Nur auf Mobile sichtbar */
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
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        padding-bottom: var(--safe-area-bottom, 0px);
        box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.07);
        height: calc(var(--bottom-nav-height, 60px) + var(--safe-area-bottom, 0px));
      }

      .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 8px 4px;
        text-decoration: none;
        color: #6b7280;
        font-size: 10px;
        font-weight: 500;
        border: none;
        background: none;
        cursor: pointer;
        position: relative;
        transition: color 0.15s ease;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .nav-item.active { color: #667eea; }

      /* Aktiver Indikator: Linie oben */
      .nav-item.active::before {
        content: '';
        position: absolute;
        top: 0;
        left: 20%;
        right: 20%;
        height: 2px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 0 0 2px 2px;
        animation: slideDown 0.2s ease;
      }

      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }

      /* Lucide Icon – lucide-icon rendert intern ein <svg> */
      .nav-icon {
        width: 22px !important;
        height: 22px !important;
        transition: transform 0.15s ease;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nav-icon ::ng-deep svg {
        width: 22px;
        height: 22px;
      }
      .nav-item.active .nav-icon { transform: scale(1.12); }

      .nav-label {
        font-size: 10px;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 56px;
      }

      /* Badge */
      .nav-icon-wrap {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-badge {
        position: absolute;
        top: -6px;
        inset-inline-end: -8px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        border: 1.5px solid #fff;
        animation: badgePop 0.2s ease;
      }

      @keyframes badgePop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
    }
  `]
})
export class StorefrontBottomNavComponent {
  /** Anzahl der Artikel im Warenkorb */
  @Input() cartCount = 0;
  /** Kategorien-Tab als aktiv markieren */
  @Input() categoryActive = false;
  /** Suche-Tab als aktiv markieren */
  @Input() searchActive = false;

  @Output() categoryClick = new EventEmitter<void>();
  @Output() searchClick = new EventEmitter<void>();

  // Lucide Icons – wird durch LUCIDE_ICONS Provider in app.config.ts bereitgestellt
  readonly icons = { House, LayoutGrid, Search, ShoppingCart, User };

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }
}
