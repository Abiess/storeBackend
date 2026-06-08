import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { StoreService } from '@app/core/services/store.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@env/environment';

interface SlugStatus {
  checking: boolean;
  available: boolean | null;
  message: string;
}

interface StoreCategory {
  id: string;
  icon: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-store-create-simple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="create-store-container">
      <!-- Clean, minimal header -->
      <div class="header">
        <div class="logo">markt.ma</div>
        <!-- Step indicator -->
        <div class="steps-indicator">
          <div class="step-dot" [class.active]="currentStep() === 1" [class.done]="currentStep() > 1">
            <span>1</span>
          </div>
          <div class="step-line" [class.done]="currentStep() > 1"></div>
          <div class="step-dot" [class.active]="currentStep() === 2">
            <span>2</span>
          </div>
        </div>
      </div>

      <!-- Step 1: Store Name + URL -->
      <div class="content" *ngIf="currentStep() === 1">
        <div class="form-wrapper">
          <div class="headline-section">
            <h1>Create your store</h1>
            <p class="subtitle">Start selling in minutes. No credit card required.</p>
          </div>

          <form [formGroup]="storeForm" (ngSubmit)="goToStep2()" class="store-form">

            <!-- Store Name -->
            <div class="form-group">
              <label for="storeName" class="label">
                Store name <span class="required">*</span>
              </label>
              <input
                id="storeName"
                type="text"
                formControlName="storeName"
                placeholder="e.g. My Fashion Store"
                class="input"
                [class.error]="showError('storeName')"
                (input)="onStoreNameChange()"
              />
              @if (showError('storeName')) {
                <span class="error-text">Please enter a store name</span>
              }
            </div>

            <!-- Store URL -->
            <div class="form-group">
              <label for="storeSlug" class="label">
                Store URL <span class="optional">Optional – we'll generate one</span>
              </label>
              <div class="url-input-wrapper">
                <input
                  id="storeSlug"
                  type="text"
                  formControlName="storeSlug"
                  placeholder="my-fashion-store"
                  class="input input-url"
                  [class.error]="showError('storeSlug')"
                  [class.checking]="slugStatus().checking"
                  [class.available]="slugStatus().available === true"
                  [class.taken]="slugStatus().available === false"
                />
                <span class="url-suffix">.markt.ma</span>
              </div>
              <div class="slug-feedback">
                @if (slugStatus().checking) {
                  <span class="checking"><span class="spinner-mini"></span>Checking...</span>
                }
                @if (slugStatus().available === true) {
                  <span class="available">✓ Available – <strong>{{storeForm.get('storeSlug')?.value}}.markt.ma</strong></span>
                }
                @if (slugStatus().available === false) {
                  <span class="taken">✗ Already taken. Try another.</span>
                }
              </div>
              @if (showError('storeSlug')) {
                <span class="error-text">Only lowercase letters, numbers, and hyphens</span>
              }
            </div>

            <button
              type="submit"
              class="btn-primary"
              [disabled]="storeForm.invalid || slugStatus().available === false"
            >
              Continue: Choose your niche
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4.16669 10H15.8334M15.8334 10L10 4.16669M15.8334 10L10 15.8334" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </form>

          <div class="trust-signals">
            <div class="trust-item">⭐ Free to start</div>
            <div class="trust-item">⭐ No credit card</div>
            <div class="trust-item">⭐ Setup in minutes</div>
          </div>
        </div>
      </div>

      <!-- Step 2: Category / Niche selection -->
      <div class="content" *ngIf="currentStep() === 2">
        <div class="form-wrapper form-wrapper--wide">
          <div class="headline-section">
            <h1>What do you sell?</h1>
            <p class="subtitle">Pick your niche – we'll tailor your store. You can change this later.</p>
          </div>

          <div class="categories-grid">
            <div
              *ngFor="let cat of categories"
              class="category-card"
              [class.selected]="selectedCategories().includes(cat.id)"
              (click)="toggleCategory(cat.id)"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <div class="cat-body">
                <strong class="cat-name">{{ cat.name }}</strong>
                <span class="cat-desc">{{ cat.description }}</span>
              </div>
              <div class="cat-check" *ngIf="selectedCategories().includes(cat.id)">✓</div>
            </div>
          </div>

          <div class="step2-actions">
            <button class="btn-back" (click)="currentStep.set(1)">← Back</button>
            <div class="step2-right">
              <button class="btn-skip" (click)="createStore()" [disabled]="loading()">
                Skip this step
              </button>
              <button
                class="btn-primary"
                (click)="createStore()"
                [disabled]="loading()"
                [class.loading]="loading()"
              >
                @if (loading()) {
                  <span class="btn-spinner"></span>
                  Creating your store...
                } @else {
                  {{ selectedCategories().length > 0 ? 'Create my store →' : 'Create my store →' }}
                }
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="error-banner">⚠️ {{ error() }}</div>
          }
        </div>
      </div>

      <div class="footer">
        <p>Already have a store? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== Base Layout ==================== */
    .create-store-container {
      min-height: 100vh;
      background: #fafafa;
      display: flex;
      flex-direction: column;
    }

    /* ==================== Header ==================== */
    .header {
      padding: 1.25rem 2rem;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }

    /* Step dots */
    .steps-indicator {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .step-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      background: white;
      transition: all 0.2s;
    }
    .step-dot.active { border-color: #667eea; color: #667eea; }
    .step-dot.done { border-color: #10b981; background: #10b981; color: white; }
    .step-dot.done span::before { content: '✓'; }
    .step-dot.done span { display: none; }
    .step-dot.done::after { content: '✓'; color: white; font-size: 0.85rem; }
    .step-line {
      width: 40px;
      height: 2px;
      background: #e5e7eb;
      transition: background 0.2s;
    }
    .step-line.done { background: #10b981; }

    /* ==================== Content ==================== */
    .content {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 3rem 1.5rem;
    }

    .form-wrapper {
      width: 100%;
      max-width: 480px;
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .form-wrapper--wide { max-width: 700px; }

    /* ==================== Headline ==================== */
    .headline-section { margin-bottom: 2rem; text-align: center; }
    h1 { font-size: 1.875rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
    .subtitle { font-size: 0.975rem; color: #6b7280; margin: 0; line-height: 1.5; }

    /* ==================== Form ==================== */
    .store-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .label { font-size: 0.875rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 0.5rem; }
    .required { color: #dc2626; }
    .optional { font-weight: 400; color: #9ca3af; font-size: 0.8125rem; }

    .input {
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      transition: all 0.15s ease;
      font-family: inherit;
      background: white;
    }
    .input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.12); }
    .input.error { border-color: #dc2626; }
    .input.available { border-color: #10b981; }
    .input.taken { border-color: #dc2626; }
    .input.checking { border-color: #f59e0b; }

    .url-input-wrapper { position: relative; display: flex; align-items: center; }
    .input-url { padding-right: 110px; flex: 1; }
    .url-suffix { position: absolute; right: 1rem; color: #6b7280; font-size: 0.9375rem; pointer-events: none; }

    .slug-feedback { min-height: 20px; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
    .checking { color: #f59e0b; display: flex; gap: 0.4rem; align-items: center; }
    .available { color: #10b981; }
    .taken { color: #dc2626; }
    .error-text { color: #dc2626; font-size: 0.875rem; }

    .spinner-mini {
      width: 14px; height: 14px;
      border: 2px solid rgba(245,158,11,0.2);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ==================== Buttons ==================== */
    .btn-primary {
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(102,126,234,0.35); }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
    .btn-spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ==================== Category Grid ==================== */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .category-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      background: white;
      position: relative;
    }
    .category-card:hover { border-color: #667eea; background: #f8f7ff; transform: translateY(-1px); }
    .category-card.selected { border-color: #667eea; background: linear-gradient(135deg, #f0f0ff, #f5f0ff); }

    .cat-icon { font-size: 1.5rem; flex-shrink: 0; }
    .cat-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .cat-name { font-size: 0.875rem; font-weight: 600; color: #111827; }
    .cat-desc { font-size: 0.75rem; color: #6b7280; }
    .cat-check {
      position: absolute;
      top: 0.5rem;
      right: 0.625rem;
      width: 20px;
      height: 20px;
      background: #667eea;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: white;
      font-weight: 700;
    }

    /* ==================== Step 2 Actions ==================== */
    .step2-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .step2-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .btn-back {
      padding: 0.75rem 1.25rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #374151;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-back:hover { border-color: #9ca3af; background: #f9fafb; }
    .btn-skip {
      padding: 0.75rem 1.125rem;
      border: none;
      background: none;
      color: #6b7280;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.15s;
    }
    .btn-skip:hover { color: #374151; }
    .btn-skip:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { margin-top: 0; }

    /* ==================== Error ==================== */
    .error-banner {
      margin-top: 1rem;
      padding: 0.875rem 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 0.875rem;
    }

    /* ==================== Trust ==================== */
    .trust-signals { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f3f4f6; display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap; }
    .trust-item { font-size: 0.8125rem; color: #9ca3af; }

    /* ==================== Footer ==================== */
    .footer { padding: 1.25rem 2rem; text-align: center; font-size: 0.875rem; color: #6b7280; background: white; border-top: 1px solid #e5e7eb; }
    .footer a { color: #667eea; text-decoration: none; font-weight: 500; }
    .footer a:hover { text-decoration: underline; }

    /* ==================== Responsive ==================== */
    @media (max-width: 640px) {
      .form-wrapper { padding: 1.75rem 1.25rem; }
      h1 { font-size: 1.5rem; }
      .categories-grid { grid-template-columns: 1fr; }
      .step2-actions { flex-direction: column; align-items: stretch; }
      .step2-right { flex-direction: column; }
      .btn-primary, .btn-back { width: 100%; justify-content: center; }
    }
  `]
})
export class StoreCreateSimpleComponent implements OnInit {
  storeForm: FormGroup;
  currentStep = signal<1 | 2>(1);
  loading = signal(false);
  error = signal<string | null>(null);
  slugStatus = signal<SlugStatus>({ checking: false, available: null, message: '' });
  selectedCategories = signal<string[]>([]);

  readonly categories: StoreCategory[] = [
    { id: 'fashion',     icon: '👗', name: 'Fashion & Apparel',    description: 'Clothing, shoes, accessories' },
    { id: 'electronics', icon: '📱', name: 'Electronics',           description: 'Phones, computers, gadgets' },
    { id: 'food',        icon: '🍔', name: 'Food & Beverages',      description: 'Food, drinks, snacks' },
    { id: 'beauty',      icon: '💄', name: 'Beauty & Cosmetics',    description: 'Makeup, skincare, fragrances' },
    { id: 'home',        icon: '🏠', name: 'Home & Garden',         description: 'Furniture, decor, tools' },
    { id: 'sports',      icon: '⚽', name: 'Sports & Leisure',      description: 'Equipment, outdoor, fitness' },
    { id: 'books',       icon: '📚', name: 'Books & Media',         description: 'Books, movies, music' },
    { id: 'toys',        icon: '🧸', name: 'Toys',                  description: 'Toys for all ages' },
  ];

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private router: Router,
    private http: HttpClient
  ) {
    this.storeForm = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(2)]],
      storeSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]]
    });

    // Slug auto-check (real API)
    this.storeForm.get('storeSlug')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(slug => {
        if (!slug || slug.length < 3) {
          this.slugStatus.set({ checking: false, available: null, message: '' });
          return of(null);
        }
        this.slugStatus.set({ checking: true, available: null, message: '' });
        return this.storeService.checkSlugAvailability(slug).pipe(
          switchMap(res => of(res)),
        );
      })
    ).subscribe(result => {
      if (result != null) {
        const available = (result as any).available ?? true;
        this.slugStatus.set({ checking: false, available, message: available ? 'Available' : 'Taken' });
      }
    });
  }

  ngOnInit(): void {}

  onStoreNameChange(): void {
    const name = this.storeForm.get('storeName')?.value;
    const slugControl = this.storeForm.get('storeSlug');
    if (name && (!slugControl?.dirty || !slugControl?.value)) {
      slugControl?.setValue(this.generateSlug(name), { emitEvent: true });
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
      .trim();
  }

  showError(field: string): boolean {
    const control = this.storeForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  goToStep2(): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }
    this.currentStep.set(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleCategory(id: string): void {
    const current = this.selectedCategories();
    this.selectedCategories.set(
      current.includes(id) ? current.filter(c => c !== id) : [...current, id]
    );
  }

  async createStore(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const { storeName, storeSlug } = this.storeForm.value;
    const isLoggedIn = !!localStorage.getItem('auth_token');

    if (isLoggedIn) {
      // Eingeloggter User → normaler API-Call
      try {
        const result = await this.storeService.createStore({
          name: storeName,
          slug: storeSlug,
          description: `Welcome to ${storeName}`,
          ...(this.selectedCategories().length > 0 ? { categories: this.selectedCategories() } as any : {})
        }).toPromise();

        if (!result?.id) {
          this.error.set('Store creation failed. Please try again.');
          this.loading.set(false);
          return;
        }
        this.router.navigate(['/stores', result.id]);
      } catch (err: any) {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Something went wrong. Please try again.');
      }

    } else {
      // Nicht eingeloggt → Public Endpoint (erstellt anonymen User + Store)
      this.http.post<any>(`${environment.apiUrl}/public/create-store`, {
        storeName,
        storeSlug,
        category: this.selectedCategories()[0] || 'other'
      }).subscribe({
        next: (res) => {
          this.loading.set(false);
          // JWT speichern → User ist jetzt eingeloggt
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('currentUser', JSON.stringify({
            id: res.userId,
            email: `anon-${res.userId}@markt.ma`,
            name: storeName,
            role: 'USER',
            roles: ['USER']
          }));
          this.router.navigate(['/stores', res.storeId]);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Fehler beim Erstellen des Stores. Bitte versuche es erneut.');
        }
      });
    }
  }
}
