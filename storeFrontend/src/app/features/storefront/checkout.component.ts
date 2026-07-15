import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService, Cart } from '../../core/services/cart.service';
import { CheckoutService } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerProfileService, SaveAddressRequest } from '../../core/services/customer-profile.service';
import { SubdomainService } from '../../core/services/subdomain.service';
import { CouponInputComponent } from '../../shared/components/coupon-input/coupon-input.component';
import { ValidateCouponsResponse } from '../../core/services/coupon.service';
import { PlaceholderImageUtil } from '../../shared/utils/placeholder-image.util';
import { PhoneVerificationService } from '../../core/services/phone-verification.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { PlatformDeliveryService, GlobalDeliveryOption } from '../../core/services/platform-delivery.service';
import { DeliveryOption, DeliveryOptionsResponse, PublicStore } from '../../core/models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from '@env/environment';

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        CouponInputComponent,
        TranslatePipe,
        PageHeaderComponent
    ],
    template: `
    <div class="checkout-container">
      <app-page-header
        [title]="'checkout.title'"
        [showBackButton]="true"
        [backButtonText]="'checkout.back'"
        [actions]="headerActions"
      ></app-page-header>

      <div class="step-indicator">
        <div class="step completed">
          <div class="step-number">✓</div>
          <div class="step-label">{{ 'checkout.step1' | translate }}</div>
        </div>
        <div class="step-line completed"></div>
        <div class="step active">
          <div class="step-number">2</div>
          <div class="step-label">{{ 'checkout.step2' | translate }}</div>
        </div>
        <div class="step-line"></div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-label">{{ 'checkout.step3' | translate }}</div>
        </div>
      </div>

      <div *ngIf="!isUserLoggedIn() && !loading && cart && cart.items.length > 0" class="guest-login-hint">
        <div class="hint-content">
          <div class="hint-icon">👤</div>
          <div class="hint-text">
            <h3>{{ 'checkout.alreadyCustomer' | translate }}</h3>
            <p>{{ 'checkout.loginHint' | translate }}</p>
          </div>
          <div class="hint-actions">
            <button class="btn btn-secondary" (click)="showLoginModal()">{{ 'checkout.loginBtn' | translate }}</button>
            <button class="btn btn-outline" (click)="showRegisterModal()">{{ 'checkout.registerBtn' | translate }}</button>
          </div>
        </div>
        <div class="hint-guest">
          <p><strong>{{ 'checkout.guestHint' | translate }}</strong></p>
        </div>
      </div>

      <div *ngIf="isUserLoggedIn() && !loading && cart && cart.items.length > 0" class="logged-in-banner">
        <div class="banner-content">
          <span class="banner-icon">✅</span>
          <span class="banner-text">
            {{ 'checkout.loggedInAs' | translate }} <strong>{{ getCurrentUserEmail() }}</strong>
          </span>
          <button class="btn-link" (click)="logout()">{{ 'checkout.logout' | translate }}</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        {{ 'checkout.loading' | translate }}
      </div>

      <div *ngIf="!loading && (!cart || cart.items.length === 0)" class="empty-cart">
        <h2>{{ 'checkout.emptyCart' | translate }}</h2>
        <p>{{ 'checkout.emptyCartHint' | translate }}</p>
        <button class="btn btn-primary" (click)="goToShop()">{{ 'checkout.goToShop' | translate }}</button>
      </div>

      <div *ngIf="!loading && cart && cart.items.length > 0" class="checkout-content">
        <div class="checkout-form">
          <form [formGroup]="checkoutForm" (ngSubmit)="submitOrder()">
            <section class="form-section">
              <h2>{{ 'checkout.contactInfo' | translate }}</h2>
              <div class="form-group">
                <label for="email">{{ 'checkout.email' | translate }} {{ 'checkout.required' | translate }}</label>
                <input
                  id="email"
                  type="email"
                  formControlName="customerEmail"
                  [placeholder]="'checkout.emailPlaceholder' | translate"
                />
                <div *ngIf="checkoutForm.get('customerEmail')?.invalid && checkoutForm.get('customerEmail')?.touched" class="error">
                  {{ 'checkout.errors.email' | translate }}
                </div>
              </div>
            </section>

            <section class="form-section" formGroupName="shippingAddress">
              <h2>{{ 'checkout.shippingAddress' | translate }}</h2>

              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">{{ 'checkout.firstName' | translate }} {{ 'checkout.required' | translate }}</label>
                  <input id="firstName" type="text" formControlName="firstName" />
                  <div *ngIf="isFieldInvalid('shippingAddress.firstName')" class="error">
                    {{ 'checkout.errors.firstName' | translate }}
                  </div>
                </div>

                <div class="form-group">
                  <label for="lastName">{{ 'checkout.lastName' | translate }} {{ 'checkout.required' | translate }}</label>
                  <input id="lastName" type="text" formControlName="lastName" />
                  <div *ngIf="isFieldInvalid('shippingAddress.lastName')" class="error">
                    {{ 'checkout.errors.lastName' | translate }}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="address1">{{ 'checkout.address' | translate }} {{ 'checkout.required' | translate }}</label>
                <input id="address1" type="text" formControlName="address1" />
                <div *ngIf="isFieldInvalid('shippingAddress.address1')" class="error">
                  {{ 'checkout.errors.address' | translate }}
                </div>
              </div>

              <div class="form-group">
                <label for="address2">{{ 'checkout.addressOptional' | translate }}</label>
                <input id="address2" type="text" formControlName="address2" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="postalCode">{{ 'checkout.postalCode' | translate }} {{ 'checkout.required' | translate }}</label>
                  <input id="postalCode" type="text" formControlName="postalCode" (blur)="loadDeliveryOptions()" />
                  <div *ngIf="isFieldInvalid('shippingAddress.postalCode')" class="error">
                    {{ 'checkout.errors.postalCode' | translate }}
                  </div>
                </div>

                <div class="form-group">
                  <label for="city">{{ 'checkout.city' | translate }} {{ 'checkout.required' | translate }}</label>
                  <input id="city" type="text" formControlName="city" (blur)="loadDeliveryOptions()" />
                  <div *ngIf="isFieldInvalid('shippingAddress.city')" class="error">
                    {{ 'checkout.errors.city' | translate }}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="country">{{ 'checkout.country' | translate }} {{ 'checkout.required' | translate }}</label>
                <select id="country" formControlName="country" (change)="loadDeliveryOptions()">
                  <option value="">{{ 'checkout.selectCountry' | translate }}</option>
                  <option value="Deutschland">{{ 'checkout.countries.de' | translate }}</option>
                  <option value="Österreich">{{ 'checkout.countries.at' | translate }}</option>
                  <option value="Schweiz">{{ 'checkout.countries.ch' | translate }}</option>
                </select>
                <div *ngIf="isFieldInvalid('shippingAddress.country')" class="error">
                  {{ 'checkout.errors.country' | translate }}
                </div>
              </div>

              <div class="form-group">
                <label for="phone">{{ 'checkout.phone' | translate }}</label>
                <input id="phone" type="tel" formControlName="phone" />
              </div>
            </section>

            <section class="form-section">
              <div class="checkbox-wrapper">
                <label>
                  <input type="checkbox" [checked]="sameAsShipping" (change)="toggleBillingAddress($event)" />
                  {{ 'checkout.sameBilling' | translate }}
                </label>
              </div>

              <div *ngIf="!sameAsShipping" formGroupName="billingAddress">
                <h2>{{ 'checkout.billingAddress' | translate }}</h2>

                <div class="form-row">
                  <div class="form-group">
                    <label for="billFirstName">{{ 'checkout.firstName' | translate }} {{ 'checkout.required' | translate }}</label>
                    <input id="billFirstName" type="text" formControlName="firstName" />
                  </div>

                  <div class="form-group">
                    <label for="billLastName">{{ 'checkout.lastName' | translate }} {{ 'checkout.required' | translate }}</label>
                    <input id="billLastName" type="text" formControlName="lastName" />
                  </div>
                </div>

                <div class="form-group">
                  <label for="billAddress1">{{ 'checkout.address' | translate }} {{ 'checkout.required' | translate }}</label>
                  <input id="billAddress1" type="text" formControlName="address1" />
                </div>

                <div class="form-group">
                  <label for="billAddress2">{{ 'checkout.addressOptional' | translate }}</label>
                  <input id="billAddress2" type="text" formControlName="address2" />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="billPostalCode">{{ 'checkout.postalCode' | translate }} {{ 'checkout.required' | translate }}</label>
                    <input id="billPostalCode" type="text" formControlName="postalCode" />
                  </div>

                  <div class="form-group">
                    <label for="billCity">{{ 'checkout.city' | translate }} {{ 'checkout.required' | translate }}</label>
                    <input id="billCity" type="text" formControlName="city" />
                  </div>
                </div>

                <div class="form-group">
                  <label for="billCountry">{{ 'checkout.country' | translate }} {{ 'checkout.required' | translate }}</label>
                  <select id="billCountry" formControlName="country">
                    <option value="">{{ 'checkout.selectCountry' | translate }}</option>
                    <option value="Deutschland">{{ 'checkout.countries.de' | translate }}</option>
                    <option value="Österreich">{{ 'checkout.countries.at' | translate }}</option>
                    <option value="Schweiz">{{ 'checkout.countries.ch' | translate }}</option>
                  </select>
                </div>
              </div>
            </section>

            <section class="form-section">
              <h2>{{ 'checkout.notes' | translate }}</h2>
              <div class="form-group">
                <textarea
                  formControlName="notes"
                  rows="4"
                  [placeholder]="'checkout.notesPlaceholder' | translate"
                ></textarea>
              </div>
            </section>

            <section class="form-section">
              <h2>🚚 {{ 'checkout.shippingMethod' | translate }}</h2>

              <!-- Globale Lieferoptionen (plattformweit verwaltet) -->
              <div *ngIf="loadingGlobalDelivery" class="delivery-loading">
                <div class="spinner-sm"></div> {{ 'checkout.deliveryLoading' | translate }}
              </div>

              <div *ngIf="!loadingGlobalDelivery" class="delivery-options-list">
                <!-- Abholung - IMMER verfügbar -->
                <label
                  class="delivery-option-card"
                  [class.selected]="selectedDeliveryType === 'PICKUP'"
                  (click)="selectPickupOption()"
                >
                  <input
                    type="radio"
                    name="globalDelivery"
                    value="PICKUP"
                    [checked]="selectedDeliveryType === 'PICKUP'"
                    style="display:none"
                  />
                  <span class="delivery-icon">🏪</span>
                  <div class="delivery-details">
                    <strong>{{ 'checkout.pickupTitle' | translate }}</strong>
                    <span class="delivery-desc">{{ 'checkout.pickupDesc' | translate }}</span>
                  </div>
                  <div class="delivery-price">
                    <span class="free-badge">{{ 'checkout.free' | translate }}</span>
                  </div>
                  <div class="delivery-check" *ngIf="selectedDeliveryType === 'PICKUP'">✓</div>
                </label>

                <!-- DHL Versand Option (wenn verfügbar) -->
                <label
                  *ngIf="publicStore?.dhlShippingEnabled"
                  class="delivery-option-card"
                  [class.selected]="selectedShippingProvider === 'DHL'"
                  (click)="selectDhlShipping()"
                >
                  <input
                    type="radio"
                    name="globalDelivery"
                    value="DHL"
                    [checked]="selectedShippingProvider === 'DHL'"
                    style="display:none"
                  />
                  <span class="delivery-icon">📦</span>
                  <div class="delivery-details">
                    <strong>{{ publicStore?.dhlShippingLabel || 'DHL Versand' }}</strong>
                    <span class="delivery-desc">{{ publicStore?.dhlShippingDescription || 'Lieferung mit DHL Paket' }}</span>
                  </div>
                  <div class="delivery-price">
                    <span *ngIf="publicStore?.dhlShippingPrice === 0" class="free-badge">{{ 'checkout.free' | translate }}</span>
                    <span *ngIf="publicStore && publicStore.dhlShippingPrice && publicStore.dhlShippingPrice > 0">{{ publicStore.dhlShippingPrice | number:'1.2-2' }} MAD</span>
                  </div>
                  <div class="delivery-check" *ngIf="selectedShippingProvider === 'DHL'">✓</div>
                </label>

                <!-- Andere Lieferoptionen -->
                <label
                  *ngFor="let opt of globalDeliveryOptions"
                  class="delivery-option-card"
                  [class.selected]="selectedGlobalDeliveryOption?.id === opt.id && selectedShippingProvider === 'GLOBAL_DELIVERY'"
                  (click)="selectGlobalDeliveryOption(opt)"
                >
                  <input
                    type="radio"
                    name="globalDelivery"
                    [value]="opt.id"
                    [checked]="selectedGlobalDeliveryOption?.id === opt.id && selectedShippingProvider === 'GLOBAL_DELIVERY'"
                    style="display:none"
                  />
                  <span class="delivery-icon">{{ opt.icon || '🚚' }}</span>
                  <div class="delivery-details">
                    <strong>{{ opt.name }}</strong>
                    <span *ngIf="opt.description" class="delivery-desc">{{ opt.description }}</span>
                    <span *ngIf="opt.etaMinDays != null" class="delivery-eta">
                      {{ 'checkout.deliveryEtaApprox' | translate }} {{ opt.etaMinDays }}–{{ opt.etaMaxDays ?? opt.etaMinDays }} {{ 'checkout.deliveryEtaDays' | translate }}
                    </span>
                  </div>
                  <div class="delivery-price">
                    <span *ngIf="opt.price === 0" class="free-badge">{{ 'checkout.free' | translate }}</span>
                    <span *ngIf="opt.price > 0">{{ opt.price | number:'1.2-2' }} MAD</span>
                  </div>
                  <div class="delivery-check" *ngIf="selectedGlobalDeliveryOption?.id === opt.id && selectedShippingProvider === 'GLOBAL_DELIVERY'">✓</div>
                </label>
              </div>
            </section>

           <!-- <section class="form-section">
              <h2>💳 {{ 'checkout.paymentMethod' | translate }} {{ 'checkout.required' | translate }}</h2>

              <div class="payment-methods">
                <label class="payment-option disabled" title="Derzeit nicht verfügbar">
                  <input type="radio" name="paymentMethod" value="CREDIT_CARD" disabled />
                  <div class="payment-content">
                    <span class="payment-icon">💳</span>
                    <div class="payment-info">
                      <strong>{{ 'payment.creditCard' | translate }}</strong>
                      <small>Derzeit nicht verfügbar</small>
                    </div>
                  </div>
                </label>

                <label class="payment-option disabled" title="Derzeit nicht verfügbar">
                  <input type="radio" name="paymentMethod" value="PAYPAL" disabled />
                  <div class="payment-content">
                    <span class="payment-icon">🅿️</span>
                    <div class="payment-info">
                      <strong>PayPal</strong>
                      <small>Derzeit nicht verfügbar</small>
                    </div>
                  </div>
                </label>

                <label class="payment-option disabled" title="Derzeit nicht verfügbar">
                  <input type="radio" name="paymentMethod" value="BANK_TRANSFER" disabled />
                  <div class="payment-content">
                    <span class="payment-icon">🏦</span>
                    <div class="payment-info">
                      <strong>{{ 'payment.bankTransfer' | translate }}</strong>
                      <small>Derzeit nicht verfügbar</small>
                    </div>
                  </div>
                </label>

                <label class="payment-option cod" [class.selected]="selectedPaymentMethod === 'CASH_ON_DELIVERY'">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH_ON_DELIVERY"
                    [(ngModel)]="selectedPaymentMethod"
                    [ngModelOptions]="{ standalone: true }"
                    (change)="onPaymentMethodChange()"
                  />
                  <div class="payment-content">
                    <span class="payment-icon">💵</span>
                    <div class="payment-info">
                      <strong>{{ 'payment.cashOnDelivery' | translate }}</strong>
                      <small>{{ 'payment.cashOnDeliveryHint' | translate }}</small>
                    </div>
                  </div>
                </label>
              </div>

              <div *ngIf="selectedPaymentMethod === 'CASH_ON_DELIVERY'" class="phone-verification-box">
                <div class="verification-header">
                  <span class="icon">📱</span>
                  <div>
                    <h3>{{ 'payment.phoneVerification' | translate }}</h3>
                    <p>{{ 'payment.phoneVerificationHint' | translate }}</p>
                  </div>
                  <span class="coming-soon-badge">🚧 Demnächst</span>
                </div>

                <div class="verification-step">
                  <label>Telefonnummer (optional)</label>

                  <div class="phone-input-group">
                    <select
                      [(ngModel)]="selectedCountry"
                      [ngModelOptions]="{ standalone: true }"
                      class="country-select"
                      (change)="onCountryChange()"
                      disabled
                    >
                      <option *ngFor="let country of countryCodes" [ngValue]="country">
                        {{ country.flag }} {{ country.name }} ({{ country.dialCode }})
                      </option>
                    </select>

                    <input
                      type="tel"
                      [(ngModel)]="phoneNumberLocal"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="1234567890"
                      class="phone-input"
                      disabled
                    />

                     DEAKTIVIERT: Telefonverifizierung noch nicht aktiv 
                    <button
                      type="button"
                      class="btn-send-code"
                      disabled
                      title="Telefonverifizierung wird demnächst aktiviert"
                    >
                      📨 Code senden
                    </button>
                  </div>

                  <small class="help-text coming-soon">
                    🚧 Telefonverifizierung wird in Kürze aktiviert
                  </small>
                </div>
              </div>

              <div *ngIf="!selectedPaymentMethod" class="error">
                {{ 'checkout.paymentMethod' | translate }}
              </div>
            </section> -->

            <section class="form-section" *ngIf="isUserLoggedIn()">
              <div class="checkbox-wrapper">
                <label>
                  <input type="checkbox" [(ngModel)]="saveAddressForFuture" [ngModelOptions]="{ standalone: true }" />
                  {{ 'checkout.saveAddress' | translate }}
                </label>
                <p class="help-text">{{ 'checkout.saveAddressHint' | translate }}</p>
              </div>
            </section>

            <div *ngIf="errorMessage" class="alert alert-error">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-submit"
              [disabled]="checkoutForm.invalid || submitting"
            >
              {{ submitting ? ('common.loading' | translate) : ('checkout.placeOrder' | translate) }}
            </button>
          </form>
        </div>

        <div class="order-summary">
          <h2>{{ 'checkout.orderSummary' | translate }}</h2>

          <div class="summary-items">
            <div class="summary-item" *ngFor="let item of cart.items">
              <img
                [src]="item.imageUrl || getProductPlaceholder()"
                [alt]="item.productTitle"
                (error)="onImageError($event)"
              />
              <div class="item-info">
                <h4>{{ item.productTitle }}</h4>
                <p>{{ item.variantSku }}</p>
                <p class="quantity">{{ 'product.quantity' | translate: { count: item.quantity } }}</p>
              </div>
              <div class="item-price">
                {{ (item.priceSnapshot * item.quantity) | number:'1.2-2' }} €
              </div>
            </div>
          </div>

          <div class="coupon-section">
            <app-coupon-input
              [storeId]="cart.storeId"
              [cart]="getCartData()"
              [domainHost]="getDomainHost()"
              (couponsApplied)="onCouponsApplied($event)"
            ></app-coupon-input>
          </div>

          <div class="summary-totals">
            <div class="summary-row">
              <span>{{ 'cart.subtotal' | translate }}</span>
              <span>{{ cart.subtotal | number:'1.2-2' }} €</span>
            </div>

            <div class="summary-row discount" *ngIf="discountAmount > 0">
              <span>{{ 'checkout.discount' | translate }}</span>
              <span class="discount-value">-{{ discountAmount | number:'1.2-2' }} €</span>
            </div>

            <div class="summary-row" *ngIf="selectedDeliveryType === 'DELIVERY' && selectedGlobalDeliveryOption">
              <span>🚚 {{ selectedGlobalDeliveryOption.name }}</span>
              <span *ngIf="selectedGlobalDeliveryOption.price === 0" class="free-shipping">{{ 'checkout.free' | translate }}</span>
              <span *ngIf="selectedGlobalDeliveryOption.price > 0">{{ selectedGlobalDeliveryOption.price | number:'1.2-2' }} MAD</span>
            </div>
            <div class="summary-row" *ngIf="selectedDeliveryType === 'PICKUP'">
              <span>{{ 'checkout.pickupLabel' | translate }}</span>
              <span class="free-shipping">{{ 'checkout.free' | translate }}</span>
            </div>

            <div class="summary-row tax">
              <span>{{ 'checkout.tax' | translate }}</span>
              <span>{{ getTax() | number:'1.2-2' }} €</span>
            </div>

            <div class="summary-row total">
              <strong>{{ 'cart.total' | translate }}</strong>
              <strong>{{ getFinalTotal() | number:'1.2-2' }} €</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    *, *::before, *::after {
      box-sizing: border-box;
    }

    .checkout-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      overflow-x: hidden;
    }

    .checkout-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 30px 0;
      padding: 20px;
      background: white;
      border-radius: 12px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-bottom: 8px;
      transition: all 0.3s;
    }

    .step.completed .step-number {
      background: #4caf50;
      color: white;
    }

    .step.active .step-number {
      background: #667eea;
      color: white;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
    }

    .step-label {
      font-size: 14px;
      color: #666;
      text-align: center;
      white-space: nowrap;
    }

    .step.active .step-label {
      color: #667eea;
      font-weight: bold;
    }

    .step.completed .step-label {
      color: #4caf50;
    }

    .step-line {
      width: 80px;
      height: 2px;
      background: #e0e0e0;
      margin: 0 10px;
      margin-bottom: 32px;
    }

    .step-line.completed {
      background: #4caf50;
    }

    @media (max-width: 576px) {
      .checkout-container {
        padding: 12px;
      }

      .step-indicator {
        padding: 15px 10px;
      }

      .step-line {
        width: 40px;
        margin: 0 5px;
      }

      .step-label {
        font-size: 12px;
      }

      .step-number {
        width: 35px;
        height: 35px;
      }
    }

    .checkout-content {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 30px;
    }

    @media (max-width: 968px) {
      .checkout-content {
        grid-template-columns: 1fr;
      }

      .order-summary {
        order: -1;
      }
    }

    .checkout-form {
      background: white;
      border-radius: 8px;
      padding: 30px;
    }

    @media (max-width: 576px) {
      .checkout-form {
        padding: 16px;
      }
    }

    .form-section {
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h2 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      max-width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 576px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .checkbox-wrapper {
      margin-bottom: 20px;
    }

    .checkbox-wrapper label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .checkbox-wrapper input[type="checkbox"] {
      width: auto;
      cursor: pointer;
    }

    .error {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }

    .btn-submit {
      width: 100%;
      padding: 15px;
      font-size: 16px;
      margin-top: 20px;
    }

    .order-summary {
      background: white;
      border-radius: 8px;
      padding: 20px;
      height: fit-content;
      position: sticky;
      top: 20px;
    }

    @media (max-width: 968px) {
      .order-summary {
        position: static;
      }
    }

    .order-summary h2 {
      margin-top: 0;
      margin-bottom: 20px;
    }

    .summary-items {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }

    .summary-item {
      display: grid;
      grid-template-columns: 60px 1fr auto;
      gap: 15px;
      margin-bottom: 15px;
    }

    .summary-item img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 6px;
    }

    .item-info h4 {
      margin: 0 0 5px 0;
      font-size: 14px;
    }

    .item-info p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }

    .item-price {
      font-weight: 600;
      text-align: right;
    }

    .summary-totals {
      margin-top: 20px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .summary-row.total {
      border-top: 2px solid #333;
      border-bottom: none;
      padding-top: 15px;
      margin-top: 10px;
      font-size: 18px;
    }

    .loading, .empty-cart {
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

    .coupon-section {
      margin: 20px 0;
      padding: 20px 0;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }

    .summary-row.discount {
      color: #4caf50;
      font-weight: 600;
    }

    .summary-row.discount .discount-value {
      font-size: 18px;
      font-weight: 700;
    }

    .free-shipping {
      color: #38a169;
      font-weight: 600;
    }

    .summary-row.tax {
      color: #64748b;
      font-size: 13px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 6px;
      margin-top: 2px;
    }

    .help-text {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }

    .guest-login-hint {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .hint-content {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      flex-wrap: wrap;
    }

    .hint-icon {
      font-size: 28px;
      color: #667eea;
      flex-shrink: 0;
    }

    .hint-text {
      flex: 1;
      min-width: 150px;
    }

    .hint-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      width: 100%;
    }

    .logged-in-banner {
      background: #e1f5fe;
      border: 1px solid #b3e5fc;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .banner-icon {
      font-size: 24px;
      color: #4caf50;
    }

    .btn-link {
      background: none;
      color: #007bff;
      border: none;
      padding: 0;
      font-size: 14px;
      cursor: pointer;
    }

    .payment-methods {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
    }

    @media (min-width: 576px) {
      .payment-methods {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .payment-option {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: border-color 0.3s;
    }

    .payment-option.selected {
      border-color: #667eea;
      background: #e1f5fe;
    }

    .payment-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f5f5f5;
      pointer-events: none;
    }

    .payment-option.disabled .payment-info strong {
      color: #999;
    }

    .payment-option.disabled .payment-info small {
      color: #bbb;
    }

    .payment-icon {
      font-size: 28px;
      margin-right: 10px;
    }

    .pickup-only-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #f0fff4, #e6fffa);
      border: 2px solid #68d391;
      border-radius: 12px;
      flex-wrap: wrap;
    }

    @media (max-width: 576px) {
      .pickup-only-banner {
        flex-direction: column;
        align-items: flex-start;
      }

      .pickup-badge {
        align-self: flex-start;
      }
    }

    .pickup-icon {
      font-size: 40px;
      flex-shrink: 0;
    }

    .pickup-info {
      flex: 1;
    }

    .pickup-info strong {
      display: block;
      font-size: 16px;
      color: #276749;
      margin-bottom: 4px;
    }

    .pickup-info p {
      color: #4a5568;
      font-size: 14px;
      margin: 0 0 4px 0;
    }

    .coming-soon {
      color: #e67e22;
      font-size: 12px;
    }

    .coming-soon-badge {
      background: #fff3cd;
      color: #856404;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .pickup-badge {
      background: #38a169;
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }

    .loading-delivery,
    .error-delivery,
    .info-delivery {
      padding: 20px;
      text-align: center;
      background: #f7fafc;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .loading-delivery .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }

    .error-delivery {
      background: #fee;
      color: #c33;
    }

    .btn-retry {
      margin-top: 10px;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .info-delivery {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      text-align: left;
      color: #475569;
    }

    .info-delivery .info-icon {
      font-size: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-delivery strong {
      display: block;
      color: #1e293b;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .info-delivery p {
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .btn-scroll-to-address {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-scroll-to-address:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .btn-scroll-to-address:active {
      transform: translateY(0);
    }

    .delivery-options {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
    }

    .delivery-option {
      background: #f9f9f9;
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
      display: block;
    }

    .delivery-option.selected {
      border-color: #667eea;
      background: #e1f5fe;
    }

    .delivery-option.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #f0f0f0;
    }

    .delivery-option:not(.disabled):hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .delivery-option input[type="radio"] {
      margin-right: 10px;
    }

    .delivery-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
    }

    .delivery-info {
      flex: 1;
    }

    .delivery-info strong {
      display: block;
      margin-bottom: 5px;
      font-size: 16px;
      color: #1a202c;
    }

    .delivery-info small {
      display: block;
      color: #666;
      font-size: 13px;
      margin-top: 4px;
    }

    .delivery-info .zone-name {
      color: #667eea;
      font-weight: 500;
    }

    .delivery-info .unavailable-reason {
      color: #ef4444;
      font-style: italic;
    }

    .delivery-price {
      font-weight: 700;
      font-size: 18px;
      color: #1a202c;
      text-align: right;
      min-width: 100px;
    }

    .delivery-price.free {
      color: #10b981;
    }

    .delivery-price .unavailable-text {
      font-size: 14px;
      color: #ef4444;
      font-weight: 500;
    }

    .shipping-methods {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
    }

    .shipping-option {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: border-color 0.3s;
      display: block;
    }

    .shipping-option.selected {
      border-color: #667eea;
      background: #e1f5fe;
    }

    .shipping-option input[type="radio"] {
      margin-right: 10px;
    }

    .shipping-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
    }

    .shipping-info {
      flex: 1;
    }

    .shipping-info strong {
      display: block;
      margin-bottom: 5px;
      font-size: 16px;
    }

    .shipping-info small {
      color: #666;
      font-size: 14px;
    }

    .shipping-price {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }

    .shipping-method-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .verification-header {
      background: #e1f5fe;
      border: 1px solid #b3e5fc;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .icon {
      font-size: 24px;
      color: #4caf50;
    }

    .phone-verification-box {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }

    .verification-step {
      margin-bottom: 20px;
    }

    .phone-input-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .phone-input {
      flex: 1;
      min-width: 100px;
    }

    .btn-send-code {
      flex-shrink: 0;
      padding: 12px 20px;
      font-size: 14px;
    }

    @media (max-width: 576px) {
      .phone-input-group {
        flex-direction: column;
      }

      .country-select {
        flex: none;
        width: 100%;
      }

      .phone-input {
        flex: none;
        width: 100%;
      }

      .btn-send-code {
        width: 100%;
      }
    }

    .code-input-group {
      display: flex;
      gap: 10px;
    }

    .code-input {
      flex: 1;
    }

    .btn-verify-code {
      flex-shrink: 0;
      padding: 12px 20px;
      font-size: 14px;
    }

    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
      font-size: 14px;
      color: #155724;
    }

    .warning-text {
      color: #856404;
      background: #fff3cd;
      border: 1px solid #ffeeba;
      border-radius: 8px;
      padding: 10px;
      margin-top: 10px;
      font-size: 14px;
    }

    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 10px;
    }

    .verification-info {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }

    .btn-link-small {
      font-size: 12px;
      color: #007bff;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }

    .country-select {
      flex: 0 0 160px;
      max-width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      box-sizing: border-box;
    }

    .country-select option {
      padding: 10px;
    }

    /* ── Globale Lieferoptionen (plattformweit) ───────────────────── */
    .delivery-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #666;
      font-size: 14px;
      padding: 12px 0;
    }
    .spinner-sm {
      width: 18px; height: 18px;
      border: 2px solid #ddd;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .delivery-options-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .delivery-option-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      cursor: pointer;
      transition: border-color .2s, background .2s;
      background: white;
    }
    .delivery-option-card:hover {
      border-color: #667eea;
      background: #f7f5ff;
    }
    .delivery-option-card.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea08, #764ba208);
    }

    .delivery-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .delivery-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    .delivery-icon-wrap {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .delivery-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #eee;
      background: white;
    }

      gap: 2px;
    }
    .delivery-details strong {
      font-size: 15px;
      color: #222;
    }
    .delivery-desc {
    .summary-delivery-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-delivery-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #eee;
      background: white;
      flex-shrink: 0;
    }

      font-size: 13px;
      color: #666;
    }
    .delivery-eta {
      font-size: 12px;
      color: #888;
    }

    .delivery-price {
      font-size: 15px;
      font-weight: 600;
      color: #333;
      flex-shrink: 0;
    }
    .free-badge {
      background: #d4edda;
      color: #155724;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .delivery-check {
      width: 24px; height: 24px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }
  `]
})
export class CheckoutComponent implements OnInit, OnDestroy {
    checkoutForm: FormGroup;
    cart: Cart | null = null;
    loading = false;
    submitting = false;
    errorMessage = '';
    sameAsShipping = true;
    headerActions: HeaderAction[] = [];
    selectedShippingMethod = 'STANDARD';
    discountAmount = 0;
    hasFreeShipping = false;
    saveAddressForFuture = false;
    storeId: number | null = null;
    selectedPaymentMethod: string | null = 'CASH_ON_DELIVERY';
    phoneNumber = '';
    verificationCode = '';
    phoneVerified = false;
    sendingCode = false;
    verifyingCode = false;
    codeSentRecently = false;
    remainingSeconds = 0;
    remainingAttempts = 3;
    verificationChannel: 'sms' | 'whatsapp' = 'sms';
    phoneVerificationSent = false;
    verificationError = '';
    phoneVerificationId: number | null = null;

    private destroy$ = new Subject<void>();

    countryCodes = [
        { code: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Deutschland' },
        { code: 'AT', dialCode: '+43', flag: '🇦🇹', name: 'Österreich' },
        { code: 'CH', dialCode: '+41', flag: '🇨🇭', name: 'Schweiz' },
        { code: 'MA', dialCode: '+212', flag: '🇲🇦', name: 'Marokko' },
        { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'USA' },
        { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'UK' },
        { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'Frankreich' },
        { code: 'IT', dialCode: '+39', flag: '🇮🇹', name: 'Italien' },
        { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spanien' },
        { code: 'NL', dialCode: '+31', flag: '🇳🇱', name: 'Niederlande' },
        { code: 'PL', dialCode: '+48', flag: '🇵🇱', name: 'Polen' }
    ];

    selectedCountry = this.countryCodes[0];
    phoneNumberLocal = '';
    isPhoneValid = false;

    deliveryOptions: DeliveryOptionsResponse | null = null;
    loadingDeliveryOptions = false;
    selectedDeliveryOption: DeliveryOption | null = null;
    deliveryOptionsError = '';

    // Globale Lieferoptionen (plattformweit, kein Store-spezifisch)
    globalDeliveryOptions: GlobalDeliveryOption[] = [];
    selectedGlobalDeliveryOption: GlobalDeliveryOption | null = null;
    loadingGlobalDelivery = false;
    selectedDeliveryType: 'PICKUP' | 'DELIVERY' = 'PICKUP'; // PICKUP ist Standard
    
    // DHL Shipping & Provider Selection
    publicStore: PublicStore | null = null; // PublicStore from subdomain service
    selectedShippingProvider: 'PICKUP' | 'DHL' | 'GLOBAL_DELIVERY' = 'PICKUP';

    constructor(
        private fb: FormBuilder,
        private cartService: CartService,
        private checkoutService: CheckoutService,
        private router: Router,
        private authService: AuthService,
        private customerProfileService: CustomerProfileService,
        private subdomainService: SubdomainService,
        private phoneVerificationService: PhoneVerificationService,
        private deliveryService: DeliveryService,
        private platformDeliveryService: PlatformDeliveryService,
        private http: HttpClient
    ) {
        this.checkoutForm = this.fb.group({
            customerEmail: ['', [Validators.required, Validators.email]],
            shippingAddress: this.fb.group({
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                address1: ['', Validators.required],
                address2: [''],
                city: ['', Validators.required],
                postalCode: ['', Validators.required],
                country: ['Deutschland', Validators.required],
                phone: ['']
            }),
            billingAddress: this.fb.group({
                firstName: [''],
                lastName: [''],
                address1: [''],
                address2: [''],
                city: [''],
                postalCode: [''],
                country: ['Deutschland']
            }),
            notes: ['']
        });
    }

    ngOnInit(): void {
        this.subdomainService.resolveStore().subscribe(subdomainInfo => {
            if (subdomainInfo && subdomainInfo.storeId) {
                this.storeId = subdomainInfo.storeId;
                
                // Load full PublicStore data for DHL shipping info
                // SubdomainService liefert nur minimales SubdomainInfo, nicht das volle PublicStore
                // Daher müssen wir das PublicStore separat laden
                this.http.get<any>(`${environment.apiUrl}/public/store/resolve?host=${window.location.hostname}`)
                    .subscribe({
                        next: (store) => {
                            this.publicStore = store as PublicStore;
                            
                            // TEMP DEBUG - DHL Checkout Visibility
                            console.log('🔍 [CHECKOUT-DEBUG] PublicStore loaded:', {
                                storeId: store.storeId,
                                slug: store.slug,
                                dhlShippingEnabled: store.dhlShippingEnabled,
                                dhlShippingLabel: store.dhlShippingLabel,
                                dhlShippingPrice: store.dhlShippingPrice,
                                publicStoreIsSet: !!this.publicStore,
                                publicStoreDhlEnabled: this.publicStore?.dhlShippingEnabled,
                                templateShouldShow: this.publicStore?.dhlShippingEnabled === true
                            });
                            
                            // CRITICAL: Verify template condition
                            setTimeout(() => {
                                console.log('🔍 [CHECKOUT-DEBUG] After 500ms - publicStore still set?', {
                                    publicStoreExists: !!this.publicStore,
                                    dhlEnabled: this.publicStore?.dhlShippingEnabled,
                                    dhlLabel: this.publicStore?.dhlShippingLabel
                                });
                            }, 500);
                            // END TEMP DEBUG
                        },
                        error: (err) => {
                            console.error('❌ Failed to load PublicStore:', err);
                        }
                    });
                
                this.loadCart();
            }
        });

        this.restoreFormData();
        this.loadSavedAddresses();
        this.loadGlobalDeliveryOptions();

        // Bug-Fix: debounce verhindert API-Calls bei jedem Tastendruck
        // distinctUntilChanged verhindert Reload wenn PLZ/Stadt/Land gleich bleibt
        this.checkoutForm.get('shippingAddress')?.valueChanges.pipe(
            debounceTime(600),
            distinctUntilChanged((a, b) =>
                a.postalCode === b.postalCode &&
                a.city === b.city &&
                a.country === b.country
            ),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.loadDeliveryOptions();
        });

        this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
            if (user && user.email) {
                console.log('✅ Setze E-Mail des eingeloggten Users:', user.email);
                this.checkoutForm.patchValue({
                    customerEmail: user.email
                });
                this.checkoutForm.get('customerEmail')?.disable();
            } else {
                this.checkoutForm.get('customerEmail')?.enable();
            }
        });
    }

    loadSavedAddresses(): void {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.log('ℹ️ User nicht eingeloggt - keine gespeicherten Adressen');
            return;
        }

        this.customerProfileService.getProfile().subscribe({
            next: (profile) => {
                console.log('✅ Customer Profile geladen:', profile);

                if (profile.defaultShippingAddress) {
                    console.log('📦 Fülle gespeicherte Lieferadresse ein');
                    this.checkoutForm.patchValue({
                        shippingAddress: profile.defaultShippingAddress
                    });

                    setTimeout(() => {
                        this.loadDeliveryOptions();
                    }, 0);
                }

                if (profile.defaultBillingAddress) {
                    console.log('💳 Fülle gespeicherte Rechnungsadresse ein');
                    this.checkoutForm.patchValue({
                        billingAddress: profile.defaultBillingAddress
                    });

                    const shipping = profile.defaultShippingAddress;
                    const billing = profile.defaultBillingAddress;

                    if (
                        shipping &&
                        billing &&
                        shipping.address1 === billing.address1 &&
                        shipping.city === billing.city &&
                        shipping.postalCode === billing.postalCode
                    ) {
                        this.sameAsShipping = true;
                    } else {
                        this.sameAsShipping = false;
                    }
                }

                if (profile.phone) {
                    console.log('📱 Lade gespeicherte Telefonnummer:', profile.phone);
                    this.loadSavedPhone(profile.phone);
                }
            },
            error: (error) => {
                console.warn('⚠️ Fehler beim Laden der Adressen:', error);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Lädt plattformweite Lieferoptionen (vom Admin in DB gepflegt) */
    loadGlobalDeliveryOptions(): void {
        this.loadingGlobalDelivery = true;
        this.platformDeliveryService.getActiveOptions().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (options) => {
                    // Sortiere: PICKUP zuerst, dann nach sortOrder
                    this.globalDeliveryOptions = options.sort((a, b) => {
                        // PICKUP immer ganz oben
                        if (a.deliveryType === 'PICKUP' && b.deliveryType !== 'PICKUP') return -1;
                        if (b.deliveryType === 'PICKUP' && a.deliveryType !== 'PICKUP') return 1;
                        // Dann nach sortOrder
                        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
                    });

                    // PICKUP ist Standard - keine globale Option auswählen
                    // Filtere PICKUP-Optionen aus den globalen Optionen (wird lokal gehandhabt)
                    this.globalDeliveryOptions = this.globalDeliveryOptions.filter(o => o.deliveryType !== 'PICKUP');

                    // PICKUP als Standard setzen
                    this.selectedDeliveryType = 'PICKUP';
                    this.selectedShippingMethod = 'PICKUP';
                    this.selectedGlobalDeliveryOption = null;

                    this.loadingGlobalDelivery = false;
                },
                error: (err) => {
                    console.warn('⚠️ Globale Lieferoptionen konnten nicht geladen werden:', err);
                    this.globalDeliveryOptions = [];
                    this.selectedDeliveryType = 'PICKUP';
                    this.loadingGlobalDelivery = false;
                }
            });
    }

    /** Wählt Abholung (PICKUP) als Liefermethode */
    selectPickupOption(): void {
        this.selectedDeliveryType = 'PICKUP';
        this.selectedGlobalDeliveryOption = null;
        this.selectedShippingMethod = 'PICKUP';
        this.selectedShippingProvider = 'PICKUP';
    }

    selectGlobalDeliveryOption(option: GlobalDeliveryOption): void {
        this.selectedDeliveryType = 'DELIVERY';
        this.selectedGlobalDeliveryOption = option;
        this.selectedShippingProvider = 'GLOBAL_DELIVERY';
        // Versandmethode für Bestellformular ableiten
        if (option.deliveryType === 'EXPRESS' || option.deliveryType === 'SAME_DAY') {
            this.selectedShippingMethod = 'EXPRESS';
        } else {
            this.selectedShippingMethod = 'STANDARD';
        }
    }
    
    /** Wählt DHL Versand als Liefermethode */
    selectDhlShipping(): void {
        this.selectedDeliveryType = 'DELIVERY';
        this.selectedGlobalDeliveryOption = null;
        this.selectedShippingMethod = 'STANDARD';
        this.selectedShippingProvider = 'DHL';
    }

    loadSavedPhone(phoneNumber: string): void {
        const matchedCountry = this.countryCodes.find((country: any) =>
            phoneNumber.startsWith(country.dialCode)
        );

        if (matchedCountry) {
            this.selectedCountry = matchedCountry;
            this.phoneNumberLocal = phoneNumber.substring(matchedCountry.dialCode.length);
            this.phoneNumber = phoneNumber;

            console.log('✅ Telefonnummer geladen:', {
                country: matchedCountry.name,
                localNumber: this.phoneNumberLocal,
                fullNumber: phoneNumber
            });
        } else {
            this.phoneNumber = phoneNumber;
            console.log('⚠️ Ländercode nicht erkannt, verwende Standardland');
        }
    }

    loadCart(): void {
        this.loading = true;

        this.cartService.getCart().subscribe({
            next: (cart: Cart) => {
                this.cart = cart;
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Fehler beim Laden des Warenkorbs:', error);
                this.loading = false;
            }
        });
    }

    toggleBillingAddress(event: any): void {
        this.sameAsShipping = event.target.checked;

        if (this.sameAsShipping) {
            this.checkoutForm.get('billingAddress')?.clearValidators();
        } else {
            const billingAddress = this.checkoutForm.get('billingAddress');
            billingAddress?.get('firstName')?.setValidators([Validators.required]);
            billingAddress?.get('lastName')?.setValidators([Validators.required]);
            billingAddress?.get('address1')?.setValidators([Validators.required]);
            billingAddress?.get('city')?.setValidators([Validators.required]);
            billingAddress?.get('postalCode')?.setValidators([Validators.required]);
            billingAddress?.get('country')?.setValidators([Validators.required]);
        }

        this.checkoutForm.get('billingAddress')?.updateValueAndValidity();
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.checkoutForm.get(fieldName);
        return !!(field?.invalid && field?.touched);
    }

    submitOrder(): void {
        if (this.checkoutForm.invalid || !this.cart) {
            this.checkoutForm.markAllAsTouched();
            return;
        }

        // DEAKTIVIERT: Lieferoption und Telefonverifizierung vorerst nicht erforderlich
        // selectedDeliveryOption und phoneVerified werden erst nach Aktivierung benötigt

        this.submitting = true;
        this.errorMessage = '';

        const formValue = this.checkoutForm.value;

        const customerEmail = this.checkoutForm.get('customerEmail')?.disabled
            ? this.checkoutForm.get('customerEmail')?.value
            : formValue.customerEmail;

        const request: any = {
            storeId: this.cart.storeId,
            customerEmail: customerEmail,
            shippingAddress: formValue.shippingAddress,
            billingAddress: this.sameAsShipping ? formValue.shippingAddress : formValue.billingAddress,
            paymentMethod: this.selectedPaymentMethod,
            // Shipping Provider: DHL, PICKUP, GLOBAL_DELIVERY
            shippingProvider: this.selectedShippingProvider,
            // PICKUP oder globale Lieferoption
            deliveryType: this.selectedDeliveryType === 'PICKUP' ? 'PICKUP' : (this.selectedGlobalDeliveryOption?.deliveryType || 'STANDARD'),
            deliveryOptionId: this.selectedDeliveryType === 'PICKUP' ? null : (this.selectedGlobalDeliveryOption?.id || null),
            deliveryMode: null
        };

        if (formValue.notes?.trim()) {
            request.notes = formValue.notes.trim();
        }

        // Session-ID für Guest-Checkout
        const sessionId = localStorage.getItem('cartSessionId') || sessionStorage.getItem('cartSessionId');
        if (sessionId && !this.isUserLoggedIn()) {
            request.sessionId = sessionId;
        }

        console.log('📦 Sende Checkout-Request:', {
            email: customerEmail,
            deliveryType: request.deliveryType,
            deliveryOptionId: request.deliveryOptionId,
            deliveryOptionName: this.selectedDeliveryType === 'PICKUP' ? 'Abholung' : this.selectedGlobalDeliveryOption?.name,
            paymentMethod: this.selectedPaymentMethod
        });

        this.checkoutService.checkout(request).subscribe({
            next: (response) => {
                console.log('✅ Bestellung erfolgreich:', response);

                if (this.saveAddressForFuture && this.isUserLoggedIn()) {
                    this.saveAddressToProfile(
                        formValue.shippingAddress,
                        this.sameAsShipping ? formValue.shippingAddress : formValue.billingAddress
                    );
                }

                const emailForConfirmation = this.checkoutForm.get('customerEmail')?.disabled
                    ? this.checkoutForm.get('customerEmail')?.value
                    : formValue.customerEmail;

                console.log('📧 Navigiere zur Confirmation mit E-Mail:', emailForConfirmation);

                this.router.navigate(['/order-confirmation'], {
                    queryParams: {
                        orderNumber: response.orderNumber,
                        email: emailForConfirmation
                    }
                });
            },
            error: (error) => {
                this.submitting = false;

                if (error.status === 400) {
                    this.errorMessage = error.error?.error || 'Ungültige Eingabedaten. Bitte überprüfen Sie Ihre Angaben.';
                } else if (error.status === 409) {
                    this.errorMessage = 'Die gewählte Lieferoption ist für diese Adresse nicht verfügbar. Bitte wählen Sie eine andere Option.';
                    this.loadDeliveryOptions();
                } else {
                    this.errorMessage = error.message || 'Fehler beim Aufgeben der Bestellung. Bitte versuchen Sie es erneut.';
                }

                console.error('❌ Checkout-Fehler:', error);
            }
        });
    }

    private saveAddressToProfile(shippingAddress: any, billingAddress: any): void {
        const saveRequest: SaveAddressRequest = {
            shippingAddress: shippingAddress,
            billingAddress: billingAddress
        };

        console.log('💾 Speichere Adressen für zukünftige Bestellungen');
        this.customerProfileService.saveAddress(saveRequest).subscribe({
            next: () => {
                console.log('✅ Adressen erfolgreich gespeichert');
            },
            error: (error) => {
                console.warn('⚠️ Fehler beim Speichern der Adressen:', error);
            }
        });
    }

    onCouponsApplied(response: ValidateCouponsResponse): void {
        console.log('✅ Gutscheine angewendet:', response);
        this.discountAmount = response.cartTotals.discountCents / 100;
        this.hasFreeShipping = response.validCoupons.some(c => c.type === 'FREE_SHIPPING');
    }

    getCartData(): any {
        if (!this.cart) return null;

        return {
            currency: 'EUR',
            subtotalCents: Math.round(this.cart.subtotal * 100),
            customerEmail: this.checkoutForm.get('customerEmail')?.value || '',
            items: this.cart.items.map(item => ({
                productId: item.variantId,
                productName: item.productTitle,
                priceCents: Math.round(item.priceSnapshot * 100),
                quantity: item.quantity,
                categoryIds: [],
                collectionIds: []
            }))
        };
    }

    getDomainHost(): string {
        return window.location.hostname;
    }

    getTax(): number {
        if (!this.cart) return 0;
        const discounted = Math.max(0, this.cart.subtotal - this.discountAmount);
        return discounted * 0.19;
    }

    getFinalTotal(): number {
        if (!this.cart) return 0;
        const subtotal = this.cart.subtotal;
        // Liefergebühr: 0 bei PICKUP, sonst aus globaler Lieferoption
        const deliveryFee = this.selectedDeliveryType === 'PICKUP' ? 0 : (this.selectedGlobalDeliveryOption?.price ?? 0);
        const discounted = Math.max(0, subtotal - this.discountAmount);
        const tax = discounted * 0.19;
        return discounted + tax + deliveryFee;
    }

    loadDeliveryOptions(): void {
        if (!this.storeId) {
            console.warn('Store ID not set, cannot load delivery options');
            return;
        }

        const shippingAddress = this.checkoutForm.get('shippingAddress');
        const postalCode = shippingAddress?.get('postalCode')?.value?.trim();
        const city = shippingAddress?.get('city')?.value?.trim();
        const country = shippingAddress?.get('country')?.value?.trim();

        if (!postalCode || !city || !country) {
            this.deliveryOptions = null;
            this.selectedDeliveryOption = null;
            this.deliveryOptionsError = '';
            return;
        }

        console.log('🚚 Loading delivery options for:', { postalCode, city, country });
        this.loadingDeliveryOptions = true;
        this.deliveryOptionsError = '';

        this.deliveryService.getDeliveryOptions(this.storeId, postalCode, city, country).subscribe({
            next: (response) => {
                console.log('✅ Delivery options loaded:', response);
                this.deliveryOptions = response;
                this.loadingDeliveryOptions = false;

                const firstAvailable = response.options.find(opt => opt.available);
                if (firstAvailable) {
                    this.selectDeliveryOption(firstAvailable);
                } else {
                    this.selectedDeliveryOption = null;
                }
            },
            error: (err) => {
                console.error('❌ Error loading delivery options:', err);
                this.deliveryOptionsError = 'Fehler beim Laden der Lieferoptionen. Bitte versuchen Sie es erneut.';
                this.loadingDeliveryOptions = false;
                this.deliveryOptions = null;
                this.selectedDeliveryOption = null;
            }
        });
    }

    selectDeliveryOption(option: DeliveryOption): void {
        if (!option.available) {
            return;
        }

        this.selectedDeliveryOption = option;
        console.log('✅ Selected delivery option:', option);

        if (option.deliveryType === 'DELIVERY' && option.deliveryMode === 'EXPRESS') {
            this.selectedShippingMethod = 'EXPRESS';
        } else if (option.deliveryType === 'DELIVERY' && option.deliveryMode === 'STANDARD') {
            this.selectedShippingMethod = 'STANDARD';
        } else {
            this.selectedShippingMethod = 'PICKUP';
        }
    }

    isDeliveryOptionSelected(option: DeliveryOption): boolean {
        if (!this.selectedDeliveryOption) return false;

        return (
            this.selectedDeliveryOption.deliveryType === option.deliveryType &&
            this.selectedDeliveryOption.deliveryMode === option.deliveryMode
        );
    }

    getDeliveryOptionLabel(option: DeliveryOption): string {
        if (option.deliveryType === 'PICKUP') {
            return '📦 Abholung im Geschäft';
        } else if (option.deliveryMode === 'STANDARD') {
            return '🚚 Standard Lieferung';
        } else if (option.deliveryMode === 'EXPRESS') {
            return '⚡ Express Lieferung';
        }
        return 'Lieferung';
    }

    getDeliveryEta(etaMinutes: number | null | undefined): string {
        if (!etaMinutes) return '';

        if (etaMinutes < 60) {
            return `ca. ${etaMinutes} Minuten`;
        } else if (etaMinutes < 1440) {
            const hours = Math.round(etaMinutes / 60);
            return `ca. ${hours} Stunden`;
        } else {
            const days = Math.round(etaMinutes / 1440);
            return `ca. ${days} Tage`;
        }
    }

    goBack(): void {
        this.router.navigate(['/cart']);
    }

    goToShop(): void {
        this.router.navigate(['/storefront']);
    }

    getProductPlaceholder(): string {
        return PlaceholderImageUtil.getProductPlaceholder(60);
    }

    onImageError(event: Event): void {
        const target = event.target as HTMLImageElement;
        target.src = this.getProductPlaceholder();
    }

    isUserLoggedIn(): boolean {
        return this.authService.isAuthenticated();
    }

    getCurrentUserEmail(): string {
        return this.authService.getCurrentUserEmail() || 'Gast';
    }

    showLoginModal(): void {
        console.log('🔐 Weiterleitung zum Login');
        this.saveFormData();
        this.router.navigate(['/login'], {
            queryParams: { returnUrl: '/checkout' }
        });
    }

    showRegisterModal(): void {
        console.log('📝 Weiterleitung zur Registrierung');
        this.saveFormData();
        this.router.navigate(['/register'], {
            queryParams: { returnUrl: '/checkout' }
        });
    }

    logout(): void {
        if (confirm('Möchten Sie sich wirklich abmelden? Ihre Formular-Daten bleiben erhalten.')) {
            this.authService.logout();
            this.checkoutForm.get('customerEmail')?.enable();
            this.loadCart();
        }
    }

    private saveFormData(): void {
        const formData = {
            customerEmail: this.checkoutForm.get('customerEmail')?.value,
            shippingAddress: this.checkoutForm.get('shippingAddress')?.value,
            billingAddress: this.checkoutForm.get('billingAddress')?.value,
            notes: this.checkoutForm.get('notes')?.value,
            sameAsShipping: this.sameAsShipping
        };

        localStorage.setItem('checkout_form_data', JSON.stringify(formData));
        console.log('💾 Formular-Daten für Login/Register gespeichert');
    }

    private restoreFormData(): void {
        const savedData = localStorage.getItem('checkout_form_data');
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                console.log('📂 Stelle gespeicherte Formular-Daten wieder her');

                if (!this.checkoutForm.get('shippingAddress.firstName')?.value) {
                    this.checkoutForm.patchValue({
                        shippingAddress: formData.shippingAddress,
                        billingAddress: formData.billingAddress,
                        notes: formData.notes
                    });

                    setTimeout(() => {
                        this.loadDeliveryOptions();
                    }, 0);
                }

                this.sameAsShipping = formData.sameAsShipping;
                localStorage.removeItem('checkout_form_data');
                console.log('✅ Formular-Daten wiederhergestellt und bereinigt');
            } catch (e) {
                console.error('❌ Fehler beim Wiederherstellen der Formular-Daten:', e);
                localStorage.removeItem('checkout_form_data');
            }
        }
    }

    sendVerificationCode(): void {
        if (!this.phoneNumberLocal?.trim() || !this.storeId) {
            return;
        }

        this.sendingCode = true;
        this.verificationError = '';

        const fullPhoneNumber = this.selectedCountry.dialCode + this.phoneNumberLocal.trim();
        this.phoneNumber = fullPhoneNumber;

        this.phoneVerificationService.sendVerificationCode(fullPhoneNumber, this.storeId).subscribe({
            next: (response) => {
                console.log('✅ Verifizierungscode gesendet:', response);
                this.sendingCode = false;

                if (response.success) {
                    this.phoneVerificationSent = true;
                    this.phoneVerificationId = response.verificationId || null;
                    this.verificationChannel = response.channel as 'sms' | 'whatsapp';
                    this.remainingAttempts = response.remainingAttempts || 3;
                    this.codeSentRecently = true;
                    this.remainingSeconds = 60;
                    this.startCountdown();
                } else {
                    this.verificationError = response.message || 'Fehler beim Senden des Codes';
                }
            },
            error: (error) => {
                console.error('❌ Fehler beim Senden des Codes:', error);
                this.sendingCode = false;
                this.verificationError = 'Fehler beim Senden des Codes. Bitte versuchen Sie es später erneut.';
            }
        });
    }

    private startCountdown(): void {
        const interval = setInterval(() => {
            this.remainingSeconds--;

            if (this.remainingSeconds <= 0) {
                clearInterval(interval);
                this.remainingSeconds = 0;
                this.codeSentRecently = false;
            }
        }, 1000);
    }

    verifyCode(): void {
        if (this.verifyingCode || this.verificationCode.length !== 6 || !this.phoneVerificationId) {
            return;
        }

        this.verifyingCode = true;
        this.verificationError = '';

        this.phoneVerificationService.verifyCode(this.phoneVerificationId, this.verificationCode).subscribe({
            next: (response) => {
                console.log('✅ Code verifiziert:', response);
                this.verifyingCode = false;

                if (response.success) {
                    this.phoneVerified = true;
                    this.verificationError = '';
                    this.savePhoneToProfile();
                } else {
                    this.phoneVerified = false;
                    this.remainingAttempts--;
                    this.verificationError = response.message || 'Ungültiger Code';

                    if (this.remainingAttempts <= 0) {
                        this.verificationError = 'Maximale Anzahl an Versuchen erreicht. Bitte fordern Sie einen neuen Code an.';
                        this.phoneVerificationSent = false;
                        this.verificationCode = '';
                    }
                }
            },
            error: (error) => {
                console.error('❌ Fehler bei der Verifizierung:', error);
                this.verifyingCode = false;
                this.verificationError = 'Fehler bei der Verifizierung. Bitte versuchen Sie es erneut.';
                this.remainingAttempts--;
            }
        });
    }

    onCodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value;
        value = value.replace(/[^\d]/g, '');
        this.verificationCode = value;

        if (value.length === 6) {
            this.verifyCode();
        }
    }

    resendCode(): void {
        if (this.codeSentRecently) {
            return;
        }

        this.phoneVerificationSent = false;
        this.verificationCode = '';
        this.verificationError = '';
        this.remainingAttempts = 3;
        this.sendVerificationCode();
    }

    onPaymentMethodChange(): void {
        console.log('💳 Zahlungsmethode geändert:', this.selectedPaymentMethod);

        if (this.selectedPaymentMethod !== 'CASH_ON_DELIVERY') {
            this.phoneVerified = true;
            this.phoneVerificationId = null;
        } else {
            this.phoneVerified = false;
            this.phoneVerificationSent = false;
            this.verificationCode = '';
            this.verificationError = '';
        }
    }

    onCountryChange(): void {
        console.log('🌍 Land geändert:', this.selectedCountry);
        this.phoneNumberLocal = '';

        setTimeout(() => {
            const phoneInput = document.querySelector('.phone-input') as HTMLInputElement;
            phoneInput?.focus();
        }, 100);
    }

    savePhoneToProfile(): void {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.log('ℹ️ Nutzer nicht angemeldet - Telefonnummer wird nicht im Profil gespeichert');
            return;
        }

        const fullPhoneNumber = this.selectedCountry.dialCode + this.phoneNumberLocal.trim();

        console.log('💾 Speichere verifizierte Telefonnummer im Profil:', fullPhoneNumber);

        this.checkoutForm.patchValue({
            shippingAddress: {
                ...this.checkoutForm.get('shippingAddress')?.value,
                phone: fullPhoneNumber
            }
        });

        this.customerProfileService.updateProfile({
            phone: fullPhoneNumber
        }).subscribe({
            next: () => {
                console.log('✅ Telefonnummer erfolgreich im Profil gespeichert');
            },
            error: (error) => {
                console.warn('⚠️ Telefonnummer konnte nicht im Profil gespeichert werden:', error);
            }
        });
    }

    onShippingMethodChange(): void {
        console.log('🚚 Versandmethode geändert:', this.selectedShippingMethod);
    }

    scrollToAddress(): void {
        const addressSection = document.querySelector('.form-section h2');
        if (addressSection) {
            addressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('📍 Scrolle zur Lieferadresse');

            setTimeout(() => {
                const postalCodeInput = document.getElementById('postalCode') as HTMLInputElement;
                if (postalCodeInput) {
                    postalCodeInput.focus();
                }
            }, 500);
        }
    }
}
