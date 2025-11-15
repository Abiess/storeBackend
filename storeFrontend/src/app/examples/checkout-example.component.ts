// Beispiel: Integration des Coupon-Features in eine Checkout-Komponente

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CouponInputComponent } from '../../shared/components/coupon-input/coupon-input.component';
import { CouponService, ValidateCouponsResponse } from '../../core/services/coupon.service';

@Component({
  selector: 'app-checkout-example',
  standalone: true,
  imports: [CommonModule, CouponInputComponent],
  template: `
    <div class="checkout-container">
      <h2>Warenkorb</h2>
      
      <!-- Cart Items -->
      <div class="cart-items">
        <div *ngFor="let item of cart.items" class="cart-item">
          {{ item.productName }} - {{ item.quantity }}x {{ formatPrice(item.priceCents) }}
        </div>
      </div>

      <!-- Coupon Input -->
      <app-coupon-input 
        [storeId]="storeId"
        [cart]="cart"
        [domainHost]="domainHost"
        (couponsApplied)="onCouponsApplied($event)">
      </app-coupon-input>

      <!-- Order Summary -->
      <div class="order-summary">
        <div class="summary-line">
          <span>Zwischensumme:</span>
          <span>{{ formatPrice(subtotalCents) }}</span>
        </div>
        <div class="summary-line discount" *ngIf="discountCents > 0">
          <span>Rabatt:</span>
          <span>-{{ formatPrice(discountCents) }}</span>
        </div>
        <div class="summary-line total">
          <strong>Gesamt:</strong>
          <strong>{{ formatPrice(totalCents) }}</strong>
        </div>
      </div>

      <button (click)="placeOrder()" class="checkout-button">
        Bestellung abschließen
      </button>
    </div>
  `
})
export class CheckoutExampleComponent implements OnInit {
  storeId = 1;
  domainHost = window.location.hostname;

  cart = {
    currency: 'EUR',
    subtotalCents: 10000,
    customerEmail: 'kunde@example.com',
    items: [
      {
        productId: 1,
        productName: 'Produkt A',
        priceCents: 5000,
        quantity: 2,
        categoryIds: [1],
        collectionIds: []
      }
    ]
  };

  subtotalCents = 10000;
  discountCents = 0;
  totalCents = 10000;
  appliedCouponCodes: string[] = [];

  constructor(private couponService: CouponService) {}

  ngOnInit(): void {
    // Initial calculation
    this.calculateTotals();
  }

  onCouponsApplied(response: ValidateCouponsResponse): void {
    console.log('Coupons applied:', response);

    this.discountCents = response.cartTotals.discountCents;
    this.totalCents = response.cartTotals.totalCents;
    this.appliedCouponCodes = response.validCoupons.map(c => c.code);
  }

  placeOrder(): void {
    // 1. Create order
    const orderId = 123; // From your order creation API

    // 2. Finalize coupons
    const request = {
      domainHost: this.domainHost,
      cart: this.cart,
      appliedCodes: this.appliedCouponCodes
    };

    this.couponService.finalizeCoupons(this.storeId, orderId, request).subscribe({
      next: () => {
        console.log('✅ Order placed, coupons finalized');
        // Redirect to order confirmation
      },
      error: (err) => {
        console.error('❌ Failed to finalize coupons', err);
      }
    });
  }

  calculateTotals(): void {
    this.subtotalCents = this.cart.items.reduce((sum, item) =>
      sum + (item.priceCents * item.quantity), 0
    );
    this.totalCents = this.subtotalCents - this.discountCents;
  }

  formatPrice(cents: number): string {
    return `${(cents / 100).toFixed(2)} €`;
  }
}

