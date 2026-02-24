import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-storefront-auth-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <button class="btn-close" (click)="close.emit()">✕</button>
        
        <h2>{{ isLogin ? ('common.login' | translate) : ('header.register' | translate) }}</h2>
        
        <div *ngIf="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
        
        <form [formGroup]="authForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'checkout.email' | translate }}</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email"
              [placeholder]="'checkout.emailPlaceholder' | translate"
            />
            <div *ngIf="authForm.get('email')?.invalid && authForm.get('email')?.touched" class="error">
              {{ 'checkout.errors.email' | translate }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password"
              placeholder="••••••••"
            />
            <div *ngIf="authForm.get('password')?.invalid && authForm.get('password')?.touched" class="error">
              {{ 'auth.passwordMinLength' | translate }}
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" [disabled]="loading || authForm.invalid">
            {{ loading ? ('common.loading' | translate) : (isLogin ? ('common.login' | translate) : ('header.register' | translate)) }}
          </button>
        </form>
        
        <div class="toggle-mode">
          <button type="button" (click)="toggleMode()" class="btn-link">
            {{ isLogin ? ('auth.noAccount' | translate) : ('auth.alreadyRegistered' | translate) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
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
    }
    
    .dialog-content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
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
    
    .btn-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0.25rem 0.5rem;
      line-height: 1;
      transition: color 0.2s;
    }
    
    .btn-close:hover {
      color: #333;
    }
    
    h2 {
      margin: 0 0 1.5rem;
      color: #333;
      font-size: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .error-banner {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    
    .btn {
      width: 100%;
      padding: 0.875rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .toggle-mode {
      margin-top: 1.5rem;
      text-align: center;
    }
    
    .btn-link {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0.5rem;
    }
    
    .btn-link:hover {
      color: #764ba2;
    }
    
    @media (max-width: 768px) {
      .dialog-content {
        padding: 1.5rem;
        margin: 1rem;
      }
    }
  `]
})
export class StorefrontAuthDialogComponent {
  @Input() isLogin = true;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  authForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private translationService: TranslationService
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
    this.authForm.reset();
  }

  onSubmit(): void {
    if (this.authForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const credentials = this.authForm.value;

    const authObservable = this.isLogin
      ? this.authService.login(credentials)
      : this.authService.register(credentials);

    authObservable.subscribe({
      next: (response) => {
        console.log('✅ Authentifizierung erfolgreich:', response);
        this.loading = false;
        this.success.emit();
        this.close.emit();
      },
      error: (error) => {
        console.error('❌ Authentifizierungsfehler:', error);
        this.loading = false;
        this.errorMessage = error.error?.message ||
          (this.isLogin
            ? this.translationService.translate('auth.loginDialogFailed')
            : this.translationService.translate('auth.registerFailed'));
      }
    });
  }
}

