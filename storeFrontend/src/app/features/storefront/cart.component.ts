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

      <!-- ── Sticky Header ───────────────────────── -->
      <div class="cart-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="back-label">{{ 'cart.continueShopping' | translate }}</span>
        </button>
        <div class="header-center">
          <h1 class="cart-title">{{ 'cart.title' | translate }}</h1>
          <span class="item-badge" *ngIf="cartItemCount > 0">{{ cartItemCount }}</span>
        </div>
        <div class="header-right"></div>
      </div>

      <!-- ── Loading ─────────────────────────────── -->
      <div *ngIf="loading" class="loading-state">
        <div class="skeleton-list">
          <div class="skeleton-card" *ngFor="let i of [1,2,3]">
            <div class="sk sk-img"></div>
            <div class="sk-info">
              <div class="sk sk-line wide"></div>
              <div class="sk sk-line medium"></div>
              <div class="sk sk-line short"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Empty State ──────────────────────────── -->
      <div *ngIf="!loading && (!cart || cart.items.length === 0)" class="empty-state">
        <div class="empty-illustration">
          <div class="empty-circle"></div>
          <div class="empty-icon-wrap">🛍️</div>
        </div>
        <h2>{{ 'cart.empty' | translate }}</h2>
        <p>{{ 'cart.emptyAdd' | translate }}</p>
        <button class="btn-shop-now" (click)="goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {{ 'cart.continueShopping' | translate }}
        </button>
      </div>

      <!-- ── Cart Content ─────────────────────────── -->
      <div *ngIf="!loading && cart && cart.items.length > 0" class="cart-layout">

        <!-- Items Column -->
        <div class="items-column">

          <!-- Section Label -->
          <div class="section-label">
            <span>{{ 'cart.product' | translate }}</span>
            <span class="count-chip">{{ cartItemCount }}</span>
          </div>

          <!-- Product Cards -->
          <div class="items-list">
            <div
              *ngFor="let item of cart.items; trackBy: trackItem"
              class="cart-card"
              [class.updating]="updatingItem === item.id">

              <!-- Product Image -->
              <div class="card-img-wrap">
                <img
                  [src]="item.imageUrl || getPlaceholder()"
                  [alt]="item.productTitle"
                  (error)="onImgError($event)">
              </div>

              <!-- Product Details -->
              <div class="card-body">
                <div class="card-top">
                  <div class="card-info">
                    <h3 class="product-name">{{ item.productTitle }}</h3>
                    <p class="variant-chip" *ngIf="item.variantSku">{{ item.variantSku }}</p>
                    <p class="unit-price">{{ getItemPrice(item) | number:'1.2-2' }} € / {{ 'cart.unit' | translate }}</p>
                  </div>
                  <!-- Remove Button -->
                  <button
                    class="remove-btn"
                    (click)="removeItem(item)"
                    [disabled]="updatingItem === item.id"
                    [title]="'cart.remove' | translate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>

                <!-- Bottom: Qty + Line Total -->
                <div class="card-bottom">
                  <div class="qty-control">
                    <button
                      class="qty-btn"
                      (click)="decreaseQuantity(item)"
                      [disabled]="updatingItem === item.id">−</button>
                    <span class="qty-display">{{ item.quantity }}</span>
                    <button
                      class="qty-btn"
                      (click)="increaseQuantity(item)"
                      [disabled]="updatingItem === item.id">+</button>
                  </div>
                  <span class="line-total">{{ (getItemPrice(item) * item.quantity) | number:'1.2-2' }} €</span>
                </div>
              </div>

              <!-- Updating Overlay -->
              <div *ngIf="updatingItem === item.id" class="card-overlay">
                <div class="pulse-ring"></div>
              </div>
            </div>
          </div>

          <!-- Clear Cart -->
          <button class="btn-clear" (click)="clearCart()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            {{ 'cart.clearCart' | translate }}
          </button>
        </div>

        <!-- ── Order Summary ────────────────────────── -->
        <div class="summary-column">
          <div class="summary-card">

            <!-- Summary Header -->
            <div class="summary-header">
              <h2 class="summary-title">{{ 'cart.summary' | translate }}</h2>
              <span class="summary-count">{{ cartItemCount }} {{ 'cart.items' | translate }}</span>
            </div>

            <!-- Item Lines -->
            <div class="summary-lines">
              <div class="summary-line" *ngFor="let item of cart.items">
                <span class="line-name">{{ item.productTitle }} <em>×{{ item.quantity }}</em></span>
                <span class="line-price">{{ (getItemPrice(item) * item.quantity) | number:'1.2-2' }} €</span>
              </div>
            </div>

            <div class="summary-divider"></div>

            <!-- Subtotal -->
            <div class="summary-row">
              <span>{{ 'cart.subtotal' | translate }}</span>
              <span class="row-value">{{ computedSubtotal | number:'1.2-2' }} €</span>
            </div>

            <!-- Shipping -->
            <div class="summary-row">
              <span>{{ 'cart.shipping' | translate }}</span>
              <span class="free-tag" *ngIf="computedSubtotal >= 50">🎉 {{ 'cart.freeShipping' | translate }}</span>
              <span class="row-value" *ngIf="computedSubtotal < 50">{{ shipping | number:'1.2-2' }} €</span>
            </div>

            <!-- Free Shipping Progress -->
            <div *ngIf="computedSubtotal < 50" class="shipping-progress">
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="(computedSubtotal / 50) * 100"></div>
              </div>
              <p class="progress-label">{{ 'cart.freeShippingHint' | translate:{ amount: ((50 - computedSubtotal) | number:'1.2-2') } }}</p>
            </div>

            <div class="summary-divider"></div>

            <!-- Total -->
            <div class="total-row">
              <span class="total-label">{{ 'cart.total' | translate }}</span>
              <span class="total-amount">{{ (computedSubtotal + shippingCost) | number:'1.2-2' }} €</span>
            </div>
            <p class="tax-note">{{ 'cart.inclTax' | translate }}</p>

            <!-- Checkout Button (Desktop) -->
            <button class="btn-checkout desktop-only" (click)="proceedToCheckout()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {{ 'cart.checkout' | translate }}
            </button>

            <!-- Trust Badges -->
            <div class="trust-row">
              <div class="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {{ 'cart.securePayment' | translate }}
              </div>
              <div class="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                {{ 'cart.easyReturns' | translate }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sticky Mobile Checkout Bar ─────────────── -->
      <div *ngIf="!loading && cart && cart.items.length > 0" class="mobile-checkout-bar">
        <div class="mobile-bar-total">
          <span class="mobile-bar-label">{{ 'cart.total' | translate }}</span>
          <span class="mobile-bar-amount">{{ (computedSubtotal + shippingCost) | number:'1.2-2' }} €</span>
        </div>
        <button class="btn-checkout-mobile" (click)="proceedToCheckout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          {{ 'cart.checkout' | translate }}
        </button>
      </div>

      <!-- ── Toast ───────────────────────────────────── -->
      <div *ngIf="toast" class="toast" [class.toast-show]="toast">{{ toast }}</div>
    </div>
  `,
  styles: [`
    /* ── CSS Reset & Base ──────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }

    .cart-page {
      min-height: 100vh;
      background: #f5f5f7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px));
    }

    /* ── Sticky Header ─────────────────────────────── */
    .cart-header {
      position: sticky;
      top: 0;
      z-index: 100;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: 0.85rem 1rem;
      background: rgba(245, 245, 247, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.4rem 0;
      transition: opacity 0.2s;
    }
    .back-btn:hover { opacity: 0.7; }
    .back-btn svg { flex-shrink: 0; }
    .back-label { display: none; }

    @media (min-width: 600px) { .back-label { display: inline; } }

    .header-center {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .cart-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: -0.01em;
    }

    .item-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      border-radius: 100px;
    }

    .header-right { /* spacer */ }

    /* ── Loading Skeleton ──────────────────────────── */
    .loading-state { padding: 1rem; }

    .skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; max-width: 700px; margin: 0 auto; }

    .skeleton-card {
      display: flex;
      gap: 1rem;
      background: white;
      border-radius: 16px;
      padding: 1rem;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    .sk {
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      border-radius: 8px;
      animation: shimmer-bg 1.4s ease-in-out infinite;
    }
    .sk-img { width: 72px; height: 72px; border-radius: 12px; flex-shrink: 0; }
    .sk-info { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; }
    .sk-line { height: 12px; }
    .sk-line.wide { width: 80%; }
    .sk-line.medium { width: 55%; }
    .sk-line.short { width: 35%; }

    @keyframes shimmer-bg {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Empty State ───────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-illustration {
      position: relative;
      width: 120px;
      height: 120px;
      margin-bottom: 1.5rem;
    }

    .empty-circle {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12));
    }

    .empty-icon-wrap {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3.5rem;
    }

    .empty-state h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 0.5rem;
    }
    .empty-state p { color: #888; margin: 0 0 2rem; font-size: 0.95rem; }

    .btn-shop-now {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.9rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 100px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(102,126,234,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-shop-now:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(102,126,234,0.45); }

    /* ── Layout ────────────────────────────────────── */
    .cart-layout {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (min-width: 900px) {
      .cart-layout {
        flex-direction: row;
        align-items: flex-start;
        padding: 1.5rem;
        gap: 1.5rem;
      }
      .items-column { flex: 1; }
      .summary-column { width: 360px; flex-shrink: 0; position: sticky; top: 72px; }
    }

    /* ── Section Label ─────────────────────────────── */
    .section-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #999;
      margin-bottom: 0.75rem;
      padding: 0 0.25rem;
    }
    .count-chip {
      background: #e8ecff;
      color: #667eea;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 100px;
    }

    /* ── Product Cards ─────────────────────────────── */
    .items-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .cart-card {
      position: relative;
      display: flex;
      gap: 0.75rem;
      background: white;
      border-radius: 18px;
      padding: 0.9rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
      transition: opacity 0.3s, transform 0.2s;
      overflow: hidden;
    }
    .cart-card.updating { opacity: 0.55; pointer-events: none; }
    .cart-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.09); }

    /* Product Image */
    .card-img-wrap {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border-radius: 12px;
      overflow: hidden;
      background: #f5f5f7;
    }
    .card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .cart-card:hover .card-img-wrap img { transform: scale(1.05); }

    @media (min-width: 480px) {
      .card-img-wrap { width: 90px; height: 90px; }
    }

    /* Card Body */
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .card-info { flex: 1; min-width: 0; }

    .product-name {
      margin: 0 0 0.2rem;
      font-size: 0.92rem;
      font-weight: 600;
      color: #1a1a2e;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (min-width: 480px) { .product-name { white-space: normal; } }

    .variant-chip {
      display: inline-flex;
      align-items: center;
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      color: #667eea;
      background: rgba(102,126,234,0.1);
      padding: 2px 8px;
      border-radius: 100px;
      font-weight: 500;
    }

    .unit-price {
      margin: 0;
      font-size: 0.8rem;
      color: #aaa;
    }

    /* Remove Button */
    .remove-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      color: #ccc;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }
    .remove-btn:hover:not(:disabled) {
      color: #ff4d6d;
      background: rgba(255,77,109,0.1);
    }

    /* Card Bottom */
    .card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.6rem;
    }

    /* Qty Control */
    .qty-control {
      display: flex;
      align-items: center;
      background: #f5f5f7;
      border-radius: 100px;
      padding: 2px;
      gap: 2px;
    }

    .qty-btn {
      width: 34px;
      height: 34px;
      border-radius: 100px;
      border: none;
      background: transparent;
      font-size: 1.15rem;
      font-weight: 500;
      color: #555;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .qty-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      transform: scale(1.1);
    }
    .qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .qty-display {
      min-width: 32px;
      text-align: center;
      font-size: 0.95rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    .line-total {
      font-size: 1rem;
      font-weight: 800;
      color: #1a1a2e;
    }

    /* Updating Overlay */
    .card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    .pulse-ring {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid #667eea;
      border-top-color: transparent;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Clear Button */
    .btn-clear {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: none;
      border: none;
      color: #ccc;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0.75rem 0.25rem;
      transition: color 0.2s;
      margin-top: 0.25rem;
    }
    .btn-clear:hover { color: #ff4d6d; }

    /* ── Summary Card ──────────────────────────────── */
    .summary-card {
      background: white;
      border-radius: 20px;
      padding: 1.25rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .summary-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    .summary-count {
      font-size: 0.78rem;
      color: #aaa;
    }

    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #666;
    }
    .line-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .line-name em { color: #aaa; font-style: normal; margin-left: 3px; }
    .line-price { font-weight: 600; color: #333; flex-shrink: 0; }

    .summary-divider { height: 1px; background: #f0f0f0; margin: 0.75rem 0; }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: #666;
      padding: 0.2rem 0;
    }
    .row-value { font-weight: 600; color: #333; }
    .free-tag {
      font-size: 0.82rem;
      font-weight: 700;
      color: #2e7d32;
      background: #e8f5e9;
      padding: 2px 10px;
      border-radius: 100px;
    }

    /* Progress */
    .shipping-progress { margin: 0.5rem 0 0.25rem; }
    .progress-track {
      height: 5px;
      background: #eef0ff;
      border-radius: 100px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 100px;
      transition: width 0.5s cubic-bezier(.4,0,.2,1);
    }
    .progress-label {
      font-size: 0.76rem;
      color: #888;
      margin: 0.35rem 0 0;
    }

    /* Total */
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0 0.1rem;
    }
    .total-label {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1a1a2e;
    }
    .total-amount {
      font-size: 1.6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }
    .tax-note {
      font-size: 0.72rem;
      color: #bbb;
      text-align: right;
      margin: 0.1rem 0 1rem;
    }

    /* Desktop Checkout Button */
    .btn-checkout {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.95rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(102,126,234,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-checkout:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(102,126,234,0.45);
    }

    .desktop-only { display: none; }
    @media (min-width: 900px) { .desktop-only { display: flex; } }

    /* Trust Row */
    .trust-row {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #aaa;
    }
    .trust-item svg { flex-shrink: 0; }

    /* ── Mobile Sticky Checkout Bar ────────────────── */
    .mobile-checkout-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      padding-bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(0,0,0,0.07);
      box-shadow: 0 -8px 32px rgba(0,0,0,0.1);
    }

    @media (min-width: 900px) { .mobile-checkout-bar { display: none; } }

    .mobile-bar-total {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .mobile-bar-label { font-size: 0.72rem; color: #aaa; font-weight: 500; }
    .mobile-bar-amount {
      font-size: 1.15rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .btn-checkout-mobile {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(102,126,234,0.4);
      transition: transform 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-checkout-mobile:active { transform: scale(0.97); }

    /* ── Toast ─────────────────────────────────────── */
    .toast {
      position: fixed;
      bottom: calc(90px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
      background: #1a1a2e;
      color: white;
      padding: 0.6rem 1.25rem;
      border-radius: 100px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transition: transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s;
      z-index: 9999;
      pointer-events: none;
    }
    .toast.toast-show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    @media (min-width: 900px) {
      .toast { bottom: 2rem; }
    }

    /* ── Empty Primary Button ──────────────────────── */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.9rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 100px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(102,126,234,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary:hover { transform: translateY(-2px); }
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
