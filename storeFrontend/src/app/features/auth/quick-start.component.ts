import { Component, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhoneQuickAuthService } from '@app/core/services/phone-quick-auth.service';
import { StoreService } from '@app/core/services/store.service';

type FlowStep = 'phone' | 'code' | 'store' | 'done';
type Channel = 'whatsapp' | 'telegram';

interface Country {
  code: string;
  flag: string;
  name: string;
  dialCode: string;
  placeholder: string;
}

const COUNTRIES: Country[] = [
  { code: 'MA', flag: '🇲🇦', name: 'Marokko',       dialCode: '+212', placeholder: '6 12 345 678' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland',    dialCode: '+49',  placeholder: '151 234 56789' },
  { code: 'AT', flag: '🇦🇹', name: 'Österreich',     dialCode: '+43',  placeholder: '664 123456' },
  { code: 'CH', flag: '🇨🇭', name: 'Schweiz',        dialCode: '+41',  placeholder: '78 123 4567' },
  { code: 'FR', flag: '🇫🇷', name: 'Frankreich',     dialCode: '+33',  placeholder: '6 12 34 56 78' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgien',        dialCode: '+32',  placeholder: '470 12 34 56' },
  { code: 'NL', flag: '🇳🇱', name: 'Niederlande',    dialCode: '+31',  placeholder: '6 12345678' },
  { code: 'ES', flag: '🇪🇸', name: 'Spanien',        dialCode: '+34',  placeholder: '612 345 678' },
  { code: 'IT', flag: '🇮🇹', name: 'Italien',        dialCode: '+39',  placeholder: '312 345 6789' },
  { code: 'GB', flag: '🇬🇧', name: 'Großbritannien', dialCode: '+44',  placeholder: '7911 123456' },
  { code: 'TR', flag: '🇹🇷', name: 'Türkei',         dialCode: '+90',  placeholder: '532 123 4567' },
  { code: 'DZ', flag: '🇩🇿', name: 'Algerien',       dialCode: '+213', placeholder: '551 23 45 67' },
  { code: 'TN', flag: '🇹🇳', name: 'Tunesien',       dialCode: '+216', placeholder: '20 123 456' },
  { code: 'EG', flag: '🇪🇬', name: 'Ägypten',        dialCode: '+20',  placeholder: '100 123 4567' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi-Arabien',  dialCode: '+966', placeholder: '50 123 4567' },
  { code: 'AE', flag: '🇦🇪', name: 'VAE',            dialCode: '+971', placeholder: '50 123 4567' },
  { code: 'US', flag: '🇺🇸', name: 'USA',            dialCode: '+1',   placeholder: '202 555 0123' },
];

@Component({
  selector: 'app-quick-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="qs-wrapper">

      <!-- Top-Bar -->
      <header class="qs-header">
        <a routerLink="/" class="qs-logo">🛍️ markt.ma</a>
        <span class="qs-step-label">
          Schritt {{ stepIndex() }} von 3
        </span>
      </header>

      <!-- Progress Bar -->
      <div class="qs-progress">
        <div class="qs-progress-fill" [style.width.%]="progressPercent()"></div>
      </div>

      <!-- ── STEP 1: Telefonnummer ── -->
      @if (step() === 'phone') {
        <div class="qs-card animate-in">
          <div class="qs-icon-big">📱</div>
          <h1 class="qs-title">Starte deinen Store in 2 Minuten</h1>
          <p class="qs-subtitle">Keine E-Mail nötig – nur deine WhatsApp oder Telegram-Nummer.</p>

          <!-- Channel-Auswahl -->
          <div class="channel-selector">
            <button
              class="channel-btn"
              [class.active]="channel() === 'whatsapp'"
              (click)="setChannel('whatsapp')">
              <span class="channel-icon">💬</span>
              <span>WhatsApp</span>
            </button>
            <button
              class="channel-btn"
              [class.active]="channel() === 'telegram'"
              (click)="setChannel('telegram')">
              <span class="channel-icon">✈️</span>
              <span>Telegram</span>
            </button>
          </div>

          <!-- Telefonnummer-Eingabe -->
          <form [formGroup]="phoneForm" (ngSubmit)="sendCode()" class="qs-form">
            <div class="input-group" [class.has-error]="phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched">
              <!-- Ländercode-Selector -->
              <div class="country-selector-wrap">
                <button type="button" class="country-selector-btn" (click)="toggleCountryDropdown($event)">
                  {{ selectedCountry().flag }} {{ selectedCountry().dialCode }} <span class="caret">▾</span>
                </button>
                @if (showCountryDropdown()) {
                  <div class="country-dropdown">
                    @for (c of countries; track c.code) {
                      <button type="button" class="country-option" (click)="selectCountry(c)">
                        <span class="co-flag">{{ c.flag }}</span>
                        <span class="co-name">{{ c.name }}</span>
                        <span class="co-dial">{{ c.dialCode }}</span>
                      </button>
                    }
                  </div>
                }
              </div>
              <input
                type="tel"
                formControlName="phone"
                [placeholder]="selectedCountry().placeholder"
                class="qs-input phone-input"
                inputmode="numeric"
                maxlength="16"
                [class.has-error]="phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched"
              />
            </div>
            <p class="qs-hint">Lokale Nummer ohne Vorwahl eingeben – Ländervorwahl wird automatisch ergänzt</p>
            @if (fullPhone) {
              <p class="phone-preview">📲 Wird gesendet als: <strong>{{ fullPhone }}</strong></p>
            }
            @if (phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched) {
              <div class="qs-error">⚠️ Ungültige Nummer – nur Ziffern, ohne Ländervorwahl</div>
            }

            @if (errorMsg()) {
              <div class="qs-error">⚠️ {{ errorMsg() }}</div>
            }

            <button
              type="submit"
              class="qs-btn-primary"
              [disabled]="loading() || phoneForm.invalid">
              @if (loading()) {
                <span class="spinner"></span> Wird gesendet...
              } @else {
                Code per {{ channel() === 'whatsapp' ? 'WhatsApp' : 'Telegram' }} senden →
              }
            </button>
          </form>

          <div class="qs-divider">
            <span>oder</span>
          </div>
          <div class="qs-alt-links">
            <a routerLink="/register">Mit E-Mail registrieren</a>
            <span>·</span>
            <a routerLink="/login">Einloggen</a>
          </div>

          <div class="qs-privacy-note">
            🔒 Wir senden dir nur den Verifizierungscode. Kein Spam.
          </div>
        </div>
      }

      <!-- ── STEP 2: Code eingeben ── -->
      @if (step() === 'code' && codeForm) {
        <div class="qs-card animate-in">
          <div class="qs-icon-big">🔐</div>
          <h1 class="qs-title">Code eingeben</h1>
          <p class="qs-subtitle">
            Wir haben einen 6-stelligen Code per
            <strong>{{ channel() === 'whatsapp' ? 'WhatsApp' : 'Telegram' }}</strong>
            an <strong>{{ rawPhone }}</strong> gesendet.
          </p>

          <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="qs-form">
            <input
              type="text"
              formControlName="code"
              placeholder="_ _ _ _ _ _"
              class="qs-input code-input"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              (input)="onCodeInput($event)"
            />

            @if (devCode) {
              <div class="dev-code-box">
                🧪 <strong>DEV-Modus:</strong> Dein Code ist <strong class="dev-code-value">{{ devCode }}</strong>
                <button type="button" class="dev-copy-btn" (click)="codeForm.get('code')?.setValue(devCode)">Einfügen ↓</button>
              </div>
            }

            @if (telegramLink) {
              <div class="telegram-link-box">
                <p>📲 <strong>Schritt 1:</strong> Öffne den Bot und tippe auf Start:</p>
                <a [href]="telegramLink" target="_blank" class="telegram-open-btn">
                  ✈️ &#64;{{ botUsername }} öffnen →
                </a>
                <p class="telegram-hint">Der Bot sendet dir deinen Code. Dann hier eingeben ↓</p>
              </div>
            }

            @if (errorMsg()) {
              <div class="qs-error">⚠️ {{ errorMsg() }}</div>
            }

            <button
              type="submit"
              class="qs-btn-primary"
              [disabled]="loading() || codeForm.invalid">
              @if (loading()) {
                <span class="spinner"></span> Überprüfe Code...
              } @else {
                Code bestätigen ✓
              }
            </button>
          </form>

          <!-- Neuen Code anfordern -->
          <div class="qs-resend">
            @if (countdown() > 0) {
              <span class="countdown-text">Neuen Code in {{ countdown() }}s anfordern</span>
            } @else {
              <button class="qs-link-btn" (click)="backToPhone()">
                Neuen Code anfordern
              </button>
            }
          </div>

          <button class="qs-back-btn" (click)="backToPhone()">
            ← Nummer ändern
          </button>
        </div>
      }

      <!-- ── STEP 3: Store erstellen ── -->
      @if (step() === 'store') {
        <div class="qs-card animate-in">
          <div class="qs-icon-big">🛍️</div>
          <h1 class="qs-title">Dein Store-Name</h1>
          <p class="qs-subtitle">Fast fertig! Wie soll dein Store heißen?</p>

          <form [formGroup]="storeForm" (ngSubmit)="createStore()" class="qs-form">
            <div class="form-field">
              <label class="qs-label">Store-Name *</label>
              <input
                type="text"
                formControlName="storeName"
                placeholder="z.B. Mein Marokko Shop"
                class="qs-input"
                [class.has-error]="storeForm.get('storeName')?.invalid && storeForm.get('storeName')?.touched"
              />
              @if (storeForm.get('storeName')?.invalid && storeForm.get('storeName')?.touched) {
                <span class="field-error">Bitte gib einen Store-Namen ein (min. 3 Zeichen)</span>
              }
            </div>

            <div class="form-field">
              <label class="qs-label">Store-URL (optional)</label>
              <div class="url-field">
                <span class="url-prefix">markt.ma/</span>
                <input
                  type="text"
                  formControlName="storeSlug"
                  placeholder="mein-shop"
                  class="qs-input url-input"
                />
              </div>
              <p class="qs-hint">Wird automatisch generiert, falls leer gelassen.</p>
            </div>

            <!-- Kategorie-Schnellauswahl -->
            <div class="form-field">
              <label class="qs-label">Kategorie (optional)</label>
              <div class="category-grid">
                @for (cat of categories; track cat.id) {
                  <button
                    type="button"
                    class="cat-btn"
                    [class.active]="selectedCategory() === cat.id"
                    (click)="selectCategory(cat.id)">
                    {{ cat.icon }} {{ cat.name }}
                  </button>
                }
              </div>
            </div>

            @if (errorMsg()) {
              <div class="qs-error">⚠️ {{ errorMsg() }}</div>
            }

            <button
              type="submit"
              class="qs-btn-primary"
              [disabled]="loading() || storeForm.get('storeName')?.invalid">
              @if (loading()) {
                <span class="spinner"></span> Store wird erstellt...
              } @else {
                🚀 Store jetzt erstellen!
              }
            </button>
          </form>
        </div>
      }

      <!-- ── DONE ── -->
      @if (step() === 'done') {
        <div class="qs-card qs-done animate-in">
          <div class="done-check">✅</div>
          <h1 class="qs-title">Dein Store ist bereit!</h1>
          <p class="qs-subtitle">Du kannst jetzt Produkte hinzufügen und dein Design anpassen.</p>
          <button class="qs-btn-primary" (click)="goToDashboard()">
            Zum Dashboard →
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    .qs-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 1rem 3rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* Header */
    .qs-header {
      width: 100%;
      max-width: 480px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0 0.5rem;
    }

    .qs-logo {
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      text-decoration: none;
    }

    .qs-step-label {
      color: rgba(255,255,255,0.8);
      font-size: 0.85rem;
    }

    /* Progress */
    .qs-progress {
      width: 100%;
      max-width: 480px;
      height: 4px;
      background: rgba(255,255,255,0.25);
      border-radius: 2px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }

    .qs-progress-fill {
      height: 100%;
      background: white;
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    /* Card */
    .qs-card {
      width: 100%;
      max-width: 480px;
      background: white;
      border-radius: 20px;
      padding: 2rem 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .animate-in {
      animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .qs-icon-big {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .qs-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1a1a2e;
      text-align: center;
      margin: 0 0 0.5rem;
    }

    .qs-subtitle {
      color: #6b7280;
      text-align: center;
      font-size: 0.95rem;
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    /* Channel Selector */
    .channel-selector {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .channel-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.65rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      color: #374151;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .channel-btn.active {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.06);
      color: #667eea;
    }

    .channel-icon {
      font-size: 1.1rem;
    }

    /* Form */
    .qs-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .input-group {
      display: flex;
      align-items: center;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      overflow: visible;
      transition: border-color 0.2s;
      position: relative;

      &:focus-within {
        border-color: #667eea;
      }

      /* Kein overflow:hidden hier – sonst wird das Country-Dropdown abgeschnitten */
      > *:first-child {
        border-radius: 8px 0 0 8px;
      }
    }

    .country-selector-wrap {
      position: relative;
      flex-shrink: 0;
      overflow: visible;
      z-index: 50;
    }

    .country-selector-btn {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.75rem 0.7rem;
      background: #f9fafb;
      border: none;
      border-right: 1px solid #e5e7eb;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      white-space: nowrap;
      height: 100%;
      border-radius: 8px 0 0 8px;
      overflow: hidden;

      &:hover { background: #f3f4f6; }

      .caret { font-size: 0.65rem; color: #9ca3af; }
    }

    .country-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 9999;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      max-height: 260px;
      overflow-y: auto;
      min-width: 220px;
    }

    .country-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.55rem 0.9rem;
      border: none;
      background: white;
      text-align: left;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;

      &:hover { background: #f9fafb; }

      .co-flag { font-size: 1.1rem; }
      .co-name { flex: 1; }
      .co-dial { font-weight: 700; color: #667eea; font-size: 0.8rem; }
    }

    @media (max-width: 480px) {
      .qs-card { padding: 1.5rem 1.25rem; border-radius: 16px; }
      .qs-title { font-size: 1.3rem; }
      .code-input { font-size: 1.75rem; letter-spacing: 0.3em; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .qs-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;

      &:focus { border-color: #667eea; }
      &.has-error { border-color: #ef4444; }
    }

    .phone-input {
      border: none;
      flex: 1;
      border-radius: 0;
      padding: 0.75rem;
      font-size: 1.1rem;

      &:focus { box-shadow: none; }
    }

    .code-input {
      text-align: center;
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: 0.4em;
      color: #1a1a2e;
    }

    .qs-hint {
      font-size: 0.8rem;
      color: #9ca3af;
      margin: 0;
    }

    .phone-preview {
      font-size: 0.82rem;
      color: #4b5563;
      margin: 0;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 0.35rem 0.7rem;

      strong { color: #16a34a; }
    }

    .qs-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .qs-btn-primary {
      width: 100%;
      padding: 0.9rem 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
      margin-top: 0.5rem;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Divider */
    .qs-divider {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1.25rem 0 0.75rem;
      color: #d1d5db;
      font-size: 0.875rem;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e5e7eb;
      }
    }

    .qs-alt-links {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: #9ca3af;

      a {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
        &:hover { text-decoration: underline; }
      }
    }

    .qs-privacy-note {
      text-align: center;
      font-size: 0.78rem;
      color: #d1d5db;
      margin-top: 1rem;
    }

    /* Code Step */
    .qs-resend {
      text-align: center;
      margin-top: 0.75rem;
      font-size: 0.875rem;
    }

    .countdown-text { color: #9ca3af; }

    .qs-link-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }

    .qs-back-btn {
      display: block;
      margin: 0.75rem auto 0;
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 0.85rem;
      cursor: pointer;
      &:hover { color: #374151; }
    }

    /* Store Form */
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .qs-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .field-error {
      font-size: 0.78rem;
      color: #ef4444;
    }

    .url-field {
      display: flex;
      align-items: center;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;

      &:focus-within { border-color: #667eea; }
    }

    .url-prefix {
      padding: 0.75rem;
      background: #f9fafb;
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      border-right: 1px solid #e5e7eb;
      white-space: nowrap;
    }

    .url-input {
      border: none;
      border-radius: 0;
      flex: 1;
      padding: 0.75rem;
      &:focus { box-shadow: none; }
    }

    /* Category Grid */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .cat-btn {
      padding: 0.5rem 0.4rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      color: #374151;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;

      &.active {
        border-color: #667eea;
        background: rgba(102,126,234,0.07);
        color: #667eea;
      }

      &:hover:not(.active) {
        border-color: #d1d5db;
        background: #f9fafb;
      }
    }

    /* Done */
    .qs-done {
      text-align: center;
    }

    .done-check {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    /* Telegram Link Box */
    .telegram-link-box {
      background: #f0f9ff;
      border: 2px solid #0ea5e9;
      border-radius: 10px;
      padding: 1rem;
      font-size: 0.875rem;
      color: #0c4a6e;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
      p { margin: 0; }
    }
    .telegram-open-btn {
      display: block;
      background: linear-gradient(135deg, #2CA5E0, #1a82b5);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 1rem;
      &:hover { opacity: 0.9; transform: translateY(-1px); }
    }
    .telegram-hint {
      font-size: 0.78rem;
      color: #0369a1;
    }

    /* DEV-Modus Code-Anzeige */
    .dev-code-box {
      background: #fffbeb;
      border: 2px dashed #f59e0b;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .dev-code-value {
      font-size: 1.5rem;
      letter-spacing: 0.15em;
      color: #b45309;
      font-family: monospace;
      font-weight: 800;
    }
    .dev-copy-btn {
      margin-left: auto;
      background: #f59e0b;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.3rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      .qs-card { padding: 1.5rem 1.25rem; border-radius: 16px; }
      .qs-title { font-size: 1.3rem; }
      .code-input { font-size: 1.75rem; letter-spacing: 0.3em; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class QuickStartComponent implements OnDestroy {

  step = signal<FlowStep>('phone');
  channel = signal<Channel>('whatsapp');
  loading = signal(false);
  errorMsg = signal('');
  countdown = signal(0);
  selectedCategory = signal('');
  selectedCountry = signal<Country>(COUNTRIES[0]); // Standard: Marokko
  showCountryDropdown = signal(false);

  countries = COUNTRIES;

  /** Gibt die fertige E.164-Nummer zurück, die ans Backend gesendet wird (live preview) */
  get fullPhone(): string {
    const raw = (this.phoneForm?.value?.phone || '').replace(/\s/g, '');
    if (!raw) return '';
    if (raw.startsWith('+')) return raw;
    const dial = this.selectedCountry().dialCode;
    return raw.startsWith('0') ? dial + raw.substring(1) : dial + raw;
  }

  rawPhone = '';
  devCode = '';
  telegramLink = '';
  botUsername = '';
  private verificationId = 0;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private createdStoreId = 0;

  categories = [
    { id: 'fashion',     icon: '👗', name: 'Mode' },
    { id: 'electronics', icon: '📱', name: 'Elektronik' },
    { id: 'food',        icon: '🍕', name: 'Lebensmittel' },
    { id: 'beauty',      icon: '💄', name: 'Beauty' },
    { id: 'home',        icon: '🏠', name: 'Heim' },
    { id: 'other',       icon: '📦', name: 'Sonstiges' }
  ];

  phoneForm!: FormGroup;
  codeForm!: FormGroup;
  storeForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private phoneAuthService: PhoneQuickAuthService,
    private storeService: StoreService,
    private router: Router
  ) {
    this.phoneForm = this.fb.group({
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\+?[0-9]{6,15}$/),
        this.phoneValidator
      ]]
    });

    this.codeForm = this.fb.group({
      code: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{6}$/)
      ]]
    });

    this.storeForm = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(3)]],
      storeSlug: ['']
    });
  }

  /** Validiert Telefonnummern: Lokale Nummern (ohne Vorwahl) oder internationale mit + */
  private readonly phoneValidator = (control: AbstractControl): ValidationErrors | null => {
    const val: string = (control.value || '').replace(/\s/g, '');
    if (!val) return null;

    // Wenn Nutzer vollständiges internationales Format eingibt (mit +): min 10 Zeichen gesamt
    if (val.startsWith('+')) {
      return val.length >= 10 && /^\+[0-9]{7,14}$/.test(val) ? null : { invalidPhone: true };
    }
    // Lokale Nummern mit führender 0 (z.B. 0151... DE, 0612... MA): nach Länderwahl ergänzt
    if (/^0[0-9]{6,13}$/.test(val)) return null;
    // Lokale Nummern ohne führende 0: min 5 Ziffern
    if (/^[1-9][0-9]{4,13}$/.test(val)) return null;

    return { invalidPhone: true };
  };

  stepIndex(): number { return { phone:1, code:2, store:3, done:3 }[this.step()]; }
  progressPercent(): number { return { phone:33, code:66, store:90, done:100 }[this.step()]; }
  setChannel(c: Channel): void { this.channel.set(c); }
  selectCategory(id: string): void { this.selectedCategory.set(id === this.selectedCategory() ? '' : id); }

  toggleCountryDropdown(event?: MouseEvent): void {
    event?.stopPropagation(); // Verhindert sofortiges Schließen durch document:click
    this.showCountryDropdown.set(!this.showCountryDropdown());
  }
  selectCountry(c: Country): void { this.selectedCountry.set(c); this.showCountryDropdown.set(false); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Dropdown schließen wenn außerhalb geklickt wird
    const target = event.target as HTMLElement;
    if (!target.closest('.country-selector-wrap')) {
      this.showCountryDropdown.set(false);
    }
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.codeForm.get('code')?.setValue(input.value, { emitEvent: false });
  }

  sendCode(): void {
    if (this.phoneForm.invalid) { this.phoneForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const phone = this.fullPhone; // nutzt den getter für konsistente Logik

    // Frontend-Sicherheitsprüfung: finale Nummer muss E.164 sein (7-15 Stellen nach +)
    if (!/^\+[0-9]{7,15}$/.test(phone)) {
      this.loading.set(false);
      this.errorMsg.set(`Ungültiges Format: "${phone}" – bitte prüfe die Nummer und den gewählten Ländercode.`);
      return;
    }

    this.rawPhone = phone;
    this.phoneAuthService.requestCode(phone, this.channel()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.verificationId = res.verificationId;
          this.devCode = res.devCode || '';
          this.telegramLink = res.telegramLink || '';
          this.botUsername = res.botUsername || '';
          this.step.set('code');
          this.startCountdown(60);
        } else {
          this.errorMsg.set(res.message || 'Fehler beim Senden.');
        }
      },
      error: (err) => { this.loading.set(false); this.errorMsg.set(err?.error?.message || 'Netzwerkfehler.'); }
    });
  }

  verifyCode(): void {
    if (this.codeForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.phoneAuthService.verifyAndLogin(this.verificationId, this.codeForm.value.code).subscribe({
      next: () => { this.loading.set(false); this.step.set('store'); },
      error: (err) => { this.loading.set(false); this.errorMsg.set(err?.error?.message || 'Falscher Code.'); }
    });
  }

  createStore(): void {
    if (this.storeForm.get('storeName')?.invalid) { this.storeForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    const storeName: string = this.storeForm.value.storeName;
    const slugBase = (this.storeForm.value.storeSlug || storeName)
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 30);
    const payload: any = { name: storeName, slug: slugBase, description: '', category: this.selectedCategory() || 'other', whatsappNumber: this.rawPhone };
    this.storeService.createStore(payload).subscribe({
      next: (store: any) => { this.loading.set(false); this.createdStoreId = store.id; this.step.set('done'); },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || '';
        if (msg.toLowerCase().includes('slug') || msg.toLowerCase().includes('already')) {
          payload.slug = slugBase + '-' + Math.floor(Math.random() * 9000 + 1000);
          this.storeService.createStore(payload).subscribe({
            next: (s: any) => { this.loading.set(false); this.createdStoreId = s.id; this.step.set('done'); },
            error: () => { this.loading.set(false); this.errorMsg.set('Store konnte nicht erstellt werden.'); }
          });
        } else { this.loading.set(false); this.errorMsg.set(msg || 'Store konnte nicht erstellt werden.'); }
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(this.createdStoreId ? ['/stores', this.createdStoreId] : ['/dashboard']);
  }

  backToPhone(): void { this.step.set('phone'); this.errorMsg.set(''); this.codeForm.reset(); this.stopCountdown(); }

  private startCountdown(s: number): void {
    this.countdown.set(s);
    this.countdownInterval = setInterval(() => {
      const c = this.countdown(); if (c > 0) this.countdown.set(c - 1); else this.stopCountdown();
    }, 1000);
  }

  private stopCountdown(): void { if (this.countdownInterval) clearInterval(this.countdownInterval); }
  ngOnDestroy(): void { this.stopCountdown(); }
}

