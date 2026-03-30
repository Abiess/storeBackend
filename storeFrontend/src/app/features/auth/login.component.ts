import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';
import {LanguageSwitcherComponent} from "@app/core/i18n.exports";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LanguageSwitcherComponent, TranslatePipe],
  template: `
    <div class="auth-container">
      <div class="language-switcher-wrapper">
        <app-language-switcher></app-language-switcher>
      </div>

      <div class="auth-card">
        <h1>{{ 'auth.loginTitle' | translate }}</h1>
        <p class="subtitle">{{ 'auth.loginSubtitle' | translate }}</p>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input
                id="email"
                type="email"
                formControlName="email"
                [placeholder]="'auth.emailPlaceholder' | translate"
            />
            <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="error">
              {{ 'auth.emailInvalid' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <input
                id="password"
                type="password"
                formControlName="password"
                [placeholder]="'auth.password' | translate"
            />
            <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="error">
              {{ 'auth.passwordMinLength' | translate }}
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="loginForm.invalid || loading">
            {{ loading ? ('auth.loggingIn' | translate) : ('auth.login' | translate) }}
          </button>
        </form>

        <div class="text-center mt-3">
          <a [routerLink]="['/forgot-password']" class="text-sm text-indigo-600 hover:text-indigo-500">
            {{ 'auth.forgotPassword' | translate }}
          </a>
        </div>

        <p class="auth-footer">
          {{ 'auth.noAccount' | translate }}
          <a [routerLink]="['/register']" [queryParams]="{ returnUrl: returnUrl }">
            {{ 'header.register' | translate }}
          </a>
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
      margin-left: 4px;
    }

    .language-switcher-wrapper {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 1000;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  constructor(
      private fb: FormBuilder,
      private authService: AuthService,
      private storeService: StoreService,
      private router: Router,
      private route: ActivatedRoute,
      private languageService: LanguageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.route.queryParams.subscribe(params => {
      // Auto-fill Email wenn von Register weitergeleitet
      if (params['email'] && params['autoFill'] === 'true') {
        this.loginForm.patchValue({
          email: params['email']
        });
        // Fokus auf Passwort-Feld setzen
        setTimeout(() => {
          const passwordInput = document.getElementById('password') as HTMLInputElement;
          if (passwordInput) {
            passwordInput.focus();
          }
        }, 100);
      }
      
      if (params['error'] === 'session_expired') {
        this.errorMessage = 'auth.sessionExpired';
      } else if (params['error'] === 'auth_required') {
        this.errorMessage = 'auth.authRequired';

      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Prüfe ob User bereits Stores hat
          this.storeService.getMyStores().subscribe({
            next: (stores: any[]) => {
              if (stores && stores.length > 0) {
                // User hat bereits Stores → zum Dashboard
                console.log('🔄 User hat Stores. Weiterleitung zu:', this.returnUrl);
                this.router.navigate([this.returnUrl]);
              } else {
                // Neuer User ohne Stores → zur einfachen Store-Erstellung
                console.log('✨ Neuer User ohne Store. Zeige simple Store-Erstellung...');
                this.router.navigate(['/create-store']);
              }
            },
            error: () => {
              // Falls Store-Abfrage fehlschlägt, trotzdem zum Dashboard
              console.log('⚠️ Store-Abfrage fehlgeschlagen. Weiterleitung zu:', this.returnUrl);
              this.router.navigate([this.returnUrl]);
            }
          });
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'auth.loginFailed';
        }
      });
    }
  }
}
