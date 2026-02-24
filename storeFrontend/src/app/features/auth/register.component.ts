import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>{{ 'auth.registerTitle' | translate }}</h1>
        <p class="subtitle">{{ 'auth.registerSubtitle' | translate }}</p>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              [placeholder]="'auth.emailPlaceholder' | translate"
            />
            <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="error">
              {{ 'auth.emailInvalid' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              [placeholder]="'profile.newPasswordPlaceholder' | translate"
            />
            <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="error">
              {{ 'profile.passwordMinLength' | translate }}
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="alert alert-success">
            {{ successMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="registerForm.invalid || loading">
            {{ loading ? ('auth.registering' | translate) : ('auth.registerBtn' | translate) }}
          </button>
        </form>

        <p class="auth-footer">
          <a [routerLink]="['/login']" [queryParams]="{ returnUrl: returnUrl }">{{ 'auth.alreadyRegistered' | translate }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .auth-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 420px;
    }

    h1 {
      margin-bottom: 10px;
      color: #333;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }

    .error {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }

    .btn {
      width: 100%;
      margin-top: 10px;
    }

    .auth-footer {
      text-align: center;
      margin-top: 20px;
      color: #666;
    }

    .auth-footer a {
      color: #667eea;
      font-weight: 600;
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private translationService: TranslationService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // FIXED: Speichere returnUrl für Template-Verwendung
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = this.translationService.translate('auth.registerSuccess');
          // Formular zurücksetzen
          this.registerForm.reset();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || this.translationService.translate('auth.registerFailed');
        }
      });
    }
  }
}
