import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface CreateStoreResponse {
  token: string;
  storeId: number;
  storeSlug: string;
  userId: number;
  isAnonymous: boolean;
  message: string;
}

@Component({
  selector: 'app-create-store-public',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="cs-wrapper">

      <!-- Header -->
      <header class="cs-header">
        <a routerLink="/" class="cs-logo">🛍️ markt.ma</a>
        <a routerLink="/login" class="cs-login-link">Bereits registriert? Einloggen →</a>
      </header>

      <!-- Card -->
      @if (step() === 'form') {
        <div class="cs-card animate-in">
          <div class="cs-icon">🏪</div>
          <h1 class="cs-title">Deinen Store erstellen</h1>
          <p class="cs-subtitle">Kostenlos – ohne E-Mail oder Anmeldung</p>

          <div class="cs-badges">
            <span class="badge">✅ Kostenlos</span>
            <span class="badge">✅ Sofort online</span>
            <span class="badge">✅ Kein Passwort</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="cs-form">

            <div class="field">
              <label class="cs-label">Store-Name *</label>
              <input
                type="text"
                formControlName="storeName"
                class="cs-input"
                placeholder="z.B. Abdullahs Mode Shop"
                [class.error]="form.get('storeName')?.invalid && form.get('storeName')?.touched"
              />
              @if (form.get('storeName')?.invalid && form.get('storeName')?.touched) {
                <p class="field-error">Bitte gib einen Store-Namen ein (min. 2 Zeichen)</p>
              }
            </div>

            <div class="field">
              <label class="cs-label">Kategorie</label>
              <div class="category-grid">
                @for (cat of categories; track cat.id) {
                  <button type="button"
                    class="cat-btn"
                    [class.active]="selectedCategory() === cat.id"
                    (click)="selectCategory(cat.id)">
                    {{ cat.icon }} {{ cat.name }}
                  </button>
                }
              </div>
            </div>

            @if (errorMsg()) {
              <div class="cs-error">⚠️ {{ errorMsg() }}</div>
            }

            <button type="submit" class="cs-btn-primary" [disabled]="loading() || form.invalid">
              @if (loading()) {
                <span class="spinner"></span> Erstelle Store...
              } @else {
                🚀 Store jetzt erstellen →
              }
            </button>

            <p class="cs-privacy">
              🔒 Kein Spam. Kein Passwort nötig.
              <a routerLink="/login">Bereits registriert?</a>
            </p>
          </form>
        </div>
      }

      <!-- Erfolg -->
      @if (step() === 'done') {
        <div class="cs-card animate-in cs-done">
          <div class="cs-icon">🎉</div>
          <h1 class="cs-title">Dein Store ist bereit!</h1>
          <p class="cs-subtitle">{{ storeName() }}</p>

          <div class="done-actions">
            <button class="cs-btn-primary" (click)="goToDashboard()">
              📦 Produkte hinzufügen →
            </button>
            <a class="done-link" [href]="'https://' + storeSlug() + '.markt.ma'" target="_blank">
              🌐 Store ansehen ↗
            </a>
          </div>

          <div class="save-account-box">
            <h3>💾 Account sichern (optional)</h3>
            <p>Speichere deine Telefonnummer um später wieder einloggen zu können.</p>
            <button class="cs-btn-secondary" (click)="goToSecure()">
              📱 Account jetzt sichern
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .cs-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 1rem 3rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .cs-header {
      width: 100%;
      max-width: 480px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0 0.5rem;
    }

    .cs-logo {
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      text-decoration: none;
    }

    .cs-login-link {
      color: rgba(255,255,255,0.85);
      font-size: 0.82rem;
      text-decoration: none;
      &:hover { color: white; text-decoration: underline; }
    }

    .cs-card {
      width: 100%;
      max-width: 480px;
      background: white;
      border-radius: 20px;
      padding: 2rem 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      margin-top: 1.5rem;
    }

    .animate-in {
      animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .cs-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .cs-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1a1a2e;
      text-align: center;
      margin: 0 0 0.4rem;
    }

    .cs-subtitle {
      color: #6b7280;
      text-align: center;
      font-size: 0.95rem;
      margin: 0 0 1rem;
    }

    .cs-badges {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }

    .badge {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
      border-radius: 20px;
      padding: 0.25rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .cs-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .cs-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .cs-input {
      width: 100%;
      padding: 0.8rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;

      &:focus { border-color: #667eea; }
      &.error { border-color: #ef4444; }
    }

    .field-error {
      font-size: 0.78rem;
      color: #ef4444;
      margin: 0;
    }

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

    .cs-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .cs-btn-primary {
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
        box-shadow: 0 8px 25px rgba(102,126,234,0.4);
      }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .cs-btn-secondary {
      width: 100%;
      padding: 0.75rem 1.25rem;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { background: #667eea; color: white; }
    }

    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .cs-privacy {
      font-size: 0.78rem;
      color: #9ca3af;
      text-align: center;
      margin: 0;
      a { color: #667eea; }
    }

    /* Done */
    .cs-done { text-align: center; }

    .done-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .done-link {
      color: #667eea;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .save-account-box {
      background: #faf5ff;
      border: 1.5px solid #e9d5ff;
      border-radius: 12px;
      padding: 1rem;
      text-align: left;

      h3 { font-size: 0.95rem; color: #6b21a8; margin: 0 0 0.4rem; }
      p  { font-size: 0.82rem; color: #6b7280; margin: 0 0 0.75rem; }
    }

    @media (max-width: 480px) {
      .cs-card { padding: 1.5rem 1.25rem; }
      .cs-title { font-size: 1.3rem; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class CreateStorePublicComponent {

  step = signal<'form' | 'done'>('form');
  loading = signal(false);
  errorMsg = signal('');
  selectedCategory = signal('');
  storeName = signal('');
  storeSlug = signal('');
  private createdStoreId = 0;

  categories = [
    { id: 'fashion',     icon: '👗', name: 'Mode' },
    { id: 'electronics', icon: '📱', name: 'Elektronik' },
    { id: 'food',        icon: '🍕', name: 'Lebensmittel' },
    { id: 'beauty',      icon: '💄', name: 'Beauty' },
    { id: 'home',        icon: '🏠', name: 'Heim' },
    { id: 'other',       icon: '📦', name: 'Sonstiges' }
  ];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.form = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]]
    });
  }

  selectCategory(id: string): void {
    this.selectedCategory.set(id === this.selectedCategory() ? '' : id);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const name: string = this.form.value.storeName.trim();
    const slugBase = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);

    const payload = {
      storeName: name,
      storeSlug: slugBase,
      category: this.selectedCategory() || 'other'
    };

    this.http.post<CreateStoreResponse>(
      `${environment.apiUrl}/public/create-store`, payload
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        // JWT + User in localStorage speichern (wie beim normalen Login)
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('currentUser', JSON.stringify({
          id: res.userId,
          email: `anon-${res.userId}@markt.ma`,
          name: name,
          role: 'USER',
          roles: ['USER']
        }));
        this.createdStoreId = res.storeId;
        this.storeName.set(name);
        this.storeSlug.set(res.storeSlug);
        this.step.set('done');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Fehler beim Erstellen des Stores. Bitte versuche es erneut.');
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/stores', this.createdStoreId]);
  }

  goToSecure(): void {
    this.router.navigate(['/settings']);
  }
}

