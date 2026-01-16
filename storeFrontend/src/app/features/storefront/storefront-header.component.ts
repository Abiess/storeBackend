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
          >
            👤 Anmelden
          </button>
          
          <!-- User Menu wenn eingeloggt -->
          <div *ngIf="isLoggedIn$ | async" class="user-menu">
            <a routerLink="/storefront/profile" class="btn btn-profile">
              👤 Mein Konto
            </a>
            <button class="btn btn-logout" (click)="logout()">
              🚪 Abmelden
            </button>
          </div>
          
          <button class="btn btn-cart" (click)="cartClick.emit()">
            🛒 Warenkorb <span class="cart-badge">{{ cartItemCount }}</span>
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
    .store-header {
      background: linear-gradient(135deg, var(--theme-primary, #667eea) 0%, var(--theme-secondary, #764ba2) 100%);
      color: white;
      padding: 2rem 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .header-content { 
      flex: 1; 
    }
    
    .store-name {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 700;
      font-family: var(--theme-heading-font-family, var(--theme-font-family, inherit));
    }
    
    .store-tagline { 
      margin: 0; 
      opacity: 0.9; 
      font-size: 0.9375rem; 
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: var(--theme-border-radius, 8px);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      white-space: nowrap;
    }
    
    .btn-login {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .btn-login:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .btn-cart {
      background: white;
      color: var(--theme-primary, #667eea);
    }
    
    .btn-cart:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
    }
    
    .cart-badge {
      background: var(--theme-primary, #667eea);
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }
    
    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .btn-profile {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      text-decoration: none;
    }
    
    .btn-profile:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .btn-logout {
      background: rgba(255, 255, 255, 0.9);
      color: var(--theme-primary, #667eea);
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
    
    .btn-logout:hover {
      background: white;
      transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
      .store-name { 
        font-size: 1.5rem; 
      }
      
      .store-header { 
        padding: 1.5rem 0; 
      }
      
      .header-actions {
        width: 100%;
        justify-content: center;
      }
      
      .user-email {
        display: none;
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
    map(user => !!user)
  );
  currentUser$ = this.authService.currentUser$;

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  onAuthSuccess(): void {
    console.log('✅ User erfolgreich angemeldet');
    // Dialog wird automatisch geschlossen durch (close) Event
  }
}
