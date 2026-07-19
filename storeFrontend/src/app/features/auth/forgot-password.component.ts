import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { HCaptchaService } from '@app/core/services/hcaptcha.service';

declare const hcaptcha: any; // hCaptcha global API

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="auth-container">
      <div class="auth-card">

        <!-- Logo + Titel -->
        <div class="card-header">
          <a routerLink="/login" class="logo-link">
            <img src="assets/images/logo.svg" alt="markt.ma" class="auth-logo" />
          </a>
          <h1>{{ 'auth.forgotPasswordTitle' | translate }}</h1>
          <p class="subtitle">{{ 'auth.forgotPasswordSubtitle' | translate }}</p>
        </div>

        <!-- Success-State -->
        <div *ngIf="successMessage" class="success-state">
          <div class="success-icon">✅</div>
          <h2>{{ 'auth.forgotPasswordSuccessTitle' | translate }}</h2>
          <p>{{ successMessage }}</p>
          <a [routerLink]="['/login']" class="btn btn-primary back-btn">{{ 'auth.backToLogin' | translate }}</a>
        </div>

        <!-- Formular -->
        <form *ngIf="!successMessage" [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">{{ 'auth.forgotPasswordEmailLabel' | translate }}</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              [placeholder]="'auth.forgotPasswordEmailPlaceholder' | translate"
              [class.input-error]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
            />
            <div *ngIf="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched" class="error">
              {{ 'auth.forgotPasswordEmailInvalid' | translate }}
            </div>
          </div>

          <!-- hCAPTCHA Widget -->
          <div *ngIf="captchaEnabled" class="form-group captcha-container">
            <div 
              id="forgot-password-captcha" 
              class="h-captcha" 
              [attr.data-sitekey]="captchaSiteKey"
              [attr.data-callback]="'onForgotPasswordCaptchaVerified'"
              [attr.data-expired-callback]="'onForgotPasswordCaptchaExpired'"
              [attr.data-error-callback]="'onForgotPasswordCaptchaError'">
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            <span class="alert-icon">⚠️</span>
            {{ errorMessage }}
          </div>

          <button 
            type="submit" 
            class="btn btn-primary" 
            [disabled]="!isFormValid() || loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? ('auth.forgotPasswordSending' | translate) : ('auth.forgotPasswordSend' | translate) }}
          </button>

          <div class="back-link">
            <a [routerLink]="['/login']">{{ 'auth.backToLogin' | translate }}</a>
          </div>
        </form>
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
      padding: 20px;
    }

    .auth-card {
      background: #fff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      width: 100%;
      max-width: 420px;
      animation: cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-link { display: inline-block; }

    .auth-logo {
      width: 110px;
      height: 110px;
      object-fit: contain;
      margin-bottom: 8px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    @media (max-width: 480px) {
      .auth-card { padding: 28px 20px; }
      .auth-logo { width: 90px; height: 90px; }
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
    }

    /* Success */
    .success-state {
      text-align: center;
      padding: 8px 0 16px;
    }
    .success-icon { font-size: 52px; margin-bottom: 12px; }
    .success-state h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; }
    .success-state p { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px; }

    .back-btn { display: inline-block; text-decoration: none; }

    /* Form */
    .form-group { margin-bottom: 20px; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #444;
      margin-bottom: 6px;
    }

    input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
      background: #fafafa;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
      background: #fff;
    }
    input.input-error { border-color: #e53e3e; }

    .error {
      font-size: 12px;
      color: #e53e3e;
      margin-top: 5px;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .alert-error {
      background: #fff5f5;
      border: 1px solid #fed7d7;
      color: #c53030;
    }
    .alert-icon { font-size: 16px; }

    .btn {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn:not(:disabled):hover { opacity: 0.92; transform: translateY(-1px); }
    .btn:not(:disabled):active { transform: translateY(0); }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .back-link {
      text-align: center;
      margin-top: 18px;
    }
    .back-link a {
      font-size: 13px;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link a:hover { text-decoration: underline; }

    /* hCAPTCHA Container */
    .captcha-container {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
  `]
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  captchaToken = '';
  captchaEnabled = environment.captcha.enabled;
  captchaSiteKey = environment.captcha.siteKey;
  private captchaWidgetId: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private hcaptchaService: HCaptchaService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Globale Callbacks für hCaptcha
    (window as any).onForgotPasswordCaptchaVerified = (token: string) => this.onCaptchaVerified(token);
    (window as any).onForgotPasswordCaptchaExpired = () => this.onCaptchaExpired();
    (window as any).onForgotPasswordCaptchaError = (error: any) => this.onCaptchaError(error);
  }

  ngAfterViewInit() {
    // hCaptcha Widget rendern wenn aktiviert
    if (this.captchaEnabled && typeof hcaptcha !== 'undefined') {
      setTimeout(() => {
        try {
          this.captchaWidgetId = hcaptcha.render('forgot-password-captcha', {
            sitekey: this.captchaSiteKey,
            callback: 'onForgotPasswordCaptchaVerified',
            'expired-callback': 'onForgotPasswordCaptchaExpired',
            'error-callback': 'onForgotPasswordCaptchaError'
          });
        } catch (e) {
          console.error('hCaptcha render error:', e);
        }
      }, 100);
    }
  }

  /**
   * CAPTCHA verifiziert
   */
  onCaptchaVerified(token: string) {
    this.ngZone.run(() => {
      this.captchaToken = token;
      this.errorMessage = '';
      
      this.forgotPasswordForm.updateValueAndValidity({
        emitEvent: true
      });
      
      this.cdr.detectChanges();
    });
  }

  /**
   * CAPTCHA Fehler
   */
  onCaptchaError(error: any) {
    this.ngZone.run(() => {
      console.error('hCaptcha error:', error);
      this.captchaToken = '';
      this.errorMessage = 'CAPTCHA-Fehler. Bitte laden Sie die Seite neu.';
      
      this.forgotPasswordForm.updateValueAndValidity({
        emitEvent: true
      });
      
      this.cdr.detectChanges();
    });
  }

  /**
   * CAPTCHA abgelaufen
   */
  onCaptchaExpired() {
    this.ngZone.run(() => {
      this.captchaToken = '';
      this.errorMessage = 'CAPTCHA abgelaufen. Bitte erneut verifizieren.';
      
      this.forgotPasswordForm.updateValueAndValidity({
        emitEvent: true
      });
      
      this.cdr.detectChanges();
    });
  }

  /**
   * CAPTCHA zurücksetzen
   */
  private resetCaptcha() {
    this.captchaToken = '';
    if (this.captchaEnabled && typeof hcaptcha !== 'undefined' && this.captchaWidgetId !== undefined) {
      try {
        hcaptcha.reset(this.captchaWidgetId);
      } catch (e) {
        console.error('hCaptcha reset error:', e);
      }
    }
  }

  /**
   * Formular-Validierung inkl. CAPTCHA
   */
  isFormValid(): boolean {
    const formValid = this.forgotPasswordForm.valid;
    const captchaValid = !this.captchaEnabled || (this.captchaEnabled && this.captchaToken.length > 0);
    return formValid && captchaValid;
  }

  onSubmit() {
    if (!this.isFormValid()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      email: this.forgotPasswordForm.value.email,
      captchaToken: this.captchaToken
    };

    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, payload)
      .pipe(
        catchError(error => {
          return of({
            error: true,
            message: this.hcaptchaService.getSafeErrorMessage(error)
          });
        })
      )
      .subscribe((response: any) => {
        this.loading = false;
        if (response.error) {
          this.errorMessage = response.message;
          // CAPTCHA zurücksetzen bei Fehler
          this.resetCaptcha();
        } else {
          this.successMessage = response.message || 'Falls diese E-Mail-Adresse registriert ist, wurde ein Reset-Link gesendet. Bitte prüfe auch deinen Spam-Ordner.';
          this.forgotPasswordForm.reset();
          this.resetCaptcha();
        }
      });
  }
}
