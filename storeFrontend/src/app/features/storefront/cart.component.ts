import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService, Cart, CartItem } from '../../core/services/cart.service';
import { PlaceholderImageUtil } from '../../shared/utils/placeholder-image.util';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cart-container">
      <div class="cart-header">
        <h1>Warenkorb</h1>
        <button class="btn-back" (click)="goBack()">
          ← Zurück zum Shop
        </button>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        Warenkorb wird geladen...
      </div>

      <div *ngIf="!loading && cart && cart.items.length === 0" class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h2>Ihr Warenkorb ist leer</h2>
        <p>Fügen Sie Produkte hinzu, um fortzufahren</p>
        <button class="btn btn-primary" (click)="goBack()">
          Weiter einkaufen
        </button>
      </div>

      <div *ngIf="!loading && cart && cart.items.length > 0" class="cart-content">
        <div class="cart-items">
          <div class="cart-item" *ngFor="let item of cart.items">
            <img [src]="item.imageUrl || getProductPlaceholder()" 
                 [alt]="item.productTitle" 
                 class="item-image"
                 (error)="onImageError($event)">
            
            <div class="item-details">
              <h3>{{ item.productTitle }}</h3>
              <p class="variant-name">{{ item.variantSku }}</p>
              <p class="item-price">{{ item.priceSnapshot | number:'1.2-2' }} €</p>
            </div>

            <div class="item-quantity">
              <button class="qty-btn" (click)="decreaseQuantity(item)" [disabled]="updatingItem === item.id">
                -
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button class="qty-btn" (click)="increaseQuantity(item)" [disabled]="updatingItem === item.id">
                +
              </button>
            </div>

            <div class="item-total">
              <p class="total-price">{{ (item.priceSnapshot * item.quantity) | number:'1.2-2' }} €</p>
              <button class="btn-remove" (click)="removeItem(item)" [disabled]="updatingItem === item.id">
                🗑️ Entfernen
              </button>
            </div>
          </div>
        </div>

        <div class="cart-summary">
          <h2>Zusammenfassung</h2>
          
          <div class="summary-row">
            <span>Artikel ({{ cart.itemCount }})</span>
            <span>{{ cart.subtotal | number:'1.2-2' }} €</span>
          </div>
          
          <div class="summary-row">
            <span>Versand</span>
            <span>{{ shipping | number:'1.2-2' }} €</span>
          </div>

          <div class="summary-row total">
            <strong>Gesamt</strong>
            <strong>{{ (cart.subtotal + shipping) | number:'1.2-2' }} €</strong>
          </div>

          <button class="btn btn-primary btn-checkout" (click)="proceedToCheckout()">
            Zur Kasse
          </button>

          <button class="btn btn-secondary" (click)="clearCart()" [disabled]="loading">
            Warenkorb leeren
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .cart-header h1 {
      margin: 0;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-back:hover {
      background: #5a6268;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-cart {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }

    .cart-content {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 30px;
    }

    @media (max-width: 768px) {
      .cart-content {
        grid-template-columns: 1fr;
      }
    }

    .cart-items {
      background: white;
      border-radius: 8px;
      padding: 20px;
    }

    .cart-item {
      display: grid;
      grid-template-columns: 100px 1fr auto auto;
      gap: 20px;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .cart-item:last-child {
      border-bottom: none;
    }

    .item-image {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
    }

    .item-details h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
    }

    .variant-name {
      color: #666;
      margin: 0 0 10px 0;
      font-size: 14px;
    }

    .item-price {
      color: #667eea;
      font-weight: 600;
      margin: 0;
    }

    .item-quantity {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .qty-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
    }

    .qty-btn:hover:not(:disabled) {
      background: #f5f5f5;
    }

    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .qty-value {
      min-width: 30px;
      text-align: center;
      font-weight: 600;
    }

    .item-total {
      text-align: right;
    }

    .total-price {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 10px 0;
    }

    .btn-remove {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-remove:hover:not(:disabled) {
      background: #c82333;
    }

    .btn-remove:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cart-summary {
      background: white;
      border-radius: 8px;
      padding: 20px;
      height: fit-content;
      position: sticky;
      top: 20px;
    }

    .cart-summary h2 {
      margin-top: 0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .summary-row.total {
      border-top: 2px solid #333;
      border-bottom: none;
      margin-top: 10px;
      padding-top: 20px;
      font-size: 20px;
    }

    .btn-checkout {
      width: 100%;
      margin-top: 20px;
      padding: 15px;
      font-size: 16px;
    }

    .btn-secondary {
      width: 100%;
      margin-top: 10px;
      background: #6c757d;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }
  `]
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  loading = false;
  updatingItem: number | null = null;
  shipping = 4.99;
  storeId: number = 1; // Wird aus Route/Service geladen

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // TODO: storeId aus Route oder Store-Service laden
    this.loadCart();
  }

  loadCart(): void {
    this.loading = true;
    this.cartService.getCart(this.storeId).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden des Warenkorbs:', error);
        this.loading = false;
      }
    });
  }

  increaseQuantity(item: CartItem): void {
    this.updatingItem = item.id;
    this.cartService.updateItem(item.id, item.quantity + 1).subscribe({
      next: () => {
        this.loadCart();
        this.updatingItem = null;
      },
      error: (error) => {
        console.error('Fehler beim Aktualisieren:', error);
        this.updatingItem = null;
      }
    });
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      this.removeItem(item);
      return;
    }

    this.updatingItem = item.id;
    this.cartService.updateItem(item.id, item.quantity - 1).subscribe({
      next: () => {
        this.loadCart();
        this.updatingItem = null;
      },
      error: (error) => {
        console.error('Fehler beim Aktualisieren:', error);
        this.updatingItem = null;
      }
    });
  }

  removeItem(item: CartItem): void {
    if (!confirm(`${item.productTitle} aus dem Warenkorb entfernen?`)) {
      return;
    }

    this.updatingItem = item.id;
    this.cartService.removeItem(item.id).subscribe({
      next: () => {
        this.loadCart();
        this.updatingItem = null;
      },
      error: (error) => {
        console.error('Fehler beim Entfernen:', error);
        this.updatingItem = null;
      }
    });
  }

  clearCart(): void {
    if (!confirm('Möchten Sie den gesamten Warenkorb leeren?')) {
      return;
    }

    this.loading = true;
    this.cartService.clearCart(this.storeId).subscribe({
      next: () => {
        this.loadCart();
      },
      error: (error) => {
        console.error('Fehler beim Leeren des Warenkorbs:', error);
        this.loading = false;
      }
    });
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goBack(): void {
    this.router.navigate(['/storefront']);
  }

  get cartItemCount(): number {
    return this.cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  getProductPlaceholder(): string {
    return PlaceholderImageUtil.getProductPlaceholder();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = this.getProductPlaceholder();
  }
}
