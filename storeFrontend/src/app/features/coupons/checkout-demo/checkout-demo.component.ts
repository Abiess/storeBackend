import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { CouponInputComponent } from '../../../shared/components/coupon-input/coupon-input.component';
import { ValidateCouponsResponse } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-checkout-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    CouponInputComponent
  ],
  template: `
    <div class="checkout-container">
      <div class="checkout-header">
        <h1>
          <mat-icon>shopping_cart</mat-icon>
          Kasse - Store Demo
        </h1>
        <p class="mock-badge">🎭 Mock-Modus aktiv</p>
      </div>

      <div class="checkout-grid">
        <!-- Warenkorb -->
        <div class="cart-section">
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-icon>shopping_basket</mat-icon>
                Warenkorb
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-list>
                <mat-list-item *ngFor="let item of cartItems">
                  <img matListItemAvatar [src]="item.image" [alt]="item.name">
                  <div matListItemTitle>{{ item.name }}</div>
                  <div matListItemLine>{{ item.quantity }}x {{ formatPrice(item.price) }}</div>
                  <div matListItemMeta>{{ formatPrice(item.price * item.quantity) }}</div>
                </mat-list-item>
              </mat-list>

              <mat-divider></mat-divider>

              <div class="cart-actions">
                <button mat-stroked-button (click)="addRandomItem()">
                  <mat-icon>add_shopping_cart</mat-icon>
                  Artikel hinzufügen
                </button>
                <button mat-stroked-button color="warn" (click)="clearCart()" *ngIf="cartItems.length > 0">
                  <mat-icon>clear</mat-icon>
                  Warenkorb leeren
                </button>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Gutschein-Eingabe -->
          <mat-card class="coupon-section">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>local_offer</mat-icon>
                Gutschein einlösen
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <app-coupon-input
                [storeId]="storeId"
                [cart]="getCartData()"
                [domainHost]="domainHost"
                (couponsApplied)="onCouponsApplied($event)">
              </app-coupon-input>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Bestellübersicht -->
        <div class="summary-section">
          <mat-card class="summary-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>receipt_long</mat-icon>
                Bestellübersicht
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-details">
                <div class="summary-line">
                  <span>Zwischensumme:</span>
                  <span>{{ formatPrice(subtotalCents / 100) }}</span>
                </div>
                
                <div class="summary-line discount" *ngIf="discountCents > 0">
                  <span>
                    <mat-icon>local_offer</mat-icon>
                    Rabatt:
                  </span>
                  <span class="discount-amount">-{{ formatPrice(discountCents / 100) }}</span>
                </div>

                <div class="summary-line" *ngIf="appliedCoupons.length > 0">
                  <div class="applied-coupons-list">
                    <small *ngFor="let coupon of appliedCoupons" class="coupon-tag">
                      {{ coupon.code }}: -{{ formatPrice(coupon.discountCents / 100) }}
                    </small>
                  </div>
                </div>

                <div class="summary-line">
                  <span>Versand:</span>
                  <span>{{ hasFreeShipping ? 'GRATIS' : formatPrice(shippingCents / 100) }}</span>
                </div>

                <div class="summary-line">
                  <span>MwSt. (19%):</span>
                  <span>{{ formatPrice(taxCents / 100) }}</span>
                </div>

                <mat-divider></mat-divider>

                <div class="summary-line total">
                  <strong>Gesamtsumme:</strong>
                  <strong class="total-amount">{{ formatPrice(totalCents / 100) }}</strong>
                </div>
              </div>

              <button 
                mat-raised-button 
                color="primary" 
                class="checkout-button"
                [disabled]="cartItems.length === 0"
                (click)="completeOrder()">
                <mat-icon>check_circle</mat-icon>
                Zahlungspflichtig bestellen
              </button>

              <div class="trust-badges">
                <div class="badge">
                  <mat-icon>lock</mat-icon>
                  <span>Sichere Zahlung</span>
                </div>
                <div class="badge">
                  <mat-icon>local_shipping</mat-icon>
                  <span>Schneller Versand</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Verfügbare Gutscheine (Hilfe) -->
          <mat-card class="help-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>help_outline</mat-icon>
                Verfügbare Test-Gutscheine
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="test-coupons">
                <div class="test-coupon" *ngFor="let coupon of testCoupons">
                  <strong>{{ coupon.code }}</strong>
                  <span>{{ coupon.description }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Erfolgs-Modal -->
      <div class="success-overlay" *ngIf="orderComplete">
        <mat-card class="success-card">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <h2>Bestellung erfolgreich!</h2>
          <p>Bestellnummer: #{{ orderId }}</p>
          <p class="savings" *ngIf="discountCents > 0">
            Sie haben {{ formatPrice(discountCents / 100) }} gespart!
          </p>
          <div class="success-actions">
            <button mat-raised-button color="primary" (click)="resetDemo()">
              <mat-icon>replay</mat-icon>
              Neue Demo starten
            </button>
            <button mat-stroked-button (click)="goToCouponList()">
              <mat-icon>list</mat-icon>
              Gutscheine verwalten
            </button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .checkout-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 24px;
    }

    .checkout-header {
      text-align: center;
      margin-bottom: 32px;

      h1 {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 36px;
        font-weight: 700;
        color: #1a237e;
        margin: 0 0 8px;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: #3f51b5;
        }
      }

      .mock-badge {
        display: inline-block;
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
      }
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    mat-card {
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    mat-card-header {
      margin-bottom: 16px;

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 600;
        color: #1a237e;

        mat-icon {
          color: #3f51b5;
        }
      }
    }

    .cart-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    mat-list-item {
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 0;

      img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
      }
    }

    .cart-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .summary-card {
      position: sticky;
      top: 24px;
    }

    .summary-details {
      .summary-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        font-size: 15px;

        &.discount {
          color: #4caf50;
          font-weight: 500;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            vertical-align: middle;
            margin-right: 4px;
          }

          .discount-amount {
            font-weight: 600;
            font-size: 16px;
          }
        }

        &.total {
          font-size: 20px;
          padding-top: 16px;

          .total-amount {
            color: #1a237e;
            font-size: 24px;
          }
        }
      }

      .applied-coupons-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;

        .coupon-tag {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
      }
    }

    .checkout-button {
      width: 100%;
      height: 56px;
      font-size: 18px;
      font-weight: 600;
      margin-top: 24px;
      box-shadow: 0 4px 12px rgba(63, 81, 181, 0.3);

      mat-icon {
        margin-right: 8px;
      }

      &:hover:not(:disabled) {
        box-shadow: 0 6px 16px rgba(63, 81, 181, 0.4);
        transform: translateY(-2px);
      }
    }

    .trust-badges {
      display: flex;
      justify-content: space-around;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;

      .badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #757575;

        mat-icon {
          color: #4caf50;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }
    }

    .help-card {
      margin-top: 24px;

      .test-coupons {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .test-coupon {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 8px;
          border-left: 4px solid #3f51b5;

          strong {
            color: #1a237e;
            font-size: 16px;
            margin-bottom: 4px;
          }

          span {
            color: #757575;
            font-size: 13px;
          }
        }
      }
    }

    .success-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s;

      .success-card {
        max-width: 500px;
        padding: 48px;
        text-align: center;
        animation: slideUp 0.5s;

        .success-icon {
          font-size: 80px;
          width: 80px;
          height: 80px;
          color: #4caf50;
          margin: 0 auto 24px;
        }

        h2 {
          font-size: 32px;
          font-weight: 700;
          color: #1a237e;
          margin: 0 0 16px;
        }

        p {
          font-size: 16px;
          color: #757575;
          margin: 8px 0;

          &.savings {
            font-size: 20px;
            font-weight: 600;
            color: #4caf50;
            margin-top: 16px;
          }
        }

        .success-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;

          button {
            flex: 1;
          }
        }
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1024px) {
      .checkout-grid {
        grid-template-columns: 1fr;
      }

      .summary-card {
        position: static;
      }
    }

    @media (max-width: 768px) {
      .checkout-container {
        padding: 16px;
      }

      .checkout-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class CheckoutDemoComponent implements OnInit {
  storeId = 1;
  domainHost = 'localhost';

  cartItems: any[] = [];
  subtotalCents = 0;
  discountCents = 0;
  shippingCents = 500; // 5€
  taxCents = 0;
  totalCents = 0;

  appliedCoupons: any[] = [];
  hasFreeShipping = false;
  orderComplete = false;
  orderId: string = '';

  testCoupons = [
    { code: 'SAVE20', description: '20% Rabatt (Min. 50€)' },
    { code: 'WELCOME10', description: '10€ Rabatt (Auto-Apply, Min. 30€)' },
    { code: 'FREESHIP', description: 'Kostenloser Versand (Min. 20€)' }
  ];

  availableProducts = [
    { id: 1, name: 'Premium T-Shirt', price: 2999, image: 'https://via.placeholder.com/60?text=T-Shirt' },
    { id: 2, name: 'Designer Jeans', price: 7999, image: 'https://via.placeholder.com/60?text=Jeans' },
    { id: 3, name: 'Sneakers Pro', price: 12999, image: 'https://via.placeholder.com/60?text=Shoes' },
    { id: 4, name: 'Hoodie Deluxe', price: 5999, image: 'https://via.placeholder.com/60?text=Hoodie' },
    { id: 5, name: 'Cap Classic', price: 1999, image: 'https://via.placeholder.com/60?text=Cap' }
  ];

  ngOnInit(): void {
    // Starte mit einem Artikel im Warenkorb
    this.addRandomItem();
    console.log('🛒 Checkout Demo geladen - Mock-Modus aktiv');
  }

  addRandomItem(): void {
    const randomProduct = this.availableProducts[Math.floor(Math.random() * this.availableProducts.length)];
    const existingItem = this.cartItems.find(item => item.id === randomProduct.id);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cartItems.push({
        ...randomProduct,
        quantity: 1
      });
    }

    this.calculateTotals();
  }

  clearCart(): void {
    this.cartItems = [];
    this.calculateTotals();
  }

  getCartData(): any {
    return {
      currency: 'EUR',
      subtotalCents: this.subtotalCents,
      customerEmail: 'demo@example.com',
      items: this.cartItems.map(item => ({
        productId: item.id,
        productName: item.name,
        priceCents: item.price,
        quantity: item.quantity,
        categoryIds: [],
        collectionIds: []
      }))
    };
  }

  onCouponsApplied(response: ValidateCouponsResponse): void {
    console.log('✅ Gutscheine angewendet:', response);

    this.discountCents = response.cartTotals.discountCents;
    this.appliedCoupons = response.validCoupons;

    // Check for free shipping
    this.hasFreeShipping = response.validCoupons.some(c => c.type === 'FREE_SHIPPING');

    this.calculateTotals();
  }

  calculateTotals(): void {
    // Zwischensumme
    this.subtotalCents = this.cartItems.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    // Versand
    const actualShipping = this.hasFreeShipping ? 0 : this.shippingCents;

    // MwSt (19% vom Subtotal minus Rabatt)
    const taxableAmount = Math.max(0, this.subtotalCents - this.discountCents);
    this.taxCents = Math.floor(taxableAmount * 0.19);

    // Gesamt
    this.totalCents = Math.max(0, this.subtotalCents - this.discountCents + actualShipping + this.taxCents);
  }

  completeOrder(): void {
    this.orderId = 'DEMO-' + Math.floor(Math.random() * 100000);
    this.orderComplete = true;
    console.log('🎉 Bestellung abgeschlossen:', this.orderId);
  }

  resetDemo(): void {
    this.cartItems = [];
    this.discountCents = 0;
    this.appliedCoupons = [];
    this.hasFreeShipping = false;
    this.orderComplete = false;
    this.orderId = '';
    this.addRandomItem();
    this.calculateTotals();
  }

  goToCouponList(): void {
    window.location.href = '/dashboard/1/coupons';
  }

  formatPrice(price: number): string {
    return `${price.toFixed(2)} €`;
  }
}

