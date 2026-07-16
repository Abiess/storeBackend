import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { CaptchaComponent } from '../../shared/components/captcha.component';
import { passwordMatchValidator, PASSWORD_MIN_LENGTH } from '../../shared/validators/password.validators';
import { PasswordRequirementsComponent } from '../../shared/auth/password-requirements.component';
import { RegistrationSuccessComponent } from '../../shared/auth/registration-success.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    TranslatePipe, 
    CaptchaComponent,
    PasswordRequirementsComponent,
    RegistrationSuccessComponent
  ],
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
        <div class="logo-wrap">
          <a routerLink="/login">
            <img src="assets/images/logo.svg" alt="markt.ma Logo" class="auth-logo" />
          </a>
        </div>
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
              {{ 'profile.passwordMinLength' | translate }} ({{ PASSWORD_MIN_LENGTH }} Zeichen)
            </div>
            
            <!-- Passwort-Anforderungen Anzeige -->
            <app-password-requirements
              [passwordControl]="registerForm.get('password')">
            </app-password-requirements>
          </div>

          <div class="form-group">
            <label for="confirmPassword">{{ 'profile.confirmPassword' | translate }}</label>
            <input 
              id="confirmPassword" 
              type="password" 
              formControlName="confirmPassword" 
              autocomplete="new-password"
              [placeholder]="'profile.confirmPasswordPlaceholder' | translate"
            />
            <div *ngIf="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched" class="error">
              {{ 'auth.passwordRequired' | translate }}
            </div>
            <div *ngIf="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched" class="error">
              {{ 'auth.passwordsDoNotMatch' | translate }}
            </div>
          </div>

          <!-- CAPTCHA Component -->
          <app-captcha 
            *ngIf="captchaEnabled"
            (tokenReceived)="onCaptchaToken($event)"
            (error)="onCaptchaError($event)">
          </app-captcha>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="registerForm.invalid || loading">
            {{ loading ? ('auth.registering' | translate) : ('auth.registerBtn' | translate) }}
          </button>
        </form>

        <!-- Erfolgs-Panel: Hinweis Email-Verifikation + Resend + Login -->
        <app-registration-success
          *ngIf="successMessage"
          [email]="registeredEmail"
          (goToLogin)="goToLogin()">
        </app-registration-success>

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
      padding: 32px 40px 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 460px;
    }

    .logo-wrap {
      text-align: center;
      margin-bottom: 4px;
    }
    .logo-wrap a { display: inline-block; }
    .auth-logo {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }

    @media (max-width: 480px) {
      .auth-card { padding: 24px 18px 32px; }
      .auth-logo { width: 84px; height: 84px; }
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

  // Registrierte E-Mail für Success Panel
  registeredEmail = '';

  // CAPTCHA State
  captchaEnabled = environment.captcha.enabled;
  captchaToken: string | null = null;
  captchaError = '';
  captchaConfigurationError = false;
  @ViewChild(CaptchaComponent) captchaComponent?: CaptchaComponent;
  
  // Password constants (für Template-Zugriff)
  readonly PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private translationService: TranslationService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: passwordMatchValidator() 
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) clearInterval(this.redirectTimer);
  }

  /**
   * CAPTCHA Token empfangen
   * SECURITY: Keine Token-Längen in Production (könnte Fingerprinting ermöglichen)
   */
  onCaptchaToken(token: string): void {
    this.captchaToken = token;
    this.captchaError = '';
    this.captchaConfigurationError = false;
    
    // Nur in Development loggen
    if (!environment.production) {
      const isRealToken = token && token !== 'CAPTCHA_DISABLED_DEV_MODE';
      console.log('[REGISTER] CAPTCHA Token empfangen:', {
        type: isRealToken ? 'REAL' : 'DUMMY',
        length: token?.length ?? 0
      });
    }
  }

  /**
   * CAPTCHA Fehler behandeln
   */
  onCaptchaError(error: string): void {
    this.captchaError = error;
    this.captchaToken = null;
    
    // Konfigurationsfehler = harter Fehler in Production
    if (error === 'CAPTCHA_CONFIGURATION_ERROR') {
      this.captchaConfigurationError = true;
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      // Konfigurationsfehler blockiert Submit in Production
      if (environment.production && this.captchaConfigurationError) {
        this.errorMessage = this.translationService.translate('auth.captchaConfigError') || 
                           'Die Sicherheitsprüfung konnte nicht geladen werden. Bitte versuchen Sie es später erneut.';
        return;
      }

      // Defensive Prüfung: Form muss gültig sein
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();
        console.error('[REGISTER] Form invalid:', this.registerForm.errors);
        return;
      }

      // CRITICAL: Passwörter MÜSSEN übereinstimmen (defensive Prüfung)
      const password = this.registerForm.get('password')?.value;
      const confirmPassword = this.registerForm.get('confirmPassword')?.value;
      
      if (password !== confirmPassword) {
        console.error('❌ SECURITY: Passwörter stimmen nicht überein!');
        this.registerForm.setErrors({ passwordMismatch: true });
        this.registerForm.get('confirmPassword')?.setErrors({ passwordMismatch: true });
        this.registerForm.get('confirmPassword')?.markAsTouched();
        this.errorMessage = this.translationService.translate('auth.passwordsDoNotMatch') || 
                           'Passwords do not match';
        return;
      }

      // CAPTCHA Token vorhanden?
      if (this.captchaEnabled && !this.captchaToken) {
        this.errorMessage = this.translationService.translate('auth.captchaRequired') || 
                           'Please complete the CAPTCHA verification';
        return;
      }

      // WICHTIG: Dummy-Token vom Dev-Mode nicht in Production akzeptieren!
      if (environment.production && this.captchaEnabled && this.captchaToken === 'CAPTCHA_DISABLED_DEV_MODE') {
        console.error('[REGISTER] CRITICAL: Dummy-Token in Production!');
        this.errorMessage = this.translationService.translate('auth.captchaRequired') || 
                           'Please complete the CAPTCHA verification';
        return;
      }

      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = {
        email: this.registerForm.value.email,
        password: password,  // Nur ein Passwort an Backend senden
        lang: this.translationService.currentLang() || 'en',
        captchaToken: this.captchaToken
      };

      this.authService.register(formData).subscribe({
        next: () => {
          this.loading = false;
          this.registeredEmail = formData.email;
          this.successMessage = this.translationService.translate('auth.registrationSuccess') ||
                               'Registration successful! Please check your email to verify your account.';
          
          // WICHTIG: Token nach erfolgreichem Submit löschen und Widget zurücksetzen
          this.resetCaptcha();
          
          // SECURITY: User ist NICHT angemeldet!
          // Kein Token gespeichert, kein automatischer Login.
          // User muss erst Email bestätigen.
        },
        error: (err) => {
          this.loading = false;
          console.error('Registration error:', err);
          
          // WICHTIG: Token nach Fehler löschen und Widget zurücksetzen
          this.resetCaptcha();
          
          if (err.status === 409 && err.error?.error === 'USER_EXISTS') {
            this.errorMessage = this.translationService.translate('auth.emailAlreadyExists') ||
                               'This email address is already registered.';
          } else if (err.status === 400 && err.error?.error === 'CAPTCHA_VALIDATION_FAILED') {
            this.errorMessage = this.translationService.translate('auth.captchaInvalid') ||
                               'CAPTCHA validation failed. Please try again.';
          } else {
            this.errorMessage = err.error?.message ||
                               this.translationService.translate('auth.registrationError') ||
                               'Registration failed. Please try again.';
          }
        }
      });
    }
  }

  /**
   * Reset CAPTCHA Token und Widget nach Submit oder Fehler
   */
  private resetCaptcha(): void {
    this.captchaToken = null;
    if (this.captchaComponent) {
      this.captchaComponent.reset();
    }
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
