import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, Cart } from '../../core/services/cart.service';
import { CheckoutService, CheckoutRequest } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerProfileService, SaveAddressRequest } from '../../core/services/customer-profile.service';
import { SubdomainService } from '../../core/services/subdomain.service'; // NEUE: Import hinzugefügt
import { CouponInputComponent } from '../../shared/components/coupon-input/coupon-input.component';
import { ValidateCouponsResponse } from '../../core/services/coupon.service';
import { PlaceholderImageUtil } from '../../shared/utils/placeholder-image.util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CouponInputComponent],
  template: `
    <div class="checkout-container">
      <div class="checkout-header">
        <h1>Kasse</h1>
        <button class="btn-back" (click)="goBack()">← Zurück zum Warenkorb</button>
      </div>

      <!-- Login-Hinweis für Guests (oberhalb des Formulars) -->
      <div *ngIf="!isUserLoggedIn() && !loading && cart && cart.items.length > 0" class="guest-login-hint">
        <div class="hint-content">
          <div class="hint-icon">👤</div>
          <div class="hint-text">
            <h3>Bereits Kunde?</h3>
            <p>Melden Sie sich an, um Ihre gespeicherten Adressen zu nutzen und Bestellungen zu verfolgen.</p>
          </div>
          <div class="hint-actions">
            <button class="btn btn-secondary" (click)="showLoginModal()">🔐 Anmelden</button>
            <button class="btn btn-outline" (click)="showRegisterModal()">📝 Registrieren</button>
          </div>
        </div>
        <div class="hint-guest">
          <p><strong>Neu hier?</strong> Bestellen Sie einfach als Gast weiter unten.</p>
        </div>
      </div>

      <!-- Erfolgs-Nachricht für eingeloggte User -->
      <div *ngIf="isUserLoggedIn() && !loading && cart && cart.items.length > 0" class="logged-in-banner">
        <div class="banner-content">
          <span class="banner-icon">✅</span>
          <span class="banner-text">Angemeldet als <strong>{{ getCurrentUserEmail() }}</strong></span>
          <button class="btn-link" (click)="logout()">Abmelden</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        Warenkorb wird geladen...
      </div>

      <div *ngIf="!loading && (!cart || cart.items.length === 0)" class="empty-cart">
        <h2>Ihr Warenkorb ist leer</h2>
        <p>Bitte fügen Sie Artikel hinzu, bevor Sie zur Kasse gehen</p>
        <button class="btn btn-primary" (click)="goToShop()">Zum Shop</button>
      </div>

      <div *ngIf="!loading && cart && cart.items.length > 0" class="checkout-content">
        <div class="checkout-form">
          <form [formGroup]="checkoutForm" (ngSubmit)="submitOrder()">
            <!-- Kontaktinformationen -->
            <section class="form-section">
              <h2>Kontaktinformationen</h2>
              <div class="form-group">
                <label for="email">E-Mail-Adresse *</label>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="customerEmail"
                  placeholder="ihre@email.de"
                />
                <div *ngIf="checkoutForm.get('customerEmail')?.invalid && checkoutForm.get('customerEmail')?.touched" class="error">
                  Bitte geben Sie eine gültige E-Mail-Adresse ein
                </div>
              </div>
            </section>

            <!-- Lieferadresse -->
            <section class="form-section" formGroupName="shippingAddress">
              <h2>Lieferadresse</h2>
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Vorname *</label>
                  <input id="firstName" type="text" formControlName="firstName" />
                  <div *ngIf="isFieldInvalid('shippingAddress.firstName')" class="error">
                    Vorname ist erforderlich
                  </div>
                </div>
                <div class="form-group">
                  <label for="lastName">Nachname *</label>
                  <input id="lastName" type="text" formControlName="lastName" />
                  <div *ngIf="isFieldInvalid('shippingAddress.lastName')" class="error">
                    Nachname ist erforderlich
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="address1">Straße und Hausnummer *</label>
                <input id="address1" type="text" formControlName="address1" />
                <div *ngIf="isFieldInvalid('shippingAddress.address1')" class="error">
                  Adresse ist erforderlich
                </div>
              </div>

              <div class="form-group">
                <label for="address2">Adresszusatz (optional)</label>
                <input id="address2" type="text" formControlName="address2" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="postalCode">PLZ *</label>
                  <input id="postalCode" type="text" formControlName="postalCode" />
                  <div *ngIf="isFieldInvalid('shippingAddress.postalCode')" class="error">
                    PLZ ist erforderlich
                  </div>
                </div>
                <div class="form-group">
                  <label for="city">Stadt *</label>
                  <input id="city" type="text" formControlName="city" />
                  <div *ngIf="isFieldInvalid('shippingAddress.city')" class="error">
                    Stadt ist erforderlich
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="country">Land *</label>
                <select id="country" formControlName="country">
                  <option value="">Bitte wählen</option>
                  <option value="Deutschland">Deutschland</option>
                  <option value="Österreich">Österreich</option>
                  <option value="Schweiz">Schweiz</option>
                </select>
                <div *ngIf="isFieldInvalid('shippingAddress.country')" class="error">
                  Land ist erforderlich
                </div>
              </div>

              <div class="form-group">
                <label for="phone">Telefon (optional)</label>
                <input id="phone" type="tel" formControlName="phone" />
              </div>
            </section>

            <!-- Rechnungsadresse -->
            <section class="form-section">
              <div class="checkbox-wrapper">
                <label>
                  <input type="checkbox" [checked]="sameAsShipping" (change)="toggleBillingAddress($event)" />
                  Rechnungsadresse ist identisch mit Lieferadresse
                </label>
              </div>

              <div *ngIf="!sameAsShipping" formGroupName="billingAddress">
                <h2>Rechnungsadresse</h2>
                <div class="form-row">
                  <div class="form-group">
                    <label for="billFirstName">Vorname *</label>
                    <input id="billFirstName" type="text" formControlName="firstName" />
                  </div>
                  <div class="form-group">
                    <label for="billLastName">Nachname *</label>
                    <input id="billLastName" type="text" formControlName="lastName" />
                  </div>
                </div>

                <div class="form-group">
                  <label for="billAddress1">Straße und Hausnummer *</label>
                  <input id="billAddress1" type="text" formControlName="address1" />
                </div>

                <div class="form-group">
                  <label for="billAddress2">Adresszusatz (optional)</label>
                  <input id="billAddress2" type="text" formControlName="address2" />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="billPostalCode">PLZ *</label>
                    <input id="billPostalCode" type="text" formControlName="postalCode" />
                  </div>
                  <div class="form-group">
                    <label for="billCity">Stadt *</label>
                    <input id="billCity" type="text" formControlName="city" />
                  </div>
                </div>

                <div class="form-group">
                  <label for="billCountry">Land *</label>
                  <select id="billCountry" formControlName="country">
                    <option value="">Bitte wählen</option>
                    <option value="Deutschland">Deutschland</option>
                    <option value="Österreich">Österreich</option>
                    <option value="Schweiz">Schweiz</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Anmerkungen -->
            <section class="form-section">
              <h2>Anmerkungen (optional)</h2>
              <div class="form-group">
                <textarea 
                  formControlName="notes" 
                  rows="4" 
                  placeholder="Besondere Wünsche oder Anmerkungen zur Bestellung..."
                ></textarea>
              </div>
            </section>

            <!-- Adresse speichern Checkbox (nur für eingeloggte User) -->
            <section class="form-section" *ngIf="isUserLoggedIn()">
              <div class="checkbox-wrapper">
                <label>
                  <input type="checkbox" [(ngModel)]="saveAddressForFuture" [ngModelOptions]="{standalone: true}" />
                  💾 Diese Adresse für zukünftige Bestellungen speichern
                </label>
                <p class="help-text">Ihre Adresse wird beim nächsten Checkout automatisch ausgefüllt</p>
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
              {{ submitting ? 'Bestellung wird aufgegeben...' : 'Zahlungspflichtig bestellen' }}
            </button>
          </form>
        </div>

        <div class="order-summary">
          <h2>Bestellübersicht</h2>
          
          <div class="summary-items">
            <div class="summary-item" *ngFor="let item of cart.items">
              <img [src]="item.imageUrl || getProductPlaceholder()" 
                   [alt]="item.productTitle"
                   (error)="onImageError($event)">
              <div class="item-info">
                <h4>{{ item.productTitle }}</h4>
                <p>{{ item.variantSku }}</p>
                <p class="quantity">Menge: {{ item.quantity }}</p>
              </div>
              <div class="item-price">
                {{ (item.priceSnapshot * item.quantity) | number:'1.2-2' }} €
              </div>
            </div>
          </div>

          <!-- Gutschein-Eingabe -->
          <div class="coupon-section">
            <app-coupon-input
              [storeId]="cart.storeId"
              [cart]="getCartData()"
              [domainHost]="getDomainHost()"
              (couponsApplied)="onCouponsApplied($event)">
            </app-coupon-input>
          </div>

          <div class="summary-totals">
            <div class="summary-row">
              <span>Zwischensumme</span>
              <span>{{ cart.subtotal | number:'1.2-2' }} €</span>
            </div>
            <div class="summary-row discount" *ngIf="discountAmount > 0">
              <span>🎉 Rabatt</span>
              <span class="discount-value">-{{ discountAmount | number:'1.2-2' }} €</span>
            </div>
            <div class="summary-row">
              <span>Versand</span>
              <span>{{ (hasFreeShipping ? 0 : shipping) | number:'1.2-2' }} €</span>
            </div>
            <div class="summary-row total">
              <strong>Gesamt</strong>
              <strong>{{ getFinalTotal() | number:'1.2-2' }} €</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .checkout-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
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
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
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
      
      .discount-value {
        font-size: 18px;
        font-weight: 700;
      }
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
    }

    .hint-icon {
      font-size: 28px;
      color: #667eea;
    }

    .hint-text {
      flex: 1;
    }

    .hint-actions {
      display: flex;
      gap: 10px;
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
  `]
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  cart: Cart | null = null;
  loading = false;
  submitting = false;
  errorMessage = '';
  sameAsShipping = true;
  shipping = 4.99;
  discountAmount = 0;
  hasFreeShipping = false;
  saveAddressForFuture = false;
  storeId: number | null = null; // NEUE: Store-ID aus Subdomain

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private router: Router,
    private authService: AuthService,
    private customerProfileService: CustomerProfileService,
    private subdomainService: SubdomainService // NEUE: SubdomainService injiziert
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
    this.loadCart();

    // FIXED: Stelle gespeicherte Formular-Daten wieder her (falls User von Login zurückkommt)
    this.restoreFormData();

    this.loadSavedAddresses();

    // FIXED: Setze E-Mail des eingeloggten Users automatisch
    this.authService.currentUser$.subscribe(user => {
      if (user && user.email) {
        console.log('✅ Setze E-Mail des eingeloggten Users:', user.email);
        this.checkoutForm.patchValue({
          customerEmail: user.email
        });
        // Disable das Feld, damit der User es nicht ändern kann
        this.checkoutForm.get('customerEmail')?.disable();
      } else {
        // User nicht eingeloggt - Feld aktivieren
        this.checkoutForm.get('customerEmail')?.enable();
      }
    });
  }

  /**
   * Lädt die gespeicherten Adressen des Kunden und füllt das Formular vor
   */
  loadSavedAddresses(): void {
    // Nur laden wenn User eingeloggt ist
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('ℹ️ User nicht eingeloggt - keine gespeicherten Adressen');
      return;
    }

    this.customerProfileService.getProfile().subscribe({
      next: (profile) => {
        console.log('✅ Customer Profile geladen:', profile);

        // Fülle Shipping-Adresse wenn vorhanden
        if (profile.defaultShippingAddress) {
          console.log('📦 Fülle gespeicherte Lieferadresse ein');
          this.checkoutForm.patchValue({
            shippingAddress: profile.defaultShippingAddress
          });
        }

        // Fülle Billing-Adresse wenn vorhanden
        if (profile.defaultBillingAddress) {
          console.log('💳 Fülle gespeicherte Rechnungsadresse ein');
          this.checkoutForm.patchValue({
            billingAddress: profile.defaultBillingAddress
          });

          // Prüfe ob Adressen identisch sind
          const shipping = profile.defaultShippingAddress;
          const billing = profile.defaultBillingAddress;

          if (shipping && billing &&
              shipping.address1 === billing.address1 &&
              shipping.city === billing.city &&
              shipping.postalCode === billing.postalCode) {
            this.sameAsShipping = true;
          } else {
            this.sameAsShipping = false;
          }
        }
      },
      error: (error) => {
        console.warn('⚠️ Fehler beim Laden der Adressen:', error);
        // Kein Fehler anzeigen - User kann manuell eingeben
      }
    });
  }

  loadCart(): void {
    this.loading = true;
    const storeId = 1; // TODO: Aus Route oder Store-Service laden
    this.cartService.getCart(storeId).subscribe({
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
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const formValue = this.checkoutForm.value;

    // FIXED: Wenn E-Mail-Feld disabled ist, hole den Wert direkt
    const customerEmail = this.checkoutForm.get('customerEmail')?.disabled
      ? this.checkoutForm.get('customerEmail')?.value
      : formValue.customerEmail;

    // FIXED: sessionId nicht mehr nötig - JWT-Token wird automatisch im Header gesendet
    const request: CheckoutRequest = {
      storeId: this.cart.storeId,
      customerEmail: customerEmail,
      shippingAddress: formValue.shippingAddress,
      billingAddress: this.sameAsShipping ? formValue.shippingAddress : formValue.billingAddress,
      notes: formValue.notes
    };

    console.log('📦 Sende Checkout-Request mit E-Mail:', customerEmail);

    this.checkoutService.checkout(request).subscribe({
      next: (response) => {
        console.log('✅ Bestellung erfolgreich:', response);

        // Speichere Adresse wenn gewünscht und User eingeloggt ist
        if (this.saveAddressForFuture && this.isUserLoggedIn()) {
          this.saveAddressToProfile(formValue.shippingAddress,
            this.sameAsShipping ? formValue.shippingAddress : formValue.billingAddress);
        }

        // FIXED: Verwende die E-Mail aus dem Formular (die des eingeloggten Users), nicht aus der Response
        const emailForConfirmation = this.checkoutForm.get('customerEmail')?.disabled
          ? this.checkoutForm.get('customerEmail')?.value
          : formValue.customerEmail;

        console.log('📧 Navigiere zur Confirmation mit E-Mail:', emailForConfirmation);

        this.router.navigate(['/order-confirmation'], {
          queryParams: {
            orderNumber: response.orderNumber,
            email: emailForConfirmation  // Verwende die E-Mail des eingeloggten Users
          }
        });
      },
      error: (error) => {
        this.submitting = false;
        this.errorMessage = error.message || 'Fehler beim Aufgeben der Bestellung. Bitte versuchen Sie es erneut.';
        console.error('❌ Checkout-Fehler:', error);
      }
    });
  }

  /**
   * Speichert die Adressen im Customer Profile
   */
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
        // Fehler wird nicht angezeigt, da Bestellung bereits erfolgreich war
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

  getFinalTotal(): number {
    if (!this.cart) return 0;
    const subtotal = this.cart.subtotal;
    const shippingCost = this.hasFreeShipping ? 0 : this.shipping;
    return Math.max(0, subtotal - this.discountAmount + shippingCost);
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
    // Speichere aktuelle Formular-Daten im localStorage
    this.saveFormData();
    // Leite zum Login weiter mit Rückkehr-URL
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/checkout' }
    });
  }

  showRegisterModal(): void {
    console.log('📝 Weiterleitung zur Registrierung');
    // Speichere aktuelle Formular-Daten im localStorage
    this.saveFormData();
    // Leite zur Registrierung weiter mit Rückkehr-URL
    this.router.navigate(['/register'], {
      queryParams: { returnUrl: '/checkout' }
    });
  }

  logout(): void {
    if (confirm('Möchten Sie sich wirklich abmelden? Ihre Formular-Daten bleiben erhalten.')) {
      this.authService.logout();
      // Formular bleibt ausgefüllt, nur E-Mail-Feld wird freigegeben
      this.checkoutForm.get('customerEmail')?.enable();
      // Trigger Warenkorb-Update
      this.loadCart();
    }
  }

  /**
   * Speichert die aktuellen Formular-Daten im localStorage
   * um sie nach Login/Registrierung wiederherzustellen
   */
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

  /**
   * Stellt gespeicherte Formular-Daten wieder her (nach Login/Register)
   */
  private restoreFormData(): void {
    const savedData = localStorage.getItem('checkout_form_data');
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        console.log('📂 Stelle gespeicherte Formular-Daten wieder her');

        // Setze nur die Felder, die noch leer sind (gespeicherte Adressen haben Vorrang)
        if (!this.checkoutForm.get('shippingAddress.firstName')?.value) {
          this.checkoutForm.patchValue({
            shippingAddress: formData.shippingAddress,
            billingAddress: formData.billingAddress,
            notes: formData.notes
          });
        }

        this.sameAsShipping = formData.sameAsShipping;

        // Entferne gespeicherte Daten nach Wiederherstellung
        localStorage.removeItem('checkout_form_data');
        console.log('✅ Formular-Daten wiederhergestellt und bereinigt');
      } catch (e) {
        console.error('❌ Fehler beim Wiederherstellen der Formular-Daten:', e);
        localStorage.removeItem('checkout_form_data');
      }
    }
  }
}
