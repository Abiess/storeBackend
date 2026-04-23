import { Component, OnInit, OnDestroy } from '@angular/core';
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
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" *ngIf="!successMessage">
          <div class="form-group">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              autocomplete="email"
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
              autocomplete="new-password"
              [placeholder]="'profile.newPasswordPlaceholder' | translate"
            />
            <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="error">
              {{ 'profile.passwordMinLength' | translate }}
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
            <div *ngIf="redirectCountdown > 0" class="redirect-countdown">
              <div class="countdown-circle">
                <svg width="40" height="40">
                  <circle cx="20" cy="20" r="18" 
                          stroke="#667eea" 
                          stroke-width="3" 
                          fill="none"
                          [attr.stroke-dasharray]="113"
                          [attr.stroke-dashoffset]="113 - (113 * (3 - redirectCountdown) / 3)"
                          class="countdown-svg"/>
                </svg>
                <span class="countdown-number">{{ redirectCountdown }}</span>
              </div>
              <span>Weiterleitung zum Login...</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="registerForm.invalid || loading">
            {{ loading ? ('auth.registering' | translate) : ('auth.registerBtn' | translate) }}
          </button>
        </form>

        <!-- Erfolgs-Panel: Hinweis Email-Verifikation + Resend + Login -->
        <div *ngIf="successMessage" class="success-panel" role="status" aria-live="polite">
          <div class="success-icon">📧</div>
          <h2>{{ 'auth.checkInboxTitle' | translate }}</h2>
          <p class="success-text">{{ successMessage }}</p>
          <p class="hint-text">{{ 'auth.checkSpamHint' | translate }}</p>

          <div *ngIf="resendMessage" class="alert" [class.alert-success]="!resendError" [class.alert-error]="resendError">
            {{ resendMessage }}
          </div>

          <div class="success-actions">
            <button type="button" class="btn btn-secondary" (click)="resendVerification()" [disabled]="resending || resendCooldown > 0">
              <span *ngIf="!resending && resendCooldown === 0">{{ 'auth.resendVerification' | translate }}</span>
              <span *ngIf="resending">{{ 'auth.resending' | translate }}</span>
              <span *ngIf="!resending && resendCooldown > 0">{{ 'auth.resendIn' | translate }} {{ resendCooldown }}s</span>
            </button>
            <button type="button" class="btn btn-primary" (click)="goToLogin()">
              {{ 'auth.goToLogin' | translate }}
            </button>
          </div>
        </div>

        <p class="auth-footer" *ngIf="!successMessage">
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
      padding: 16px;
    }

    .auth-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 460px;
    }

    h1 {
      margin-bottom: 10px;
      color: #333;
      text-align: center;
      font-size: 26px;
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

    .redirect-countdown {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(220, 53, 69, 0.2);
      color: #666;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .countdown-circle {
      position: relative;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .countdown-svg {
      transform: rotate(-90deg);
      transition: stroke-dashoffset 1s linear;
    }

    .countdown-number {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
    }

    /* === Success Panel === */
    .success-panel {
      text-align: center;
      animation: fadeIn 0.4s ease;
    }
    .success-icon {
      font-size: 56px;
      margin-bottom: 12px;
      animation: pop 0.5s ease;
    }
    .success-panel h2 {
      color: #28a745;
      font-size: 22px;
      margin-bottom: 12px;
    }
    .success-text {
      color: #444;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .hint-text {
      color: #888;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .success-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }
    .btn-secondary {
      background: #f4f6f9;
      color: #555;
      border: 1px solid #ddd;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e9ecef;
    }
    .alert-success {
      background: #d4edda;
      color: #155724;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    @keyframes pop {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
    }

    /* === Responsive === */
    @media (max-width: 480px) {
      .auth-card {
        padding: 24px 20px;
        border-radius: 10px;
      }
      h1 { font-size: 22px; }
      .subtitle { font-size: 14px; margin-bottom: 22px; }
      .success-icon { font-size: 44px; }
      .success-panel h2 { font-size: 18px; }
    }
    @media (min-width: 481px) {
      .success-actions {
        flex-direction: row;
      }
      .success-actions .btn { margin-top: 0; }
    }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/dashboard';
  redirectCountdown = 0;
  redirectTimer: any = null;

  // Resend-Verification State
  resending = false;
  resendMessage = '';
  resendError = false;
  resendCooldown = 0;
  resendTimer: any = null;
  registeredEmail = '';

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
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) clearInterval(this.redirectTimer);
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.registerForm.value;

      this.authService.register(formData).subscribe({
        next: () => {
          this.loading = false;
          this.registeredEmail = formData.email;
          this.successMessage = this.translationService.translate('auth.registerSuccess');
          this.startResendCooldown(60);
          this.registerForm.reset();
        },
        error: (error) => {
          this.loading = false;
          const errorMsg = error.error?.message || '';
          
          const emailExistsPatterns = [
            'email already exists',
            'email already registered',
            'already exists',
            'bereits registriert',
            'existiert bereits',
            'already in use',
            'duplicate',
            'constraint'
          ];
          
          const isEmailExists = emailExistsPatterns.some(pattern => 
            errorMsg.toLowerCase().includes(pattern.toLowerCase())
          ) || error.status === 409;

          if (isEmailExists) {
            this.errorMessage = this.translationService.translate('auth.emailAlreadyExists') ||
                               'Diese E-Mail ist bereits registriert.';
            
            this.redirectCountdown = 3;
            this.redirectTimer = setInterval(() => {
              this.redirectCountdown--;
              if (this.redirectCountdown <= 0) {
                clearInterval(this.redirectTimer);
                this.router.navigate(['/login'], {
                  queryParams: { 
                    returnUrl: this.returnUrl,
                    email: formData.email,
                    autoFill: 'true'
                  }
                });
              }
            }, 1000);
          } else {
            this.errorMessage = errorMsg || this.translationService.translate('auth.registerFailed');
          }
        }
      });
    }
  }

  resendVerification(): void {
    if (this.resending || this.resendCooldown > 0 || !this.registeredEmail) return;
    this.resending = true;
    this.resendMessage = '';
    this.resendError = false;

    this.authService.resendVerificationEmail(this.registeredEmail).subscribe({
      next: () => {
        this.resending = false;
        this.resendError = false;
        this.resendMessage = this.translationService.translate('auth.resendSuccess')
          || 'Verifikations-E-Mail wurde erneut gesendet.';
        this.startResendCooldown(60);
      },
      error: (err) => {
        this.resending = false;
        this.resendError = true;
        this.resendMessage = err?.error?.message
          || this.translationService.translate('auth.resendFailed')
          || 'Senden fehlgeschlagen. Bitte später erneut versuchen.';
      }
    });
  }

  private startResendCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: this.returnUrl,
        email: this.registeredEmail,
        autoFill: 'true'
      }
    });
  }
}
