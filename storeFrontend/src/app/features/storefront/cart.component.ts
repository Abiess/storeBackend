import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, Cart, CartItem } from '../../core/services/cart.service';
import { SubdomainService } from '../../core/services/subdomain.service';
import { PlaceholderImageUtil } from '../../shared/utils/placeholder-image.util';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="cart-page">

      <!-- Header -->
      <div class="cart-header">
        <button class="back-btn" (click)="goBack()">
          {{ 'cart.continueShopping' | translate }}
        </button>
        <h1 class="cart-title">
          🛒 {{ 'cart.title' | translate }}
          <span class="item-badge" *ngIf="cartItemCount > 0">{{ cartItemCount }}</span>
        </h1>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner-ring"></div>
        <p>{{ 'cart.loading' | translate }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && (!cart || cart.items.length === 0)" class="empty-state">
        <div class="empty-icon">🛍️</div>
        <h2>{{ 'cart.empty' | translate }}</h2>
        <p>{{ 'cart.emptyAdd' | translate }}</p>
        <button class="btn-primary" (click)="goBack()">{{ 'cart.continueShopping' | translate }}</button>
      </div>

      <!-- Cart Content -->
      <div *ngIf="!loading && cart && cart.items.length > 0" class="cart-layout">

        <!-- Items Column -->
        <div class="items-column">
          <div class="items-wrapper">
            <div class="items-header">
              <span>{{ 'cart.product' | translate }}</span>
              <span>{{ 'cart.quantity' | translate }}</span>
              <span>{{ 'product.price' | translate }}</span>
            </div>

            <div
              *ngFor="let item of cart.items; trackBy: trackItem"
              class="cart-card"
              [class.updating]="updatingItem === item.id">

              <!-- Product Image -->
              <div class="card-image">
                <img
                  [src]="item.imageUrl || getPlaceholder()"
                  [alt]="item.productTitle"
                  (error)="onImgError($event)">
              </div>

              <!-- Product Info -->
              <div class="card-info">
                <h3 class="product-name">{{ item.productTitle }}</h3>
                <p class="variant-label" *ngIf="item.variantSku">
                  <span class="variant-dot"></span>{{ item.variantSku }}
                </p>
                <p class="unit-price">{{ getItemPrice(item) | number:'1.2-2' }} € / {{ 'cart.unit' | translate }}</p>
              </div>

              <!-- Quantity Controls -->
              <div class="card-qty">
                <div class="qty-control">
                  <button
                    class="qty-btn minus"
                    (click)="decreaseQuantity(item)"
                    [disabled]="updatingItem === item.id">
                    −
                  </button>
                  <span class="qty-display">{{ item.quantity }}</span>
                  <button
                    class="qty-btn plus"
                    (click)="increaseQuantity(item)"
                    [disabled]="updatingItem === item.id">
                    +
                  </button>
                </div>
                <button
                  class="remove-btn"
                  (click)="removeItem(item)"
                  [disabled]="updatingItem === item.id"
                  [title]="'cart.remove' | translate">
                  🗑
                </button>
              </div>

              <!-- Line Total -->
              <div class="card-total">
                <span class="line-total">
                  {{ (getItemPrice(item) * item.quantity) | number:'1.2-2' }} €
                </span>
              </div>

              <!-- Loading Overlay -->
              <div *ngIf="updatingItem === item.id" class="card-loading">
                <div class="dot-spinner">
                  <div></div><div></div><div></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Clear Cart -->
          <div class="clear-row">
            <button class="btn-ghost" (click)="clearCart()">
              🗑 {{ 'cart.clearCart' | translate }}
            </button>
          </div>
        </div>

        <!-- Summary Column -->
        <div class="summary-column">
          <div class="summary-card">
            <h2 class="summary-title">{{ 'cart.summary' | translate }}</h2>

            <!-- Item Lines -->
            <div class="summary-lines">
              <div class="summary-line" *ngFor="let item of cart.items">
                <span class="line-name">
                  {{ item.productTitle }}
                  <em>× {{ item.quantity }}</em>
                </span>
                <span class="line-price">
                  {{ (getItemPrice(item) * item.quantity) | number:'1.2-2' }} €
                </span>
              </div>
            </div>

            <div class="summary-divider"></div>

            <!-- Subtotal -->
            <div class="summary-row">
              <span>{{ 'cart.subtotal' | translate }}</span>
              <span>{{ computedSubtotal | number:'1.2-2' }} €</span>
            </div>

            <!-- Shipping -->
            <div class="summary-row">
              <span>{{ 'cart.shipping' | translate }}</span>
              <span class="shipping-free" *ngIf="computedSubtotal >= 50">{{ 'cart.freeShipping' | translate }} 🎉</span>
              <span *ngIf="computedSubtotal < 50">{{ shipping | number:'1.2-2' }} €</span>
            </div>

            <div *ngIf="computedSubtotal < 50" class="free-shipping-hint">
              <div class="free-bar-track">
                <div class="free-bar-fill" [style.width.%]="(computedSubtotal / 50) * 100"></div>
              </div>
              <p>{{ 'cart.freeShippingHint' | translate:{ amount: ((50 - computedSubtotal) | number:'1.2-2') } }}</p>
            </div>

            <div class="summary-divider"></div>

            <!-- Total -->
            <div class="summary-total">
              <span>{{ 'cart.total' | translate }}</span>
              <span class="total-amount">
                {{ (computedSubtotal + shippingCost) | number:'1.2-2' }} €
              </span>
            </div>
            <p class="tax-note">{{ 'cart.inclTax' | translate }}</p>

            <!-- Checkout Button -->
            <button class="btn-checkout" (click)="proceedToCheckout()">
              🔒 {{ 'cart.checkout' | translate }}
            </button>

            <!-- Trust Badges -->
            <div class="trust-row">
              <span>🔒 {{ 'cart.securePayment' | translate }}</span>
              <span>↩ {{ 'cart.easyReturns' | translate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div *ngIf="toast" class="toast" [class.toast-show]="toast">
        {{ toast }}
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────── */
    .cart-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 1rem 4rem;
      min-height: 60vh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* ── Header ─────────────────────────────────── */
    .cart-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .back-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.5rem 0;
      white-space: nowrap;
      transition: color 0.2s;
    }
    .back-btn:hover { color: #764ba2; }

    .cart-title {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .item-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      width: 26px;
      height: 26px;
      border-radius: 50%;
    }

    /* ── Loading ─────────────────────────────────── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 5rem 0;
      color: #888;
    }

    .spinner-ring {
      width: 48px;
      height: 48px;
      border: 4px solid #e8ecff;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Empty State ─────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 5rem 1rem;
    }
    .empty-icon { font-size: 5rem; margin-bottom: 1rem; }
    .empty-state h2 { font-size: 1.5rem; color: #333; margin: 0 0 0.5rem; }
    .empty-state p  { color: #888; margin: 0 0 2rem; }

    /* ── Grid Layout ─────────────────────────────── */
    .cart-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 2rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .cart-layout { grid-template-columns: 1fr; }
    }

    /* ── Items Column ────────────────────────────── */
    .items-wrapper {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      overflow: hidden;
    }

    .items-header {
      display: grid;
      grid-template-columns: 80px 1fr 140px 110px;
      gap: 1rem;
      padding: 0.85rem 1.5rem;
      background: #f7f8ff;
      border-bottom: 1px solid #edf0ff;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #888;
    }
    .items-header span:first-child { grid-column: span 2; }

    /* ── Cart Card ───────────────────────────────── */
    .cart-card {
      display: grid;
      grid-template-columns: 80px 1fr 140px 110px;
      gap: 1rem;
      align-items: center;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid #f2f2f2;
      position: relative;
      transition: background 0.2s;
    }
    .cart-card:last-child { border-bottom: none; }
    .cart-card.updating { opacity: 0.6; pointer-events: none; }

    .card-image img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid #eee;
    }

    .card-info {
      padding-right: 0.5rem;
    }

    .product-name {
      margin: 0 0 0.3rem;
      font-size: 1rem;
      font-weight: 600;
      color: #1a1a2e;
      line-height: 1.3;
    }

    .variant-label {
      margin: 0 0 0.4rem;
      font-size: 0.82rem;
      color: #888;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .variant-dot {
      width: 6px; height: 6px;
      background: #667eea;
      border-radius: 50%;
      display: inline-block;
    }

    .unit-price {
      margin: 0;
      font-size: 0.85rem;
      color: #667eea;
      font-weight: 600;
    }

    /* ── Qty Control ─────────────────────────────── */
    .card-qty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .qty-control {
      display: flex;
      align-items: center;
      gap: 0;
      border: 1.5px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
    }

    .qty-btn {
      width: 44px;   /* Touch-Target: 44px (war 36px) */
      height: 44px;
      background: #f8f8f8;
      border: none;
      font-size: 1.2rem;
      font-weight: 600;
      color: #555;
      cursor: pointer;
      transition: all 0.15s;
      line-height: 1;
    }
    .qty-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
    .qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .qty-display {
      width: 40px;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
      color: #1a1a2e;
      background: white;
    }

    .remove-btn {
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      opacity: 0.5;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .remove-btn:hover:not(:disabled) {
      opacity: 1;
      background: #ffeef0;
    }

    /* ── Line Total ──────────────────────────────── */
    .card-total {
      text-align: right;
    }
    .line-total {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    /* ── Card Loading Overlay ────────────────────── */
    .card-loading {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0;
    }

    .dot-spinner {
      display: flex;
      gap: 6px;
    }
    .dot-spinner div {
      width: 8px; height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 0.6s ease-in-out infinite;
    }
    .dot-spinner div:nth-child(2) { animation-delay: 0.1s; }
    .dot-spinner div:nth-child(3) { animation-delay: 0.2s; }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-8px); }
    }

    /* ── Clear Row ───────────────────────────────── */
    .clear-row {
      display: flex;
      justify-content: flex-end;
      padding: 1rem 1.5rem 0;
    }

    .btn-ghost {
      background: none;
      border: 1.5px solid #e0e0e0;
      color: #999;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-ghost:hover {
      border-color: #ff4d6d;
      color: #ff4d6d;
    }

    /* ── Summary Card ────────────────────────────── */
    .summary-column {
      position: sticky;
      top: 1.5rem;
    }

    .summary-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      padding: 1.5rem;
    }

    .summary-title {
      margin: 0 0 1.2rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    /* Item lines in summary */
    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: #555;
    }
    .line-name { flex: 1; }
    .line-name em { color: #999; font-style: normal; }
    .line-price { font-weight: 600; white-space: nowrap; }

    .summary-divider {
      height: 1px;
      background: #f0f0f0;
      margin: 0.75rem 0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
      color: #555;
      padding: 0.35rem 0;
    }

    .shipping-free {
      color: #2e7d32;
      font-weight: 600;
    }

    /* Free Shipping Progress */
    .free-shipping-hint {
      margin: 0.5rem 0;
    }
    .free-bar-track {
      height: 6px;
      background: #eef0ff;
      border-radius: 3px;
      overflow: hidden;
    }
    .free-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .free-shipping-hint p {
      font-size: 0.78rem;
      color: #888;
      margin: 0.4rem 0 0;
    }

    /* Total */
    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }
    .summary-total span:first-child {
      font-size: 1rem;
      font-weight: 600;
      color: #1a1a2e;
    }
    .total-amount {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .tax-note {
      font-size: 0.75rem;
      color: #aaa;
      text-align: right;
      margin: 0 0 1rem;
    }

    /* Checkout Button */
    .btn-checkout {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35);
    }
    .btn-checkout:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.45);
    }

    /* Trust Badges */
    .trust-row {
      display: flex;
      justify-content: space-around;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #999;
    }

    /* Buttons */
    .btn-primary {
      display: inline-block;
      padding: 0.9rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: #1a1a2e;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 100px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
      z-index: 9999;
    }
    .toast.toast-show {
      transform: translateX(-50%) translateY(0);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .items-header { display: none; }
      .cart-card {
        grid-template-columns: 70px 1fr;
        grid-template-rows: auto auto;
      }
      .card-qty { flex-direction: row; align-items: center; }
      .card-total { text-align: left; }
    }

    /* ── Mobile: Sticky Checkout-Bar ──────────────────
       Checkout-Button fixiert am unteren Rand, damit er
       immer sichtbar ist – unabhängig von Scroll-Position. */
    @media (max-width: 900px) {
      /* Platz schaffen für die sticky Bar */
      .cart-page {
        padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      }

      /* Sticky Checkout-Button */
      .btn-checkout {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 0;
        padding: 1rem 1.5rem;
        padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        z-index: 200;
        box-shadow: 0 -4px 20px rgba(102, 126, 234, 0.25);
        /* Kein transform:translateY hover auf Mobile – würde springen */
        transform: none !important;
      }
      .btn-checkout:hover {
        transform: none !important;
        box-shadow: 0 -4px 20px rgba(102, 126, 234, 0.35);
      }

      /* Summary-Card oben umstrukturieren: Checkout-Button verstecken,
         damit er nicht doppelt erscheint (einmal im Card, einmal sticky) */
      .trust-row {
        margin-bottom: 0.25rem;
      }

      /* Summary-Card braucht kein sticky mehr auf Mobile */
      .summary-column {
        position: static;
      }
    }

    /* ── Safe-Area: Toast nicht hinter Home-Indicator ── */
    .toast {
      bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
    }
  `]
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  loading = false;
  updatingItem: number | null = null;
  shipping = 4.99;
  storeId: number | null = null;
  toast: string | null = null;
  private toastTimeout: any;

  private cartUpdateSubscription?: Subscription;

  constructor(
    private cartService: CartService,
    private subdomainService: SubdomainService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const subdomainInfo = this.subdomainService.getSubdomainInfo();
    if (subdomainInfo?.storeId) {
      this.storeId = subdomainInfo.storeId;
    } else {
      const last = localStorage.getItem('last_store_id');
      if (last) this.storeId = parseInt(last, 10);
    }

    this.loadCart();

    this.cartUpdateSubscription = this.cartService.cartUpdate$.subscribe(() => {
      this.loadCart();
    });
  }

  ngOnDestroy(): void {
    this.cartUpdateSubscription?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  loadCart(): void {
    if (!this.storeId) return;
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (cart) => { this.cart = cart; this.loading = false; },
      error: () => {
        this.cart = { cartId: 0, storeId: this.storeId!, items: [], itemCount: 0, subtotal: 0 };
        this.loading = false;
      }
    });
  }

  /** Preis aus item holen – Fallback auf priceSnapshot oder 0 */
  getItemPrice(item: CartItem): number {
    return (item.priceSnapshot as any) ?? (item as any).price ?? 0;
  }

  /** Berechnete Zwischensumme aus aktuellen Items (reagiert sofort auf Mengenänderung) */
  get computedSubtotal(): number {
    if (!this.cart?.items) return 0;
    return this.cart.items.reduce((sum, item) => sum + this.getItemPrice(item) * item.quantity, 0);
  }

  get shippingCost(): number {
    return this.computedSubtotal >= 50 ? 0 : this.shipping;
  }

  increaseQuantity(item: CartItem): void {
    // Optimistisches Update: Menge sofort erhöhen
    item.quantity++;
    this.updatingItem = item.id;

    this.cartService.updateItem(item.id, item.quantity).subscribe({
      next: () => { this.updatingItem = null; },
      error: () => {
        item.quantity--; // Rollback
        this.updatingItem = null;
        this.showToast('Fehler beim Aktualisieren');
      }
    });
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      this.removeItem(item);
      return;
    }
    // Optimistisches Update
    item.quantity--;
    this.updatingItem = item.id;

    this.cartService.updateItem(item.id, item.quantity).subscribe({
      next: () => { this.updatingItem = null; },
      error: () => {
        item.quantity++; // Rollback
        this.updatingItem = null;
        this.showToast('Fehler beim Aktualisieren');
      }
    });
  }

  removeItem(item: CartItem): void {
    this.updatingItem = item.id;
    this.cartService.removeItem(item.id).subscribe({
      next: () => {
        this.cart!.items = this.cart!.items.filter(i => i.id !== item.id);
        this.updatingItem = null;
        this.showToast(`"${item.productTitle}" entfernt`);
      },
      error: () => { this.updatingItem = null; }
    });
  }

  clearCart(): void {
    if (!this.storeId) return;
    this.loading = true;
    this.cartService.clearCart().subscribe({
      next: () => { this.loadCart(); },
      error: () => { this.loading = false; }
    });
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goBack(): void {
    this.router.navigate(['/storefront']);
  }

  get cartItemCount(): number {
    return this.cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  }

  trackItem(_: number, item: CartItem): number { return item.id; }

  getPlaceholder(): string { return PlaceholderImageUtil.getProductPlaceholder(); }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = this.getPlaceholder();
  }

  private showToast(msg: string): void {
    this.toast = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.toast = null; }, 2800);
  }
}
