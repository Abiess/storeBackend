import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StorefrontAuthDialogComponent } from './storefront-auth-dialog.component';

@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [CommonModule, RouterModule, StorefrontAuthDialogComponent],
  template: `
    <header class="store-header">
      <div class="container">
        <div class="header-content">
          <h1 class="store-name">{{ storeName }}</h1>
          <p class="store-tagline">{{ storeSlug }}.markt.ma</p>
        </div>
        <div class="header-actions">
          <!-- Login/Register Button -->
          <button 
            *ngIf="!(isLoggedIn$ | async)" 
            class="btn btn-login" 
            (click)="showAuthDialog = true"
            aria-label="Anmelden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor"/>
            </svg>
            <span>Anmelden</span>
          </button>
          
          <!-- User Menu wenn eingeloggt -->
          <div *ngIf="isLoggedIn$ | async" class="user-menu">
            <a routerLink="/storefront/profile" class="btn btn-profile" aria-label="Mein Konto">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor"/>
              </svg>
              <span>Konto</span>
            </a>
            <button class="btn btn-logout" (click)="logout()" aria-label="Abmelden">
              Abmelden
            </button>
          </div>
          
          <button class="btn btn-cart" (click)="cartClick.emit()" aria-label="Warenkorb anzeigen">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 1h2.59l.83 2H17a1 1 0 01.97 1.24l-2 7A1 1 0 0115 12H8.36l-.5 2H14a1 1 0 110 2H7a1 1 0 01-.97-1.24l.5-2H4a1 1 0 01-1-1V3H2a1 1 0 110-2zm5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor"/>
            </svg>
            <span class="cart-badge" *ngIf="cartItemCount > 0">{{ cartItemCount }}</span>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Auth Dialog -->
    <app-storefront-auth-dialog
      *ngIf="showAuthDialog"
      [isLogin]="true"
      (close)="showAuthDialog = false"
      (success)="onAuthSuccess()"
    ></app-storefront-auth-dialog>
  `,
  styles: [`
    /* ==================== MODERN STORE HEADER ==================== */
    .store-header {
      background: white;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1.5rem 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 clamp(1rem, 5vw, 3rem);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }
    
    .header-content { 
      flex: 1; 
    }
    
    .store-name {
      margin: 0 0 0.25rem;
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      color: #1d1d1f;
      letter-spacing: -0.02em;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .store-tagline { 
      margin: 0; 
      color: #6e6e73;
      font-size: 0.875rem;
      font-weight: 400;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 980px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      font-size: 0.9375rem;
      letter-spacing: -0.01em;
      
      svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
    }
    
    .btn-login {
      background: #f5f5f7;
      color: #1d1d1f;
      border: 1px solid rgba(0, 0, 0, 0.06);
      
      &:hover {
        background: #e8e8ed;
        border-color: rgba(0, 0, 0, 0.1);
      }
    }
    
    .btn-cart {
      background: #0071e3;
      color: white;
      position: relative;
      box-shadow: 0 2px 8px rgba(0, 113, 227, 0.25);
      
      &:hover { 
        background: #0077ed;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 113, 227, 0.35);
      }
      
      &:active {
        transform: scale(0.98);
      }
    }
    
    .cart-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: #ff3b30;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .btn-profile {
      background: #f5f5f7;
      color: #1d1d1f;
      border: 1px solid rgba(0, 0, 0, 0.06);
      text-decoration: none;
      
      &:hover {
        background: #e8e8ed;
        border-color: rgba(0, 0, 0, 0.1);
      }
    }
    
    .btn-logout {
      background: transparent;
      color: #6e6e73;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      
      &:hover {
        background: #f5f5f7;
        color: #1d1d1f;
      }
    }
    
    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .store-header { 
        padding: 1rem 0; 
      }
      
      .container {
        gap: 1rem;
      }
      
      .btn span:not(.cart-badge) {
        display: none;
      }
      
      .btn {
        padding: 0.625rem;
        min-width: 44px;
        justify-content: center;
      }
      
      .store-tagline {
        font-size: 0.8125rem;
      }
    }
  `]
})
export class StorefrontHeaderComponent {
  @Input() storeName = '';
  @Input() storeSlug = '';
  @Input() cartItemCount = 0;
  @Output() cartClick = new EventEmitter<void>();

  showAuthDialog = false;

  isLoggedIn$ = this.authService.currentUser$.pipe(
    map(user => user !== null && user !== undefined)
  );

  currentUser$ = this.authService.currentUser$;

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  onAuthSuccess(): void {
    this.showAuthDialog = false;
    console.log('✅ User erfolgreich angemeldet');
  }
}
