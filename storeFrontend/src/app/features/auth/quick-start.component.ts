import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhoneQuickAuthService } from '@app/core/services/phone-quick-auth.service';
import { StoreService } from '@app/core/services/store.service';

type FlowStep = 'phone' | 'code' | 'store' | 'done';
type Channel = 'whatsapp' | 'telegram';

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
            <div class="input-group">
              <span class="input-prefix">🇲🇦 +212</span>
              <input
                type="tel"
                formControlName="phone"
                placeholder="6 00 123 456"
                class="qs-input phone-input"
                inputmode="numeric"
                maxlength="12"
                [class.has-error]="phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched"
              />
            </div>
            <p class="qs-hint">Format: +212 6XX XXX XXX (Marokko) oder andere Ländervorwahl</p>

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
      @if (step() === 'code') {
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
      overflow: hidden;
      transition: border-color 0.2s;

      &:focus-within {
        border-color: #667eea;
      }
    }

    .input-prefix {
      padding: 0.75rem 0.75rem;
      background: #f9fafb;
      color: #374151;
      font-size: 0.9rem;
      font-weight: 600;
      border-right: 1px solid #e5e7eb;
      white-space: nowrap;
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

  rawPhone = '';
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

  phoneForm: FormGroup;
  codeForm: FormGroup;
  storeForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private phoneAuthService: PhoneQuickAuthService,
    private storeService: StoreService,
    private router: Router
  ) {
    this.phoneForm = this.fb.group({
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\+?[0-9]{7,15}$/)
      ]]
    });

    this.codeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });

    this.storeForm = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(3)]],
      storeSlug: ['']
    });
  }

  stepIndex(): number { return { phone:1, code:2, store:3, done:3 }[this.step()]; }
  progressPercent(): number { return { phone:33, code:66, store:90, done:100 }[this.step()]; }
  setChannel(c: Channel): void { this.channel.set(c); }
  selectCategory(id: string): void { this.selectedCategory.set(id === this.selectedCategory() ? '' : id); }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.codeForm.get('code')?.setValue(input.value, { emitEvent: false });
  }

  sendCode(): void {
    if (this.phoneForm.invalid) { this.phoneForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    let phone: string = this.phoneForm.value.phone;
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('0') ? '+212' + phone.substring(1) : '+212' + phone;
    }
    this.rawPhone = phone;
    this.phoneAuthService.requestCode(phone, this.channel()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) { this.verificationId = res.verificationId; this.step.set('code'); this.startCountdown(60); }
        else { this.errorMsg.set(res.message || 'Fehler beim Senden.'); }
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

