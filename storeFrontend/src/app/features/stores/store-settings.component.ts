import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Store } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { StoreSliderEditorComponent } from './components/store-slider-editor.component';
import { PaymentSettingsComponent } from '../settings/payment-settings/payment-settings.component';

/**
 * Wiederverwendbares Settings-Tab Interface.
 * `visible` → false = ausgeblendet
 * `beta` → true = nur für Beta-User sichtbar
 */
export interface SettingsTab {
  id: string;
  icon: string;
  labelKey: string;
  visible?: boolean;
  beta?: boolean;
}

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StoreNavigationComponent, TranslatePipe, StoreSliderEditorComponent, PaymentSettingsComponent],
  template: `
    <div class="store-settings-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [currentPage]="'navigation.settings' | translate">
      </app-store-navigation>

      <div class="settings-content" *ngIf="store">
        <h1 class="settings-title">{{ 'navigation.settings' | translate }}</h1>
        
        <!-- Wiederverwendbare Tab-Leiste (analog app-productnavigation-bar) -->
        <nav class="settings-tabs" role="tablist">
          <button
            *ngFor="let tab of visibleTabs"
            class="settings-tab"
            role="tab"
            [class.active]="activeTab === tab.id"
            [attr.aria-selected]="activeTab === tab.id"
            (click)="onTabClick(tab.id)">
            <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.labelKey | translate }}</span>
            <span class="beta-badge" *ngIf="tab.beta">Beta</span>
            <span class="tab-indicator"></span>
          </button>
        </nav>

        <!-- General Settings -->
        <div class="tab-content" *ngIf="activeTab === 'general'">
          <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
            <div class="form-group">
              <label for="name">Store Name</label>
              <input 
                id="name"
                type="text" 
                formControlName="name" 
                class="form-control"
                placeholder="Mein Store">
            </div>

            <div class="form-group">
              <label for="slug">Store Slug</label>
              <input 
                id="slug"
                type="text" 
                formControlName="slug" 
                class="form-control"
                placeholder="mein-store">
              <small class="form-text">Ihre Store-URL: {{ settingsForm.get('slug')?.value }}.markt.ma</small>
            </div>

            <div class="form-group">
              <label for="description">Beschreibung</label>
              <textarea 
                id="description"
                formControlName="description" 
                class="form-control"
                rows="4"
                placeholder="Beschreiben Sie Ihren Store..."></textarea>
            </div>

            <!-- ─── WhatsApp-Einstellungen ─── -->
            <div class="whatsapp-section">
              <h3 class="section-title">
                <span class="section-icon">📱</span>
                {{ 'settings.whatsapp.title' | translate }}
              </h3>

              <div class="form-group">
                <label for="whatsappNumber">{{ 'settings.whatsapp.number' | translate }}</label>
                <input
                  id="whatsappNumber"
                  type="tel"
                  formControlName="whatsappNumber"
                  class="form-control"
                  [placeholder]="'settings.whatsapp.numberPlaceholder' | translate"
                  maxlength="20">
                <small class="form-text">{{ 'settings.whatsapp.numberHint' | translate }}</small>
              </div>

              <div class="form-group">
                <label for="greetingMessage">{{ 'settings.whatsapp.greetingMessage' | translate }}</label>
                <textarea
                  id="greetingMessage"
                  formControlName="greetingMessage"
                  class="form-control"
                  rows="3"
                  [placeholder]="'settings.whatsapp.greetingMessagePlaceholder' | translate"
                  maxlength="500"></textarea>
                <small class="form-text">{{ 'settings.whatsapp.greetingMessageHint' | translate }}</small>
              </div>

              <!-- WhatsApp-Benachrichtigungen Toggle -->
              <div class="form-group wa-notifications-toggle">
                <label class="toggle-label">
                  <input type="checkbox" formControlName="whatsappNotificationsEnabled" />
                  <span class="toggle-text">{{ 'settings.whatsapp.notificationsEnabled' | translate }}</span>
                </label>
                <small class="form-text">{{ 'settings.whatsapp.notificationsHint' | translate }}</small>
              </div>
            </div>

            <!-- ─── Business-Typ & Restaurant/Riad ─── -->
            <div class="business-section">
              <h3 class="section-title">
                <span class="section-icon">🏷️</span>
                {{ 'settings.business.title' | translate }}
              </h3>

              <div class="form-group">
                <label for="businessType">{{ 'settings.business.type' | translate }}</label>
                <select id="businessType" formControlName="businessType" class="form-control">
                  <option value="SHOP">{{ 'settings.business.typeShop' | translate }}</option>
                  <option value="RESTAURANT">{{ 'settings.business.typeRestaurant' | translate }}</option>
                  <option value="RIAD">{{ 'settings.business.typeRiad' | translate }}</option>
                </select>
                <small class="form-text">{{ 'settings.business.typeHint' | translate }}</small>
              </div>

              <!-- Restaurant/Riad-spezifische Felder -->
              <ng-container *ngIf="settingsForm.get('businessType')?.value !== 'SHOP'">
                <div class="form-group">
                  <label for="openingHours">{{ 'settings.business.openingHours' | translate }}</label>
                  <textarea
                    id="openingHours"
                    formControlName="openingHours"
                    class="form-control"
                    rows="3"
                    [placeholder]="'settings.business.openingHoursPlaceholder' | translate"
                    maxlength="500"></textarea>
                  <small class="form-text">{{ 'settings.business.openingHoursHint' | translate }}</small>
                </div>

                <div class="form-group">
                  <label for="address">{{ 'settings.business.address' | translate }}</label>
                  <textarea
                    id="address"
                    formControlName="address"
                    class="form-control"
                    rows="2"
                    [placeholder]="'settings.business.addressPlaceholder' | translate"
                    maxlength="300"></textarea>
                </div>

                <div class="form-group">
                  <label for="googleMapsUrl">{{ 'settings.business.googleMapsUrl' | translate }}</label>
                  <input
                    id="googleMapsUrl"
                    type="url"
                    formControlName="googleMapsUrl"
                    class="form-control"
                    placeholder="https://maps.google.com/?q=...">
                  <small class="form-text">{{ 'settings.business.googleMapsHint' | translate }}</small>
                </div>

                <div class="form-group">
                  <label for="reservationWhatsappText">{{ 'settings.business.reservationText' | translate }}</label>
                  <input
                    id="reservationWhatsappText"
                    type="text"
                    formControlName="reservationWhatsappText"
                    class="form-control"
                    [placeholder]="'settings.business.reservationTextPlaceholder' | translate"
                    maxlength="300">
                  <small class="form-text">{{ 'settings.business.reservationTextHint' | translate }}</small>
                </div>

                <!-- Beispieldaten nachträglich laden -->
                <div class="form-group starter-pack-box">
                  <label class="starter-pack-label">{{ 'settings.business.starterPackTitle' | translate }}</label>
                  <small class="form-text">{{ 'settings.business.starterPackHint' | translate }}</small>
                  <button type="button" class="btn btn-secondary btn-starter"
                          [disabled]="applyingStarterPack"
                          (click)="applyStarterPack()">
                    {{ applyingStarterPack
                        ? ('settings.business.starterPackLoading' | translate)
                        : ('settings.business.starterPackButton' | translate) }}
                  </button>
                  <span class="starter-pack-msg" *ngIf="starterPackMessage">{{ starterPackMessage }}</span>
                </div>
              </ng-container>
            </div>

            <!-- ─── Bot-Schutz-Konfiguration ─── -->
            <div class="bot-protection-section">
              <h3 class="section-title">
                <span class="section-icon">🛡️</span>
                {{ 'settings.botProtection.title' | translate }}
              </h3>
              <p class="section-hint">{{ 'settings.botProtection.hint' | translate }}</p>

              <div class="form-group bot-protection-toggle">
                <label class="toggle-label">
                  <input type="checkbox" formControlName="botProtectionEnabled" />
                  <span class="toggle-text">{{ 'settings.botProtection.enabled' | translate }}</span>
                </label>
                <small class="form-text">{{ 'settings.botProtection.enabledHint' | translate }}</small>
              </div>

              <div class="form-group" *ngIf="settingsForm.get('botProtectionEnabled')?.value">
                <label for="botProtectionMode">{{ 'settings.botProtection.mode' | translate }}</label>
                <select id="botProtectionMode" formControlName="botProtectionMode" class="form-control">
                  <option value="OFF">{{ 'settings.botProtection.modeOff' | translate }}</option>
                  <option value="SUSPICIOUS_ONLY">{{ 'settings.botProtection.modeSuspicious' | translate }}</option>
                  <option value="ALWAYS_ON">{{ 'settings.botProtection.modeAlways' | translate }}</option>
                </select>
                <small class="form-text">{{ 'settings.botProtection.modeHint' | translate }}</small>
              </div>
            </div>

            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" formControlName="status" class="form-control">
                <option value="ACTIVE">Aktiv</option>
                <option value="INACTIVE">Inaktiv</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="!settingsForm.valid || saving">
                {{ saving ? 'Speichern...' : 'Einstellungen speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Tax & Currency Settings -->
        <div class="tab-content" *ngIf="activeTab === 'tax'">
          <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
            <div class="settings-section-header">
              <h3>💰 {{ 'settings.tax.title' | translate }}</h3>
              <p class="section-hint">{{ 'settings.tax.hint' | translate }}</p>
            </div>

            <!-- Currency Warning -->
            <div class="alert alert-warning" *ngIf="showCurrencyWarning">
              <span class="alert-icon">⚠️</span>
              <span>{{ 'settings.tax.currencyChangeWarning' | translate }}</span>
            </div>

            <div class="form-grid">
              <!-- Currency -->
              <div class="form-group">
                <label for="currencyCode">{{ 'settings.tax.currency' | translate }} *</label>
                <select id="currencyCode" formControlName="currencyCode" (change)="onCurrencyChange()">
                  <option value="EUR">EUR – Euro</option>
                  <option value="MAD">MAD – {{ 'settings.tax.currencyMAD' | translate }}</option>
                  <option value="USD">USD – US-Dollar</option>
                  <option value="GBP">GBP – {{ 'settings.tax.currencyGBP' | translate }}</option>
                </select>
              </div>

              <!-- Country -->
              <div class="form-group">
                <label for="countryCode">{{ 'settings.tax.country' | translate }} *</label>
                <select id="countryCode" formControlName="countryCode">
                  <option value="DE">{{ 'settings.tax.countryDE' | translate }}</option>
                  <option value="MA">{{ 'settings.tax.countryMA' | translate }}</option>
                  <option value="US">{{ 'settings.tax.countryUS' | translate }}</option>
                  <option value="GB">{{ 'settings.tax.countryGB' | translate }}</option>
                </select>
              </div>

              <!-- Price Mode -->
              <div class="form-group full-width">
                <label>{{ 'settings.tax.priceMode' | translate }} *</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" formControlName="priceMode" value="GROSS">
                    <span>{{ 'settings.tax.grossPrices' | translate }}</span>
                    <small>{{ 'settings.tax.grossPricesHint' | translate }}</small>
                  </label>
                  <label class="radio-label">
                    <input type="radio" formControlName="priceMode" value="NET">
                    <span>{{ 'settings.tax.netPrices' | translate }}</span>
                    <small>{{ 'settings.tax.netPricesHint' | translate }}</small>
                  </label>
                </div>
              </div>

              <!-- VAT Enabled -->
              <div class="form-group full-width">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="vatEnabled">
                  <span>{{ 'settings.tax.vatEnabled' | translate }}</span>
                </label>
                <small class="form-text">{{ 'settings.tax.vatEnabledHint' | translate }}</small>
              </div>

              <!-- Tax Rates (disabled if VAT is off) -->
              <div class="form-group" [class.disabled]="!settingsForm.get('vatEnabled')?.value">
                <label for="defaultTaxRate">{{ 'settings.tax.defaultTaxRate' | translate }} *</label>
                <input
                  id="defaultTaxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  formControlName="defaultTaxRate"
                  [disabled]="!settingsForm.get('vatEnabled')?.value"
                  placeholder="19.00"
                />
                <small class="form-text">{{ 'settings.tax.defaultTaxRateHint' | translate }}</small>
              </div>

              <div class="form-group" [class.disabled]="!settingsForm.get('vatEnabled')?.value">
                <label for="shippingTaxRate">{{ 'settings.tax.shippingTaxRate' | translate }} *</label>
                <input
                  id="shippingTaxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  formControlName="shippingTaxRate"
                  [disabled]="!settingsForm.get('vatEnabled')?.value"
                  placeholder="19.00"
                />
              </div>

              <!-- Shipping Tax Strategy -->
              <div class="form-group full-width" [class.disabled]="!settingsForm.get('vatEnabled')?.value">
                <label for="shippingTaxStrategy">{{ 'settings.tax.shippingTaxStrategy' | translate }} *</label>
                <select
                  id="shippingTaxStrategy"
                  formControlName="shippingTaxStrategy"
                  [disabled]="!settingsForm.get('vatEnabled')?.value">
                  <option value="STORE_DEFINED">{{ 'settings.tax.shippingTaxStoreDefined' | translate }}</option>
                  <option value="STANDARD_RATE">{{ 'settings.tax.shippingTaxStandard' | translate }}</option>
                  <option value="PROPORTIONAL_TO_CART">{{ 'settings.tax.shippingTaxProportional' | translate }}</option>
                </select>
                <small class="form-text">{{ 'settings.tax.shippingTaxStrategyHint' | translate }}</small>
              </div>

              <!-- VAT Exemption Text -->
              <div class="form-group full-width" *ngIf="!settingsForm.get('vatEnabled')?.value">
                <label for="vatExemptionText">{{ 'settings.tax.vatExemptionText' | translate }}</label>
                <textarea
                  id="vatExemptionText"
                  formControlName="vatExemptionText"
                  rows="3"
                  [placeholder]="'settings.tax.vatExemptionTextPlaceholder' | translate"
                ></textarea>
                <small class="form-text">{{ 'settings.tax.vatExemptionTextHint' | translate }}</small>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="!settingsForm.valid || saving">
                {{ saving ? ('common.saving' | translate) : ('common.save' | translate) }}
              </button>
            </div>
          </form>
        </div>

        <!-- Slider Settings -->
        <div class="tab-content" *ngIf="activeTab === 'slider'">
          <app-store-slider-editor></app-store-slider-editor>
        </div>

        <!-- ─── Shipping Address (DHL Versand-Adresse) ─── -->
        <div class="tab-content" *ngIf="activeTab === 'shipping'">
          <form [formGroup]="shippingAddressForm" (ngSubmit)="saveShippingAddress()">
            <div class="settings-section-header">
              <h3>📦 {{ 'settings.shipping.title' | translate }}</h3>
              <p class="section-hint">{{ 'settings.shipping.hint' | translate }}</p>
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label for="shipping-street">{{ 'settings.shipping.street' | translate }} *</label>
                <input
                  id="shipping-street"
                  type="text"
                  formControlName="street"
                  [placeholder]="'settings.shipping.streetPlaceholder' | translate"
                />
                <span class="error" *ngIf="shippingAddressForm.get('street')?.invalid && shippingAddressForm.get('street')?.touched">
                  {{ 'settings.shipping.streetRequired' | translate }}
                </span>
              </div>

              <div class="form-group">
                <label for="shipping-houseNumber">{{ 'settings.shipping.houseNumber' | translate }} *</label>
                <input
                  id="shipping-houseNumber"
                  type="text"
                  formControlName="houseNumber"
                  placeholder="1"
                />
                <span class="error" *ngIf="shippingAddressForm.get('houseNumber')?.invalid && shippingAddressForm.get('houseNumber')?.touched">
                  {{ 'settings.shipping.houseNumberRequired' | translate }}
                </span>
              </div>

              <div class="form-group">
                <label for="shipping-postalCode">{{ 'settings.shipping.postalCode' | translate }} *</label>
                <input
                  id="shipping-postalCode"
                  type="text"
                  formControlName="postalCode"
                  placeholder="90402"
                />
                <span class="error" *ngIf="shippingAddressForm.get('postalCode')?.invalid && shippingAddressForm.get('postalCode')?.touched">
                  {{ 'settings.shipping.postalCodeRequired' | translate }}
                </span>
              </div>

              <div class="form-group">
                <label for="shipping-city">{{ 'settings.shipping.city' | translate }} *</label>
                <input
                  id="shipping-city"
                  type="text"
                  formControlName="city"
                  [placeholder]="'settings.shipping.cityPlaceholder' | translate"
                />
                <span class="error" *ngIf="shippingAddressForm.get('city')?.invalid && shippingAddressForm.get('city')?.touched">
                  {{ 'settings.shipping.cityRequired' | translate }}
                </span>
              </div>

              <div class="form-group">
                <label for="shipping-country">{{ 'settings.shipping.country' | translate }} *</label>
                <select id="shipping-country" formControlName="country">
                  <option value="">{{ 'settings.shipping.selectCountry' | translate }}</option>
                  <option value="DE">🇩🇪 Deutschland</option>
                  <option value="AT">🇦🇹 Österreich</option>
                  <option value="CH">🇨🇭 Schweiz</option>
                  <option value="FR">🇫🇷 Frankreich</option>
                  <option value="NL">🇳🇱 Niederlande</option>
                  <option value="BE">🇧🇪 Belgien</option>
                  <option value="LU">🇱🇺 Luxemburg</option>
                  <option value="IT">🇮🇹 Italien</option>
                  <option value="ES">🇪🇸 Spanien</option>
                  <option value="PL">🇵🇱 Polen</option>
                </select>
                <span class="error" *ngIf="shippingAddressForm.get('country')?.invalid && shippingAddressForm.get('country')?.touched">
                  {{ 'settings.shipping.countryRequired' | translate }}
                </span>
              </div>

              <div class="form-group">
                <label for="shipping-email">{{ 'settings.shipping.email' | translate }}</label>
                <input
                  id="shipping-email"
                  type="email"
                  formControlName="email"
                  [placeholder]="'settings.shipping.emailPlaceholder' | translate"
                />
                <span class="form-hint">{{ 'settings.shipping.emailHint' | translate }}</span>
              </div>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                [disabled]="shippingAddressForm.invalid || savingShippingAddress">
                <span *ngIf="!savingShippingAddress">{{ 'settings.saveButton' | translate }}</span>
                <span *ngIf="savingShippingAddress">{{ 'settings.saving' | translate }}</span>
              </button>
            </div>

            <div class="success-message" *ngIf="shippingAddressSaved">
              ✅ {{ 'settings.shipping.savedSuccess' | translate }}
            </div>

            <div class="error-message" *ngIf="shippingAddressError">
              ❌ {{ shippingAddressError }}
            </div>
          </form>
        </div>

        <!-- ─── Social & Kontakt ─── -->
        <div class="tab-content" *ngIf="activeTab === 'social'">
          <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
            <div class="settings-section-header">
              <h3>📇 Kontaktdaten</h3>
              <p class="section-hint">Werden im Footer deines Stores angezeigt.</p>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="contactEmail">E-Mail-Adresse</label>
                <input id="contactEmail" type="email" formControlName="contactEmail"
                       class="form-control" placeholder="kontakt@deinshop.de" />
                <small class="form-text">Öffentliche Kontakt-E-Mail im Footer</small>
              </div>
              <div class="form-group">
                <label for="contactPhone">Telefon / WhatsApp</label>
                <input id="contactPhone" type="tel" formControlName="contactPhone"
                       class="form-control" placeholder="+49 123 456789" />
                <small class="form-text">Wird als Telefon-Link angezeigt</small>
              </div>
            </div>

            <div class="settings-section-header" style="margin-top:1.5rem">
              <h3>📱 Social Media Links</h3>
              <p class="section-hint">Füge deine Social-Media-Profile hinzu – sie erscheinen als Icons im Footer.</p>
            </div>

            <div class="social-links-grid">
              <div class="form-group social-input-group">
                <label for="telegramUrl">
                  <span class="social-label-icon" style="color:#229ed9">✈</span> Telegram
                </label>
                <input id="telegramUrl" type="url" formControlName="telegramUrl"
                       class="form-control" placeholder="https://t.me/deinkanal" />
              </div>

              <div class="form-group social-input-group">
                <label for="facebookUrl">
                  <span class="social-label-icon" style="color:#1877f2">f</span> Facebook
                </label>
                <input id="facebookUrl" type="url" formControlName="facebookUrl"
                       class="form-control" placeholder="https://facebook.com/deinshop" />
              </div>

              <div class="form-group social-input-group">
                <label for="instagramUrl">
                  <span class="social-label-icon" style="color:#e1306c">◉</span> Instagram
                </label>
                <input id="instagramUrl" type="url" formControlName="instagramUrl"
                       class="form-control" placeholder="https://instagram.com/deinshop" />
              </div>

              <div class="form-group social-input-group">
                <label for="tiktokUrl">
                  <span class="social-label-icon">♪</span> TikTok
                </label>
                <input id="tiktokUrl" type="url" formControlName="tiktokUrl"
                       class="form-control" placeholder="https://tiktok.com/@deinshop" />
              </div>
            </div>

            <div class="settings-section-header" style="margin-top:1.5rem">
              <h3>📝 Footer-Text</h3>
              <p class="section-hint">Kurzer Slogan oder Beschreibung unter dem Logo im Footer.</p>
            </div>

            <div class="form-group">
              <textarea id="footerText" formControlName="footerText" class="form-control"
                        rows="2" placeholder="Dein Shop für alles – schnell, günstig, zuverlässig."></textarea>
              <small class="form-text">Max. 200 Zeichen · {{ settingsForm.get('footerText')?.value?.length || 0 }}/200</small>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                {{ saving ? 'Speichern...' : '💾 Speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Branding Settings: redirect zur Brand-Seite -->
        <div class="tab-content" *ngIf="activeTab === 'branding'">
          <div class="brand-redirect-info">
            <span class="brand-redirect-icon">🎨</span>
            <h3>Branding & Design</h3>
            <p>Verwalte Logo, Farben und KI-Brand-Kit auf der Branding-Seite.</p>
            <button class="btn btn-primary" (click)="navigateToBrand()">
              🚀 Zur Branding-Seite
            </button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- Legal Tab: Rechtliches (Impressum + Rechtstexte) -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div class="tab-content" *ngIf="activeTab === 'legal'">
          <div class="legal-section">
            <h2 class="section-title">📋 {{ 'settings.legal.imprint.title' | translate }}</h2>
            <p class="section-hint">{{ 'settings.legal.imprint.hint' | translate }}</p>

            <div class="form-grid">
              <!-- legalName -->
              <div class="form-group">
                <label for="legal-name">{{ 'settings.legal.imprint.legalName' | translate }} *</label>
                <input id="legal-name" type="text" [(ngModel)]="legalData.legalName" 
                       class="form-control" [placeholder]="'settings.legal.imprint.legalNamePlaceholder' | translate" />
              </div>

              <!-- legalForm -->
              <div class="form-group">
                <label for="legal-form">{{ 'settings.legal.imprint.legalForm' | translate }}</label>
                <input id="legal-form" type="text" [(ngModel)]="legalData.legalForm" 
                       class="form-control" [placeholder]="'settings.legal.imprint.legalFormPlaceholder' | translate" />
              </div>

              <!-- authorizedRepresentative -->
              <div class="form-group full-width">
                <label for="legal-representative">{{ 'settings.legal.imprint.representative' | translate }}</label>
                <input id="legal-representative" type="text" [(ngModel)]="legalData.authorizedRepresentative" 
                       class="form-control" [placeholder]="'settings.legal.imprint.representativePlaceholder' | translate" />
              </div>

              <!-- commercialRegister -->
              <div class="form-group">
                <label for="legal-register">{{ 'settings.legal.imprint.register' | translate }}</label>
                <input id="legal-register" type="text" [(ngModel)]="legalData.commercialRegister" 
                       class="form-control" [placeholder]="'settings.legal.imprint.registerPlaceholder' | translate" />
              </div>

              <!-- registerNumber -->
              <div class="form-group">
                <label for="legal-register-number">{{ 'settings.legal.imprint.registerNumber' | translate }}</label>
                <input id="legal-register-number" type="text" [(ngModel)]="legalData.registerNumber" 
                       class="form-control" [placeholder]="'settings.legal.imprint.registerNumberPlaceholder' | translate" />
              </div>

              <!-- vatId -->
              <div class="form-group">
                <label for="legal-vat">{{ 'settings.legal.imprint.vatId' | translate }}</label>
                <input id="legal-vat" type="text" [(ngModel)]="legalData.vatId" 
                       class="form-control" [placeholder]="'settings.legal.imprint.vatIdPlaceholder' | translate" />
              </div>

              <!-- contactEmail -->
              <div class="form-group">
                <label for="legal-email">{{ 'settings.legal.imprint.email' | translate }} *</label>
                <input id="legal-email" type="email" [(ngModel)]="legalData.contactEmail" 
                       class="form-control" [placeholder]="'settings.legal.imprint.emailPlaceholder' | translate" />
              </div>

              <!-- contactPhone -->
              <div class="form-group">
                <label for="legal-phone">{{ 'settings.legal.imprint.phone' | translate }}</label>
                <input id="legal-phone" type="tel" [(ngModel)]="legalData.contactPhone" 
                       class="form-control" [placeholder]="'settings.legal.imprint.phonePlaceholder' | translate" />
              </div>

              <!-- Shipping Address -->
              <div class="form-group full-width">
                <h3 class="subsection-title">📍 {{ 'settings.legal.imprint.address' | translate }}</h3>
              </div>

              <div class="form-group">
                <label for="legal-street">{{ 'settings.legal.imprint.street' | translate }} *</label>
                <input id="legal-street" type="text" [(ngModel)]="legalData.shippingAddressStreet" 
                       class="form-control" [placeholder]="'settings.legal.imprint.streetPlaceholder' | translate" />
              </div>

              <div class="form-group">
                <label for="legal-house">{{ 'settings.legal.imprint.houseNumber' | translate }} *</label>
                <input id="legal-house" type="text" [(ngModel)]="legalData.shippingAddressHouseNumber" 
                       class="form-control" [placeholder]="'settings.legal.imprint.houseNumberPlaceholder' | translate" />
              </div>

              <div class="form-group">
                <label for="legal-postal">{{ 'settings.legal.imprint.postalCode' | translate }} *</label>
                <input id="legal-postal" type="text" [(ngModel)]="legalData.shippingAddressPostalCode" 
                       class="form-control" [placeholder]="'settings.legal.imprint.postalCodePlaceholder' | translate" />
              </div>

              <div class="form-group">
                <label for="legal-city">{{ 'settings.legal.imprint.city' | translate }} *</label>
                <input id="legal-city" type="text" [(ngModel)]="legalData.shippingAddressCity" 
                       class="form-control" [placeholder]="'settings.legal.imprint.cityPlaceholder' | translate" />
              </div>

              <div class="form-group">
                <label for="legal-country">{{ 'settings.legal.imprint.country' | translate }} *</label>
                <input id="legal-country" type="text" [(ngModel)]="legalData.shippingAddressCountry" 
                       class="form-control" placeholder="DE" maxlength="2" />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-primary" (click)="saveLegalImprint()" [disabled]="savingLegal">
                {{ savingLegal ? ('common.saving' | translate) : ('common.save' | translate) }}
              </button>
            </div>
          </div>

          <!-- ═══════════════════════════════════════════════════════════ -->
          <!-- Rechtstexte: AGB, Datenschutz, Rückgabe, Versand -->
          <!-- ═══════════════════════════════════════════════════════════ -->
          <div class="legal-texts-section">
            <h2 class="section-title">📄 {{ 'settings.legal.texts.title' | translate }}</h2>
            <p class="section-hint">{{ 'settings.legal.texts.hint' | translate }}</p>

            <!-- AGB -->
            <div class="legal-text-card">
              <div class="legal-text-header">
                <h3>{{ 'settings.legal.texts.terms.title' | translate }}</h3>
                <span class="status-badge" [class]="'status-' + legalData.termsAndConditionsStatus?.toLowerCase()">
                  {{ 'settings.legal.status.' + legalData.termsAndConditionsStatus?.toLowerCase() | translate }}
                </span>
              </div>
              <textarea [(ngModel)]="legalData.termsAndConditionsText" rows="8" class="form-control"
                        [placeholder]="'settings.legal.texts.terms.placeholder' | translate"
                        maxlength="50000"></textarea>
              <div class="char-counter">
                {{ legalData.termsAndConditionsText?.length || 0 }} / 50.000 {{ 'common.characters' | translate }}
              </div>
              <div class="legal-text-actions">
                <button class="btn btn-secondary" (click)="saveDraft('terms')" [disabled]="savingLegal">
                  💾 {{ 'settings.legal.actions.saveDraft' | translate }}
                </button>
                <button class="btn btn-info" (click)="previewText('terms')" [disabled]="!legalData.termsAndConditionsText">
                  👁️ {{ 'settings.legal.actions.preview' | translate }}
                </button>
                <button class="btn btn-success" (click)="publishText('terms')" 
                        [disabled]="!legalData.termsAndConditionsText?.trim() || savingLegal"
                        *ngIf="legalData.termsAndConditionsStatus !== 'PUBLISHED'">
                  ✅ {{ 'settings.legal.actions.publish' | translate }}
                </button>
                <button class="btn btn-warning" (click)="unpublishText('terms')" [disabled]="savingLegal"
                        *ngIf="legalData.termsAndConditionsStatus === 'PUBLISHED'">
                  ⏸️ {{ 'settings.legal.actions.unpublish' | translate }}
                </button>
              </div>
            </div>

            <!-- Datenschutz -->
            <div class="legal-text-card">
              <div class="legal-text-header">
                <h3>{{ 'settings.legal.texts.privacy.title' | translate }}</h3>
                <span class="status-badge" [class]="'status-' + legalData.privacyPolicyStatus?.toLowerCase()">
                  {{ 'settings.legal.status.' + legalData.privacyPolicyStatus?.toLowerCase() | translate }}
                </span>
              </div>
              <textarea [(ngModel)]="legalData.privacyPolicyText" rows="8" class="form-control"
                        [placeholder]="'settings.legal.texts.privacy.placeholder' | translate"
                        maxlength="50000"></textarea>
              <div class="char-counter">
                {{ legalData.privacyPolicyText?.length || 0 }} / 50.000 {{ 'common.characters' | translate }}
              </div>
              <div class="legal-text-actions">
                <button class="btn btn-secondary" (click)="saveDraft('privacy')" [disabled]="savingLegal">
                  💾 {{ 'settings.legal.actions.saveDraft' | translate }}
                </button>
                <button class="btn btn-info" (click)="previewText('privacy')" [disabled]="!legalData.privacyPolicyText">
                  👁️ {{ 'settings.legal.actions.preview' | translate }}
                </button>
                <button class="btn btn-success" (click)="publishText('privacy')" 
                        [disabled]="!legalData.privacyPolicyText?.trim() || savingLegal"
                        *ngIf="legalData.privacyPolicyStatus !== 'PUBLISHED'">
                  ✅ {{ 'settings.legal.actions.publish' | translate }}
                </button>
                <button class="btn btn-warning" (click)="unpublishText('privacy')" [disabled]="savingLegal"
                        *ngIf="legalData.privacyPolicyStatus === 'PUBLISHED'">
                  ⏸️ {{ 'settings.legal.actions.unpublish' | translate }}
                </button>
              </div>
            </div>

            <!-- Rückgabe -->
            <div class="legal-text-card">
              <div class="legal-text-header">
                <h3>{{ 'settings.legal.texts.return.title' | translate }}</h3>
                <span class="status-badge" [class]="'status-' + legalData.returnPolicyStatus?.toLowerCase()">
                  {{ 'settings.legal.status.' + legalData.returnPolicyStatus?.toLowerCase() | translate }}
                </span>
              </div>
              <textarea [(ngModel)]="legalData.returnPolicyText" rows="8" class="form-control"
                        [placeholder]="'settings.legal.texts.return.placeholder' | translate"
                        maxlength="50000"></textarea>
              <div class="char-counter">
                {{ legalData.returnPolicyText?.length || 0 }} / 50.000 {{ 'common.characters' | translate }}
              </div>
              <div class="legal-text-actions">
                <button class="btn btn-secondary" (click)="saveDraft('return')" [disabled]="savingLegal">
                  💾 {{ 'settings.legal.actions.saveDraft' | translate }}
                </button>
                <button class="btn btn-info" (click)="previewText('return')" [disabled]="!legalData.returnPolicyText">
                  👁️ {{ 'settings.legal.actions.preview' | translate }}
                </button>
                <button class="btn btn-success" (click)="publishText('return')" 
                        [disabled]="!legalData.returnPolicyText?.trim() || savingLegal"
                        *ngIf="legalData.returnPolicyStatus !== 'PUBLISHED'">
                  ✅ {{ 'settings.legal.actions.publish' | translate }}
                </button>
                <button class="btn btn-warning" (click)="unpublishText('return')" [disabled]="savingLegal"
                        *ngIf="legalData.returnPolicyStatus === 'PUBLISHED'">
                  ⏸️ {{ 'settings.legal.actions.unpublish' | translate }}
                </button>
              </div>
            </div>

            <!-- Versand -->
            <div class="legal-text-card">
              <div class="legal-text-header">
                <h3>{{ 'settings.legal.texts.shipping.title' | translate }}</h3>
                <span class="status-badge" [class]="'status-' + legalData.shippingPolicyStatus?.toLowerCase()">
                  {{ 'settings.legal.status.' + legalData.shippingPolicyStatus?.toLowerCase() | translate }}
                </span>
              </div>
              <textarea [(ngModel)]="legalData.shippingPolicyText" rows="8" class="form-control"
                        [placeholder]="'settings.legal.texts.shipping.placeholder' | translate"
                        maxlength="50000"></textarea>
              <div class="char-counter">
                {{ legalData.shippingPolicyText?.length || 0 }} / 50.000 {{ 'common.characters' | translate }}
              </div>
              <div class="legal-text-actions">
                <button class="btn btn-secondary" (click)="saveDraft('shipping')" [disabled]="savingLegal">
                  💾 {{ 'settings.legal.actions.saveDraft' | translate }}
                </button>
                <button class="btn btn-info" (click)="previewText('shipping')" [disabled]="!legalData.shippingPolicyText">
                  👁️ {{ 'settings.legal.actions.preview' | translate }}
                </button>
                <button class="btn btn-success" (click)="publishText('shipping')" 
                        [disabled]="!legalData.shippingPolicyText?.trim() || savingLegal"
                        *ngIf="legalData.shippingPolicyStatus !== 'PUBLISHED'">
                  ✅ {{ 'settings.legal.actions.publish' | translate }}
                </button>
                <button class="btn btn-warning" (click)="unpublishText('shipping')" [disabled]="savingLegal"
                        *ngIf="legalData.shippingPolicyStatus === 'PUBLISHED'">
                  ⏸️ {{ 'settings.legal.actions.unpublish' | translate }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Domain Settings -->
        <div class="tab-content" *ngIf="activeTab === 'domain'">
          <div class="domain-info">
            <h3>Domain Verwaltung</h3>
            <p>Ihre Store-Domain: <strong>{{ store.slug }}.markt.ma</strong></p>
            <button class="btn btn-secondary" (click)="manageDomains()">
              Domains verwalten
            </button>
          </div>
        </div>

        <!-- Payments Tab -->
        <div class="tab-content" *ngIf="activeTab === 'payments'">
          <app-payment-settings [storeIdOverride]="storeId"></app-payment-settings>
        </div>

        <!-- Advanced Settings -->
        <div class="tab-content" *ngIf="activeTab === 'advanced'">
          <div class="danger-zone">
            <h3>⚠️ Gefahrenzone</h3>
            <p class="warning-text">Diese Aktionen können nicht rückgängig gemacht werden.</p>

            <div class="danger-action">
              <div class="danger-info">
                <h4>Store löschen</h4>
                <p>Löscht den Store permanent inklusive aller Produkte, Bestellungen und Einstellungen.</p>
              </div>
              <button class="btn btn-danger" (click)="showDeleteModal = true">
                🗑️ Store löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal (Shopify-Style) -->
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="showDeleteModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>⚠️ Store wirklich löschen?</h2>
            <button class="modal-close" (click)="showDeleteModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="warning-box">
              <strong>🚨 WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden!</strong>
            </div>

            <p>Folgendes wird <strong>permanent gelöscht</strong>:</p>
            <ul class="deletion-list">
              <li>✓ Alle Produkte und Varianten</li>
              <li>✓ Alle Bestellungen und Kundendaten</li>
              <li>✓ Alle Kategorien und Medien</li>
              <li>✓ Alle Domains und Einstellungen</li>
              <li>✓ Der gesamte Store</li>
            </ul>

            <div class="confirmation-section">
              <label for="confirmInput">
                Geben Sie "<strong>{{ store?.name }}</strong>" ein, um zu bestätigen:
              </label>
              <input
                id="confirmInput"
                type="text"
                [(ngModel)]="deleteConfirmation"
                class="form-control confirmation-input"
                placeholder="Store-Name eingeben"
                [class.error]="deleteConfirmation && deleteConfirmation !== store?.name"
              />
              <small class="helper-text" *ngIf="deleteConfirmation && deleteConfirmation !== store?.name">
                ❌ Der Name stimmt nicht überein
              </small>
              <small class="helper-text success" *ngIf="deleteConfirmation === store?.name">
                ✅ Name korrekt
              </small>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showDeleteModal = false; deleteConfirmation = ''">
              Abbrechen
            </button>
            <button 
              class="btn btn-danger"
              [disabled]="deleteConfirmation !== store?.name || deleting"
              (click)="executeDeleteStore()">
              {{ deleting ? '🗑️ Lösche...' : '🗑️ Endgültig löschen' }}
            </button>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Lade Store-Einstellungen...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .store-settings-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .settings-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 1.5rem 0;
    }

    /* ─── Modern Tab Bar (analog productnavigation-bar) ─── */
    .settings-tabs {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 6px 0;
      margin-bottom: 1.5rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px 12px 0 0;
    }
    .settings-tabs::-webkit-scrollbar { display: none; }

    .settings-tab {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      background: transparent;
      border-radius: 10px;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      min-height: 44px;
      transition: color 0.2s ease, background 0.2s ease, transform 0.15s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .settings-tab:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.07);
    }

    .settings-tab:active {
      transform: scale(0.97);
    }

    .settings-tab.active {
      color: #667eea;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.08);
    }

    .settings-tab.active .tab-icon {
      transform: scale(1.12);
    }

    .settings-tab.active .tab-indicator {
      opacity: 1;
      transform: scaleX(1);
    }

    .tab-icon {
      font-size: 1.125rem;
      line-height: 1;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      flex-shrink: 0;
    }

    .tab-label {
      font-size: 0.8125rem;
      letter-spacing: 0.01em;
    }

    .tab-indicator {
      position: absolute;
      bottom: -6px;
      left: 16px;
      right: 16px;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      opacity: 0;
      transform: scaleX(0);
      transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .beta-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      line-height: 1.2;
      animation: pulse-beta 2.5s ease-in-out infinite;
    }

    @keyframes pulse-beta {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }

    .settings-tab:focus-visible {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    @media (max-width: 767px) {
      .settings-tabs { gap: 1px; }
      .settings-tab { padding: 8px 10px; gap: 6px; }
      .tab-label { font-size: 0.75rem; }
    }

    @media (max-width: 479px) {
      .tab-label { display: none; }
      .settings-tab { padding: 10px; }
      .tab-icon { font-size: 1.25rem; }
    }

    /* ─── Tab Content ─── */
    .tab-content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.03);
      border: 1px solid #f1f5f9;
      animation: fadeInContent 0.25s ease;
    }

    @keyframes fadeInContent {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
    }

    .form-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #64748b;
    }

    .form-actions {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.45);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
    }

    .domain-info {
      text-align: center;
      padding: 2rem;
    }

    .domain-info h3 {
      margin: 0 0 1rem;
      color: #111827;
    }

    .domain-info p {
      margin: 0 0 2rem;
      font-size: 1.1rem;
      color: #475569;
    }

    .danger-zone {
      padding: 2rem;
      border: 2px solid #fca5a5;
      border-radius: 12px;
      background: #fef2f2;
    }

    .danger-zone h3 {
      margin: 0 0 0.5rem;
      color: #b91c1c;
    }

    .warning-text {
      color: #b91c1c;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .danger-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #fecaca;
      margin-top: 1rem;
    }

    .danger-info h4 {
      margin: 0 0 0.5rem 0;
      color: #111827;
    }

    .danger-info p {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .modal-header h2 {
      margin: 0;
      color: #b91c1c;
      font-size: 1.4rem;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .modal-close:hover {
      background: #f1f5f9;
      color: #111827;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .warning-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 0 8px 8px 0;
      color: #b91c1c;
    }

    .deletion-list {
      background: #f8fafc;
      padding: 1rem 1rem 1rem 2rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .deletion-list li {
      padding: 0.5rem 0;
      color: #334155;
    }

    .confirmation-section {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #f8fafc;
      border-radius: 10px;
    }

    .confirmation-section label {
      display: block;
      margin-bottom: 0.75rem;
      color: #111827;
      font-weight: 600;
    }

    .confirmation-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .confirmation-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .confirmation-input.error {
      border-color: #fca5a5;
    }

    .helper-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #ef4444;
    }

    .helper-text.success {
      color: #10b981;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      border-radius: 0 0 16px 16px;
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .spinner {
      border: 3px solid #f1f5f9;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #b91c1c;
    }

    /* RTL Support */
    :host-context([dir="rtl"]) .settings-tabs {
      direction: rtl;
    }
    :host-context([dir="rtl"]) .tab-indicator {
      transform-origin: right center;
    }

    /* ─── Brand Redirect ─── */
    .brand-redirect-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
    }
    .brand-redirect-icon { font-size: 3rem; }
    .brand-redirect-info h3 { margin: 0; font-size: 1.3rem; color: #111827; }
    .brand-redirect-info p { margin: 0; color: #64748b; font-size: 0.95rem; }

    /* ─── Social & Kontakt Tab ─── */
    .settings-section-header {
      margin-bottom: 1.25rem;
    }
    .settings-section-header h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem;
    }
    .section-hint {
      font-size: 0.8125rem;
      color: #6b7280;
      margin: 0;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .form-row-2 { grid-template-columns: 1fr; }
    }
    .social-links-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .social-links-grid { grid-template-columns: 1fr; }
    }
    .social-input-group label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: #374151;
      margin-bottom: 0.375rem;
    }
    .social-label-icon {
      font-weight: 900;
      font-size: 1rem;
      width: 18px;
      text-align: center;
    }

    /* ─── WhatsApp Section ─── */
    .whatsapp-section {      margin-top: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(37, 211, 102, 0.06), rgba(18, 140, 126, 0.04));
      border: 1px solid rgba(37, 211, 102, 0.25);
      border-radius: 12px;
    }

    /* ─── Business / Restaurant Section ─── */
    .business-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(180, 83, 9, 0.06), rgba(120, 53, 15, 0.04));
      border: 1px solid rgba(180, 83, 9, 0.25);
      border-radius: 12px;
    }

    /* ─── Starter-Pack Box ─── */
    .starter-pack-box {
      margin-top: 1rem;
      padding: 1rem;
      background: #fffaf0;
      border: 1px dashed rgba(180, 83, 9, 0.4);
      border-radius: 10px;
    }
    .starter-pack-label { font-weight: 700; color: #78350f; display: block; margin-bottom: 0.25rem; }
    .btn-starter { margin-top: 0.75rem; }
    .starter-pack-msg { display: block; margin-top: 0.5rem; font-size: 0.875rem; color: #78350f; }

    .wa-notifications-toggle {
      margin-top: 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 0.875rem 1rem;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      cursor: pointer;
      font-weight: 600;
      color: #166534;
    }
    .toggle-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #16a34a;
      cursor: pointer;
    }
    .toggle-text { font-size: 0.9rem; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #128c7e;
      margin: 0 0 1.25rem 0;
    }

    .section-icon {
      font-size: 1.2rem;
      line-height: 1;
    }

    /* ══════════════════════════════════════════════════════════ */
    /* LEGAL TAB: Rechtliches */
    /* ══════════════════════════════════════════════════════════ */

    .legal-section {
      background: #fff;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .subsection-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legal-texts-section {
      display: grid;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .legal-text-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.25rem;
      transition: border-color 0.2s ease;
    }

    .legal-text-card:focus-within {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .legal-text-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .legal-text-header h4 {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-badge.status-not_configured,
    .status-badge.status-NOT_CONFIGURED {
      background: #f3f4f6;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .status-badge.status-draft,
    .status-badge.status-DRAFT {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .status-badge.status-published,
    .status-badge.status-PUBLISHED {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    .legal-text-card textarea {
      width: 100%;
      min-height: 150px;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9375rem;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.2s ease;
      background: #fff;
    }

    .legal-text-card textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .char-counter {
      font-size: 0.8125rem;
      color: #6b7280;
      text-align: right;
      margin-top: 0.375rem;
    }

    .char-counter.warning {
      color: #dc2626;
      font-weight: 600;
    }

    .legal-text-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      margin-top: 1rem;
    }

    .legal-text-actions button {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 36px;
    }

    .legal-text-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .legal-text-actions button.btn-draft {
      background: #f59e0b;
      color: #fff;
    }

    .legal-text-actions button.btn-draft:hover:not(:disabled) {
      background: #d97706;
    }

    .legal-text-actions button.btn-preview {
      background: #6366f1;
      color: #fff;
    }

    .legal-text-actions button.btn-preview:hover:not(:disabled) {
      background: #4f46e5;
    }

    .legal-text-actions button.btn-publish {
      background: #10b981;
      color: #fff;
    }

    .legal-text-actions button.btn-publish:hover:not(:disabled) {
      background: #059669;
    }

    .legal-text-actions button.btn-unpublish {
      background: #ef4444;
      color: #fff;
    }

    .legal-text-actions button.btn-unpublish:hover:not(:disabled) {
      background: #dc2626;
    }

    /* ══════════════════════════════════════════════════════════ */
    /* MODALS: Consent + Preview */
    /* ══════════════════════════════════════════════════════════ */

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: #fff;
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.3s ease;
    }

    .modal-content.modal-large {
      max-width: 800px;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.2s ease;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .consent-intro {
      font-size: 0.9375rem;
      color: #374151;
      margin: 0 0 1.5rem 0;
      line-height: 1.6;
    }

    .consent-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .consent-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.75rem;
      border-radius: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .consent-checkbox:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    .consent-checkbox input[type="checkbox"] {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .consent-checkbox span {
      font-size: 0.9375rem;
      color: #111827;
      line-height: 1.5;
      user-select: none;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .preview-content {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
      max-height: 500px;
      overflow-y: auto;
    }

    .preview-content pre {
      margin: 0;
      font-family: inherit;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: #111827;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* ══════════════════════════════════════════════════════════ */
    /* RESPONSIVE */
    /* ══════════════════════════════════════════════════════════ */

    @media (max-width: 768px) {
      .store-settings-container {
        padding: 1rem;
      }

      .legal-text-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .legal-text-actions {
        width: 100%;
      }

      .legal-text-actions button {
        flex: 1;
        justify-content: center;
      }

      .modal-content {
        max-width: 100%;
        margin: 0.5rem;
      }
    }
  `]
})
export class StoreSettingsComponent implements OnInit {
  storeId!: number;
  store: Store | null = null;
  loading = false;
  saving = false;
  deleting = false;
  error: string | null = null;
  activeTab = 'general';

  /** Starter-Pack (Beispieldaten) Status */
  applyingStarterPack = false;
  starterPackMessage: string | null = null;

  showDeleteModal = false;
  deleteConfirmation = '';

  /** Setzt man auf true, werden beta-Tabs angezeigt */
  isBetaUser = false;

  /** Wiederverwendbare Tab-Definition – analog NavTab */
  settingsTabs: SettingsTab[] = [
    { id: 'general',  icon: '⚙️', labelKey: 'settings.general' },
    { id: 'tax',      icon: '💰', labelKey: 'settings.tax.title' },
    { id: 'legal',    icon: '📝', labelKey: 'settings.legal.title' },  // ← NEU
    { id: 'payments', icon: '💳', labelKey: 'settings.payments.sectionTitle' },
    { id: 'social',   icon: '🔗', labelKey: 'settings.social.title' },
    { id: 'slider',   icon: '🎬', labelKey: 'settings.slider' },
    { id: 'shipping', icon: '📦', labelKey: 'settings.shipping.title' },
    { id: 'branding', icon: '🎨', labelKey: 'settings.branding.title', visible : false },
    { id: 'domain',   icon: '🌐', labelKey: 'settings.domain.title' },
    { id: 'telegram', icon: '✈️', labelKey: 'sidebar.items.telegram' },
    { id: 'advanced', icon: '🔧', labelKey: 'settings.advanced.title' }
  ];

  /** Gibt nur sichtbare Tabs zurück (respektiert visible + beta) */
  get visibleTabs(): SettingsTab[] {
    return this.settingsTabs.filter(tab => {
      if (tab.visible === false) return false;
      if (tab.beta && !this.isBetaUser) return false;
      return true;
    });
  }

  /** Tab-Klick: bei 'telegram' direkt zur eigenen Route navigieren */
  onTabClick(tabId: string): void {
    if (tabId === 'telegram') {
      this.router.navigate([`/stores/${this.storeId}/telegram`]);
      return;
    }
    this.activeTab = tabId;
  }

  settingsForm: FormGroup;
  brandingForm: FormGroup;
  shippingAddressForm: FormGroup;
  savingShippingAddress = false;
  shippingAddressSaved = false;
  shippingAddressError: string | null = null;
  
  // Currency warning
  showCurrencyWarning = false;
  private originalCurrency?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private fb: FormBuilder
  ) {
    this.settingsForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      status: ['ACTIVE'],
      whatsappNumber: ['', [Validators.maxLength(20)]],
      greetingMessage: ['', [Validators.maxLength(500)]],
      whatsappNotificationsEnabled: [false],
      // ─── Social & Kontakt ──────────────────────────────────────
      contactEmail: ['', [Validators.email]],
      contactPhone: [''],
      telegramUrl: [''],
      facebookUrl: [''],
      instagramUrl: [''],
      tiktokUrl: [''],
      footerText: ['', [Validators.maxLength(200)]],
      // ─── Business-Typ & Restaurant/Riad-Felder ──────────────────
      businessType: ['SHOP'],
      openingHours: ['', [Validators.maxLength(500)]],
      address: ['', [Validators.maxLength(300)]],
      googleMapsUrl: [''],
      reservationWhatsappText: ['', [Validators.maxLength(300)]],
      // ─── Bot-Schutz ──────────────────────────────────────────────
      botProtectionEnabled: [true],
      botProtectionMode: ['SUSPICIOUS_ONLY'],
      // ─── Currency & Tax Configuration ───────────────────────────
      currencyCode: ['EUR', Validators.required],
      countryCode: ['DE', Validators.required],
      priceMode: ['GROSS', Validators.required],
      vatEnabled: [true],
      defaultTaxRate: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
      shippingTaxRate: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
      shippingTaxStrategy: ['STORE_DEFINED', Validators.required],
      vatExemptionText: ['', [Validators.maxLength(500)]]
    });

    this.brandingForm = this.fb.group({
      logoUrl: [''],
      bannerUrl: ['']
    });

    this.shippingAddressForm = this.fb.group({
      street: ['', Validators.required],
      houseNumber: ['', Validators.required],
      postalCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      email: ['', Validators.email]
    });
  }

  ngOnInit(): void {
    // Beta-Flag aus localStorage (oder UserService)
    this.isBetaUser = localStorage.getItem('betaAccess') === 'true';

    // Mehrstufige StoreId Extraktion
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      if (storeIdParam) {
        this.storeId = Number(storeIdParam);
      }
    });

    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const storeIdParam = params['id'] || params['storeId'];
        if (storeIdParam && !this.storeId) {
          this.storeId = Number(storeIdParam);
        }
      });
    }

    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
      }
    }

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', this.storeId);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID geladen:', this.storeId);
    this.loadStore();
  }

  loadStore(): void {
    this.loading = true;
    this.error = null;

    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        this.store = store;
        this.settingsForm.patchValue({
          name: store.name,
          slug: store.slug,
          description: store.description,
          status: store.status,
          whatsappNumber: store.whatsappNumber ?? '',
          greetingMessage: store.greetingMessage ?? '',
          whatsappNotificationsEnabled: store.whatsappNotificationsEnabled ?? false,
          contactEmail:  store.contactEmail  ?? '',
          contactPhone:  store.contactPhone  ?? '',
          telegramUrl:   store.telegramUrl   ?? '',
          facebookUrl:   store.facebookUrl   ?? '',
          instagramUrl:  store.instagramUrl  ?? '',
          tiktokUrl:     store.tiktokUrl     ?? '',
          footerText:    store.footerText    ?? '',
          businessType:            store.businessType            ?? 'SHOP',
          openingHours:            store.openingHours            ?? '',
          address:                 store.address                 ?? '',
          googleMapsUrl:           store.googleMapsUrl           ?? '',
          reservationWhatsappText: store.reservationWhatsappText ?? '',
          botProtectionEnabled:    store.botProtectionEnabled    ?? true,
          botProtectionMode:       store.botProtectionMode       ?? 'SUSPICIOUS_ONLY',
          // Currency & Tax
          currencyCode:        store.currencyCode        ?? 'EUR',
          countryCode:         store.countryCode         ?? 'DE',
          priceMode:           store.priceMode           ?? 'GROSS',
          vatEnabled:          store.vatEnabled          ?? true,
          defaultTaxRate:      store.defaultTaxRate      ?? 19,
          shippingTaxRate:     store.shippingTaxRate     ?? 19,
          shippingTaxStrategy: store.shippingTaxStrategy ?? 'STORE_DEFINED',
          vatExemptionText:    store.vatExemptionText    ?? ''
        });
        
        // Track original currency for change warning
        this.originalCurrency = store.currencyCode ?? 'EUR';
        this.showCurrencyWarning = false;
        
        // Shipping Address Form patchen
        this.shippingAddressForm.patchValue({
          street: (store as any).shippingAddressStreet ?? '',
          houseNumber: (store as any).shippingAddressHouseNumber ?? '',
          postalCode: (store as any).shippingAddressPostalCode ?? '',
          city: (store as any).shippingAddressCity ?? '',
          country: (store as any).shippingAddressCountry ?? '',
          email: (store as any).shippingAddressEmail ?? ''
        });
        
        this.loading = false;
        
        // Legal-Daten nach erfolgreichem Laden initialisieren
        this.loadLegalData();
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Store-Einstellungen';
        this.loading = false;
        console.error('Error loading store:', error);
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.saving = true;
      this.error = null;

      this.storeService.updateStore(this.storeId, this.settingsForm.value).subscribe({
        next: () => {
          this.saving = false;
          alert('Einstellungen erfolgreich gespeichert!');
          this.loadStore();
        },
        error: (error) => {
          this.error = 'Fehler beim Speichern der Einstellungen';
          this.saving = false;
          console.error('Error saving settings:', error);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // LEGAL TAB: Rechtliches (Impressum + Rechtstexte)
    // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // LEGAL TAB: Rechtliches (Impressum + Rechtstexte)
  // ═══════════════════════════════════════════════════════════════

  /** Lädt Legal-Daten aus Store-Objekt */
  loadLegalData(): void {
    if (!this.store) return;
    this.legalData = {
      legalName: (this.store as any).legalName || '',
      legalForm: (this.store as any).legalForm || '',
        authorizedRepresentative: (this.store as any).authorizedRepresentative || '',
        commercialRegister: (this.store as any).commercialRegister || '',
        registerNumber: (this.store as any).registerNumber || '',
        vatId: (this.store as any).vatId || '',
        contactEmail: (this.store as any).contactEmail || '',
        contactPhone: (this.store as any).contactPhone || '',
        shippingAddressStreet: (this.store as any).shippingAddressStreet || '',
        shippingAddressHouseNumber: (this.store as any).shippingAddressHouseNumber || '',
        shippingAddressPostalCode: (this.store as any).shippingAddressPostalCode || '',
        shippingAddressCity: (this.store as any).shippingAddressCity || '',
        shippingAddressCountry: (this.store as any).shippingAddressCountry || 'DE',
        termsAndConditionsText: (this.store as any).termsAndConditionsText || '',
        termsAndConditionsStatus: (this.store as any).termsAndConditionsStatus || 'NOT_CONFIGURED',
        privacyPolicyText: (this.store as any).privacyPolicyText || '',
        privacyPolicyStatus: (this.store as any).privacyPolicyStatus || 'NOT_CONFIGURED',
        returnPolicyText: (this.store as any).returnPolicyText || '',
        returnPolicyStatus: (this.store as any).returnPolicyStatus || 'NOT_CONFIGURED',
        shippingPolicyText: (this.store as any).shippingPolicyText || '',
        shippingPolicyStatus: (this.store as any).shippingPolicyStatus || 'NOT_CONFIGURED'
      };
    }

    /** Speichert Impressums-Felder */
    saveLegalImprint(): void {
      this.savingLegal = true;
      const payload = {
        legalName: this.legalData.legalName,
        legalForm: this.legalData.legalForm,
        authorizedRepresentative: this.legalData.authorizedRepresentative,
        commercialRegister: this.legalData.commercialRegister,
        registerNumber: this.legalData.registerNumber,
        vatId: this.legalData.vatId,
        contactEmail: this.legalData.contactEmail,
        contactPhone: this.legalData.contactPhone,
        shippingAddressStreet: this.legalData.shippingAddressStreet,
        shippingAddressHouseNumber: this.legalData.shippingAddressHouseNumber,
        shippingAddressPostalCode: this.legalData.shippingAddressPostalCode,
        shippingAddressCity: this.legalData.shippingAddressCity,
        shippingAddressCountry: this.legalData.shippingAddressCountry
      };

      this.storeService.updateStore(this.storeId, payload).subscribe({
        next: () => {
          this.savingLegal = false;
          // TODO: Replace with toast notification
          console.log('✅ Impressum data saved');
          this.loadStore();
        },
        error: (err) => {
          this.savingLegal = false;
          console.error('❌ Error saving imprint:', err);
        }
      });
    }

    /** Als Entwurf speichern */
    saveDraft(field: 'terms' | 'privacy' | 'return' | 'shipping'): void {
      this.savingLegal = true;
      const payload: any = {};
    
      if (field === 'terms') {
        payload.termsAndConditionsText = this.legalData.termsAndConditionsText;
        payload.termsAndConditionsStatus = 'DRAFT';
      } else if (field === 'privacy') {
        payload.privacyPolicyText = this.legalData.privacyPolicyText;
        payload.privacyPolicyStatus = 'DRAFT';
      } else if (field === 'return') {
        payload.returnPolicyText = this.legalData.returnPolicyText;
        payload.returnPolicyStatus = 'DRAFT';
      } else if (field === 'shipping') {
        payload.shippingPolicyText = this.legalData.shippingPolicyText;
        payload.shippingPolicyStatus = 'DRAFT';
      }

      this.storeService.updateStore(this.storeId, payload).subscribe({
        next: () => {
          this.savingLegal = false;
          console.log('✅ Draft saved');
          this.loadStore();
        },
        error: (err) => {
          this.savingLegal = false;
          console.error('❌ Error saving draft:', err);
        }
      });
    }

    /** Vorschau anzeigen */
    previewText(field: 'terms' | 'privacy' | 'return' | 'shipping'): void {
      const titles: Record<string, string> = {
        terms: 'Preview: Terms and Conditions',
        privacy: 'Preview: Privacy Policy',
        return: 'Preview: Return Policy',
        shipping: 'Preview: Shipping Policy'
      };
    
    this.previewTitle = titles[field];
    
    if (field === 'terms') {
      this.previewContent = this.legalData.termsAndConditionsText || '';
    } else if (field === 'privacy') {
      this.previewContent = this.legalData.privacyPolicyText || '';
    } else if (field === 'return') {
      this.previewContent = this.legalData.returnPolicyText || '';
    } else if (field === 'shipping') {
      this.previewContent = this.legalData.shippingPolicyText || '';
    }
    this.showPreviewModal = true;
  }

  /** Veröffentlichen (mit Consent) */
  publishText(field: 'terms' | 'privacy' | 'return' | 'shipping'): void {
    this.pendingPublishField = field;
    this.consent = { operator: false, truthful: false, responsible: false };
    this.showConsentModal = true;
  }

  /** Consent bestätigen und veröffentlichen */
  confirmAndPublish(): void {
    if (!this.consentValid || !this.pendingPublishField) return;

    this.savingLegal = true;
    const field = this.pendingPublishField;
    const payload: any = {
      legalResponsibilityAccepted: true,
      legalResponsibilityVersion: '1.0'
    };

    if (field === 'terms') {
      payload.termsAndConditionsText = this.legalData.termsAndConditionsText;
      payload.termsAndConditionsStatus = 'PUBLISHED';
    } else if (field === 'privacy') {
      payload.privacyPolicyText = this.legalData.privacyPolicyText;
      payload.privacyPolicyStatus = 'PUBLISHED';
    } else if (field === 'return') {
      payload.returnPolicyText = this.legalData.returnPolicyText;
      payload.returnPolicyStatus = 'PUBLISHED';
    } else if (field === 'shipping') {
      payload.shippingPolicyText = this.legalData.shippingPolicyText;
      payload.shippingPolicyStatus = 'PUBLISHED';
    }

    this.storeService.updateStore(this.storeId, payload).subscribe({
      next: () => {
        this.savingLegal = false;
        this.showConsentModal = false;
        this.pendingPublishField = null;
        console.log('✅ Published');
        this.loadStore();
      },
      error: (err) => {
        this.savingLegal = false;
        console.error('❌ Error publishing:', err);
      }
    });
  }

  /** Veröffentlichung zurückziehen */
  unpublishText(field: 'terms' | 'privacy' | 'return' | 'shipping'): void {
    // Confirm dialog would be translated via i18n service in production
    if (!confirm('Unpublish? Text will be saved as draft.')) return;

    this.savingLegal = true;
    const payload: any = {};

    if (field === 'terms') {
      payload.termsAndConditionsStatus = 'DRAFT';
    } else if (field === 'privacy') {
      payload.privacyPolicyStatus = 'DRAFT';
    } else if (field === 'return') {
      payload.returnPolicyStatus = 'DRAFT';
    } else if (field === 'shipping') {
      payload.shippingPolicyStatus = 'DRAFT';
    }

    this.storeService.updateStore(this.storeId, payload).subscribe({
      next: () => {
        this.savingLegal = false;
        console.log('✅ Unpublished - now draft');
        this.loadStore();
      },
      error: (err) => {
        this.savingLegal = false;
        console.error('❌ Error unpublishing:', err);
      }
    });
  }

  closeConsentModal(): void {
    this.showConsentModal = false;
    this.pendingPublishField = null;
    this.consent = { operator: false, truthful: false, responsible: false };
  }

  /**
   * Currency change warning
   */
  onCurrencyChange(): void {
    const currentCurrency = this.settingsForm.get('currencyCode')?.value;
    this.showCurrencyWarning = currentCurrency !== this.originalCurrency;
  }

  /**
   * Lädt Starter-Pack-Beispieldaten in den bestehenden Store
   * (nur RESTAURANT/RIAD, nur wenn noch keine Produkte vorhanden).
   * Wichtig: Vorher Business-Typ speichern, damit das Backend den richtigen Pack wählt.
   */
  applyStarterPack(): void {
    this.applyingStarterPack = true;
    this.starterPackMessage = null;

    // Erst aktuellen Business-Typ speichern, dann Pack anwenden
    this.storeService.updateStore(this.storeId, this.settingsForm.value).subscribe({
      next: () => {
        this.storeService.applyStarterPack(this.storeId).subscribe({
          next: () => {
            this.applyingStarterPack = false;
            this.starterPackMessage = '✅ Beispieldaten geladen. Öffne deinen Shop, um sie zu sehen.';
          },
          error: (err) => {
            this.applyingStarterPack = false;
            this.starterPackMessage = '❌ Fehler beim Laden der Beispieldaten.';
            console.error('applyStarterPack error:', err);
          }
        });
      },
      error: (err) => {
        this.applyingStarterPack = false;
        this.starterPackMessage = '❌ Bitte zuerst Einstellungen speichern.';
        console.error('save before starter pack error:', err);
      }
    });
  }

  saveBranding(): void {
    if (this.brandingForm.valid) {
      this.saving = true;
      this.error = null;

      // TODO: Implement branding update API call
      setTimeout(() => {
        this.saving = false;
        alert('Branding erfolgreich gespeichert!');
      }, 1000);
    }
  }

  saveShippingAddress(): void {
    if (this.shippingAddressForm.invalid) {
      Object.keys(this.shippingAddressForm.controls).forEach(key => {
        this.shippingAddressForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.savingShippingAddress = true;
    this.shippingAddressSaved = false;
    this.shippingAddressError = null;

    const payload = this.shippingAddressForm.value;

    this.storeService.updateShippingAddress(this.storeId, payload).subscribe({
      next: () => {
        this.savingShippingAddress = false;
        this.shippingAddressSaved = true;
        
        // Success-Message nach 3 Sekunden ausblenden
        setTimeout(() => {
          this.shippingAddressSaved = false;
        }, 3000);
        
        // Store neu laden (damit neue Felder im Store-Objekt sind)
        this.loadStore();
      },
      error: (error) => {
        this.savingShippingAddress = false;
        this.shippingAddressError = error.error?.message || 'Fehler beim Speichern der Versandadresse';
        console.error('❌ Shipping address update failed:', error);
      }
    });
  }

  manageDomains(): void {
    this.router.navigate(['/stores', this.storeId, 'domains']);
  }

  navigateToBrand(): void {
    this.router.navigate(['/stores', this.storeId, 'brand']);
  }

  executeDeleteStore(): void {
    if (this.deleteConfirmation !== this.store?.name) {
      return;
    }

    this.deleting = true;
    this.error = null;

    this.storeService.deleteStore(this.storeId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        alert('✅ Store erfolgreich gelöscht!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.deleting = false;
        this.error = error.error?.message || 'Fehler beim Löschen des Stores';
        console.error('❌ Error deleting store:', error);
        alert('❌ Fehler: ' + this.error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }
}
