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
    <!-- ── Redirect-Toast (oben rechts, prominente Animation) ── -->
    <div class="redirect-toast" *ngIf="redirectCountdown > 0" role="alert" aria-live="assertive">
      <div class="toast-icon">🔔</div>
      <div class="toast-body">
        <div class="toast-title">E-Mail bereits registriert</div>
        <div class="toast-msg">Weiterleitung zum Login in <strong>{{ redirectCountdown }}s</strong> …</div>
        <div class="toast-bar-track">
          <div class="toast-bar-fill" [style.width.%]="(3 - redirectCountdown) / 3 * 100"></div>
        </div>
      </div>
      <div class="toast-ring">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="19"
                  fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
          <circle cx="22" cy="22" r="19"
                  fill="none" stroke="#fff" stroke-width="3"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="119"
                  [attr.stroke-dashoffset]="119 * (redirectCountdown / 3)"
                  class="toast-svg-arc"/>
        </svg>
        <span class="toast-ring-num">{{ redirectCountdown }}</span>
      </div>
    </div>

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

    /* ──────────────────────────────────────────
       REDIRECT TOAST (oben rechts, fixed)
    ────────────────────────────────────────── */
    :host {
      display: contents;
    }

    .redirect-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 14px 18px;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(102,126,234,0.45), 0 2px 8px rgba(0,0,0,0.15);
      min-width: 280px;
      max-width: 360px;
      animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(120%) scale(0.85); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast-icon {
      font-size: 1.6rem;
      flex-shrink: 0;
      animation: bellRing 0.6s ease 0.4s both;
    }

    @keyframes bellRing {
      0%,100% { transform: rotate(0); }
      20%      { transform: rotate(-20deg); }
      40%      { transform: rotate(20deg); }
      60%      { transform: rotate(-12deg); }
      80%      { transform: rotate(8deg); }
    }

    .toast-body {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 0.875rem;
      font-weight: 700;
      margin-bottom: 2px;
      white-space: nowrap;
    }

    .toast-msg {
      font-size: 0.8rem;
      opacity: 0.9;
      line-height: 1.3;
      margin-bottom: 6px;
    }

    .toast-bar-track {
      height: 3px;
      background: rgba(255,255,255,0.25);
      border-radius: 2px;
      overflow: hidden;
    }

    .toast-bar-fill {
      height: 100%;
      background: #fff;
      border-radius: 2px;
      transition: width 1s linear;
    }

    /* Ring-Timer */
    .toast-ring {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .toast-svg-arc {
      transform-origin: center;
      transform: rotate(-90deg);
      transition: stroke-dashoffset 1s linear;
    }

    .toast-ring-num {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 800;
    }

    /* === Responsive === */
    @media (max-width: 480px) {
      .redirect-toast {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: unset;
        max-width: unset;
      }
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

      const formData = {
        ...this.registerForm.value,
        lang: this.translationService.currentLang() || 'en'
      };

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
