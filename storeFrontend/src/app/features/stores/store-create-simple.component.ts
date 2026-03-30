import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '@app/core/services/store.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

interface SlugStatus {
  checking: boolean;
  available: boolean | null;
  message: string;
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
      </div>

      <!-- Main content - centered, focused -->
      <div class="content">
        <div class="form-wrapper">
          
          <!-- Friendly headline -->
          <div class="headline-section">
            <h1>Create your store</h1>
            <p class="subtitle">Start selling in minutes. No credit card required.</p>
          </div>

          <!-- Minimal form -->
          <form [formGroup]="storeForm" (ngSubmit)="createStore()" class="store-form">
            
            <!-- Store Name -->
            <div class="form-group">
              <label for="storeName" class="label">
                Store name
                <span class="required">*</span>
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

            <!-- Store URL with live preview -->
            <div class="form-group">
              <label for="storeSlug" class="label">
                Store URL
                <span class="optional">Optional - we'll generate one for you</span>
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

              <!-- Live validation feedback -->
              <div class="slug-feedback">
                @if (slugStatus().checking) {
                  <span class="checking">
                    <span class="spinner-mini"></span>
                    Checking availability...
                  </span>
                }
                @if (slugStatus().available === true) {
                  <span class="available">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.3334 4L6.00002 11.3333L2.66669 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Available! Your store will be at <strong>{{storeForm.get('storeSlug')?.value}}.markt.ma</strong>
                  </span>
                }
                @if (slugStatus().available === false) {
                  <span class="taken">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    This URL is already taken. Try another one.
                  </span>
                }
              </div>

              @if (showError('storeSlug')) {
                <span class="error-text">Only lowercase letters, numbers, and hyphens allowed</span>
              }
            </div>

            <!-- Primary CTA -->
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="loading() || storeForm.invalid || slugStatus().available === false"
              [class.loading]="loading()"
            >
              @if (loading()) {
                <span class="btn-spinner"></span>
                Creating your store...
              } @else {
                Create my store
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4.16669 10H15.8334M15.8334 10L10 4.16669M15.8334 10L10 15.8334" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
            </button>

            <!-- Error state -->
            @if (error()) {
              <div class="error-banner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ error() }}
              </div>
            }

          </form>

          <!-- Social proof / trust signals -->
          <div class="trust-signals">
            <div class="trust-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L9.79611 5.52786H15.6085L10.9062 8.94427L12.7023 14.4721L8 11.0557L3.29772 14.4721L5.09383 8.94427L0.391548 5.52786H6.20389L8 0Z" fill="currentColor"/>
              </svg>
              Free to start
            </div>
            <div class="trust-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L9.79611 5.52786H15.6085L10.9062 8.94427L12.7023 14.4721L8 11.0557L3.29772 14.4721L5.09383 8.94427L0.391548 5.52786H6.20389L8 0Z" fill="currentColor"/>
              </svg>
              No credit card required
            </div>
            <div class="trust-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L9.79611 5.52786H15.6085L10.9062 8.94427L12.7023 14.4721L8 11.0557L3.29772 14.4721L5.09383 8.94427L0.391548 5.52786H6.20389L8 0Z" fill="currentColor"/>
              </svg>
              Setup in minutes
            </div>
          </div>

        </div>
      </div>

      <!-- Minimal footer -->
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
      padding: 1.5rem 2rem;
      background: white;
      border-bottom: 1px solid #e5e7eb;
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }

    /* ==================== Content ==================== */
    .content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
    }

    .form-wrapper {
      width: 100%;
      max-width: 480px;
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* ==================== Headline ==================== */
    .headline-section {
      margin-bottom: 2.5rem;
      text-align: center;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.5rem;
      letter-spacing: -0.03em;
    }

    .subtitle {
      font-size: 1rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    /* ==================== Form ==================== */
    .store-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .required {
      color: #dc2626;
    }

    .optional {
      font-weight: 400;
      color: #9ca3af;
      font-size: 0.8125rem;
    }

    /* ==================== Inputs ==================== */
    .input {
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      transition: all 0.15s ease;
      font-family: inherit;
      background: white;
    }

    .input:hover {
      border-color: #9ca3af;
    }

    .input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .input.error {
      border-color: #dc2626;
    }

    .input.error:focus {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }

    .input.checking {
      border-color: #f59e0b;
    }

    .input.available {
      border-color: #10b981;
    }

    .input.taken {
      border-color: #dc2626;
    }

    /* URL Input special styling */
    .url-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-url {
      padding-right: 110px;
      flex: 1;
    }

    .url-suffix {
      position: absolute;
      right: 1rem;
      color: #6b7280;
      font-size: 0.9375rem;
      pointer-events: none;
      user-select: none;
    }

    /* ==================== Slug Feedback ==================== */
    .slug-feedback {
      min-height: 20px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checking,
    .available,
    .taken {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checking {
      color: #f59e0b;
    }

    .available {
      color: #10b981;
    }

    .taken {
      color: #dc2626;
    }

    .spinner-mini {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(245, 158, 11, 0.2);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-text {
      color: #dc2626;
      font-size: 0.875rem;
    }

    /* ==================== Primary Button ==================== */
    .btn-primary {
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: #2563eb;
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

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary.loading {
      pointer-events: none;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ==================== Error Banner ==================== */
    .error-banner {
      padding: 0.875rem 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .error-banner svg {
      flex-shrink: 0;
      color: #dc2626;
    }

    /* ==================== Trust Signals ==================== */
    .trust-signals {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .trust-item svg {
      color: #10b981;
      width: 16px;
      height: 16px;
    }

    /* ==================== Footer ==================== */
    .footer {
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .footer a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    /* ==================== Responsive ==================== */
    @media (max-width: 640px) {
      .form-wrapper {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.75rem;
      }

      .trust-signals {
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  `]
})
export class StoreCreateSimpleComponent implements OnInit {
  storeForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  slugStatus = signal<SlugStatus>({ checking: false, available: null, message: '' });

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private router: Router
  ) {
    this.storeForm = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(2)]],
      storeSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]]
    });

    // Auto-check slug availability
    this.storeForm.get('storeSlug')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(slug => {
        if (!slug || slug.length < 3) {
          return of(null);
        }
        this.slugStatus.set({ checking: true, available: null, message: '' });
        // TODO: Real API call
        return of({ available: Math.random() > 0.3 }); // Mock
      })
    ).subscribe(result => {
      if (result) {
        this.slugStatus.set({
          checking: false,
          available: result.available,
          message: result.available ? 'Available' : 'Taken'
        });
      }
    });
  }

  ngOnInit(): void {}

  onStoreNameChange(): void {
    const name = this.storeForm.get('storeName')?.value;
    const slugControl = this.storeForm.get('storeSlug');
    
    // Only auto-generate if slug is empty or not manually edited
    if (name && (!slugControl?.dirty || !slugControl?.value)) {
      const slug = this.generateSlug(name);
      slugControl?.setValue(slug, { emitEvent: true });
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

  async createStore(): Promise<void> {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const { storeName, storeSlug } = this.storeForm.value;
      
      const result = await this.storeService.createStore({
        name: storeName,
        slug: storeSlug,
        // Auto-populate with defaults
        description: `Welcome to ${storeName}`
      }).toPromise();

      if (!result || !result.id) {
        this.error.set('Store creation failed. Please try again.');
        this.loading.set(false);
        return;
      }

      // Navigate to success screen
      this.router.navigate(['/store-success'], {
        queryParams: { 
          storeId: result.id,
          storeName: storeName,
          storeUrl: `${storeSlug}.markt.ma`
        }
      });

    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err.error?.message || 'Something went wrong. Please try again.');
    }
  }
}

