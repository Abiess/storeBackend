import { Component, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { CaptchaComponent } from '../../shared/components/captcha.component';
import { passwordMatchValidator, PASSWORD_MIN_LENGTH } from '../../shared/validators/password.validators';
import { emailAvailabilityValidator } from '../../shared/validators/email-availability.validator';
import { RegistrationErrorHandler } from '../../shared/auth/registration-error-handler.service';
import { PasswordRequirementsComponent } from '../../shared/auth/password-requirements.component';
import { RegistrationSuccessComponent } from '../../shared/auth/registration-success.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-storefront-auth-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    TranslatePipe, 
    CaptchaComponent,
    PasswordRequirementsComponent,
    RegistrationSuccessComponent
  ],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <button class="btn-close" (click)="close.emit()">✕</button>
        
        <h2>{{ isLogin ? ('common.login' | translate) : ('header.register' | translate) }}</h2>
        
        <div *ngIf="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
        
        <!-- Registrierung erfolgreich: Success Panel anzeigen -->
        <app-registration-success
          *ngIf="!isLogin && registrationSuccess"
          [email]="registeredEmail"
          (goToLogin)="handleGoToLogin()">
        </app-registration-success>
        
        <!-- Formular anzeigen wenn NICHT erfolgreich registriert -->
        <form [formGroup]="authForm" (ngSubmit)="onSubmit()" *ngIf="!registrationSuccess">
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
              placeholder="••••••••••••"
            />
            <div *ngIf="authForm.get('password')?.invalid && authForm.get('password')?.touched" class="error">
              {{ 'profile.passwordMinLength' | translate }} ({{ PASSWORD_MIN_LENGTH }} Zeichen)
            </div>
            
            <!-- Passwort-Anforderungen NUR bei Registrierung anzeigen -->
            <app-password-requirements
              *ngIf="!isLogin"
              [passwordControl]="authForm.get('password')">
            </app-password-requirements>
          </div>
          
          <!-- Passwort wiederholen NUR bei Registrierung -->
          <div class="form-group" *ngIf="!isLogin">
            <label for="confirmPassword">{{ 'profile.confirmPassword' | translate }}</label>
            <input 
              id="confirmPassword" 
              type="password" 
              formControlName="confirmPassword"
              placeholder="••••••••••••"
            />
            <div *ngIf="authForm.get('confirmPassword')?.invalid && authForm.get('confirmPassword')?.touched" class="error">
              {{ 'auth.passwordRequired' | translate }}
            </div>
            <div *ngIf="authForm.hasError('passwordMismatch') && authForm.get('confirmPassword')?.touched" class="error">
              {{ 'auth.passwordsDoNotMatch' | translate }}
            </div>
          </div>
          
          <!-- CAPTCHA NUR bei Registrierung UND nur wenn Formular ausgefüllt -->
          <app-captcha 
            *ngIf="!isLogin && captchaEnabled && shouldShowCaptcha"
            (tokenReceived)="onCaptchaToken($event)"
            (error)="onCaptchaError($event)">
          </app-captcha>
          
          <!-- Hinweis warum CAPTCHA noch nicht angezeigt wird (nur wenn Felder fehlen) -->
          <div class="info-message" *ngIf="!isLogin && captchaEnabled && !shouldShowCaptcha && authForm.touched">
            <span class="info-icon">ℹ️</span>
            {{ 'common.completFormFirst' | translate }}
          </div>
          
          <button type="submit" class="btn btn-primary" [disabled]="isSubmitDisabled">
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
  registrationSuccess = false;
  registeredEmail = '';
  
  // CAPTCHA State
  captchaEnabled = environment.captcha.enabled;
  captchaToken: string | null = null;
  captchaError = '';
  @ViewChild(CaptchaComponent) captchaComponent?: CaptchaComponent;
  
  // Password constants (für Template-Zugriff)
  readonly PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private translationService: TranslationService,
    private errorHandler: RegistrationErrorHandler
  ) {
    this.authForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', 
        [Validators.required, Validators.email],
        !this.isLogin ? [emailAvailabilityValidator()] : []  // Async validator nur bei Registrierung
      ],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmPassword: [''] // Wird nur bei Registrierung validiert
    }, { 
      validators: !this.isLogin ? passwordMatchValidator() : null 
    });
  }
  
  /**
   * CAPTCHA anzeigen wenn:
   * - Alle Felder ausgefüllt sind (auch wenn noch pending/validierend)
   * - Passwort-Regeln erfüllt
   * - Passwörter stimmen überein
   * 
   * WICHTIG: NICHT warten bis async Email-Validator fertig ist!
   * Sonst wird CAPTCHA nie angezeigt während Email geprüft wird.
   */
  get shouldShowCaptcha(): boolean {
    if (this.isLogin) return false;
    
    const emailControl = this.authForm.get('email');
    const passwordControl = this.authForm.get('password');
    const confirmControl = this.authForm.get('confirmPassword');
    
    // Email: Ausgefüllt und formal gültig (nicht auf async validator warten!)
    const emailFilled = emailControl?.value && 
                       !emailControl?.hasError('required') && 
                       !emailControl?.hasError('email');
    
    // Passwort: Ausgefüllt und mindestens 12 Zeichen
    const passwordValid = passwordControl?.value && 
                         passwordControl.value.length >= PASSWORD_MIN_LENGTH;
    
    // Bestätigung: Ausgefüllt
    const confirmFilled = confirmControl?.value;
    
    // Passwörter stimmen überein
    const passwordsMatch = this.authForm.hasError('passwordMismatch') !== true;
    
    return emailFilled && passwordValid && confirmFilled && passwordsMatch;
  }
  
  /**
   * Submit-Button nur aktiv wenn:
   * - Form gültig (inkl. async validators)
   * - NICHT loading
   * - Bei Registrierung: CAPTCHA gelöst
   */
  get isSubmitDisabled(): boolean {
    if (this.loading) return true;
    
    // Bei Registrierung: CAPTCHA muss gelöst sein wenn angezeigt
    if (!this.isLogin && this.captchaEnabled) {
      if (this.shouldShowCaptcha && !this.captchaToken) {
        return true;
      }
    }
    
    // Form muss gültig sein (warte auf async validators)
    if (this.authForm.invalid) return true;
    if (this.authForm.pending) return true;
    
    return false;
  }

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
    this.captchaToken = null;
    this.registrationSuccess = false;
    
    // Form neu erstellen mit korrekten Validatoren
    const currentEmail = this.authForm.get('email')?.value;
    this.authForm = this.createForm();
    this.authForm.patchValue({ email: currentEmail });
    
    // CAPTCHA zurücksetzen
    if (this.captchaComponent) {
      this.captchaComponent.reset();
    }
  }

  /**
   * CAPTCHA Token empfangen
   */
  onCaptchaToken(token: string): void {
    this.captchaToken = token;
    this.captchaError = '';
    
    if (!environment.production) {
      const isRealToken = token && token !== 'CAPTCHA_DISABLED_DEV_MODE';
      console.log('[STOREFRONT AUTH] CAPTCHA Token empfangen:', {
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
    console.error('[STOREFRONT AUTH] CAPTCHA Error:', error);
  }

  onSubmit(): void {
    if (this.authForm.invalid) {
      // Markiere alle Felder als touched um Fehler anzuzeigen
      Object.keys(this.authForm.controls).forEach(key => {
        this.authForm.get(key)?.markAsTouched();
      });
      return;
    }

    // CAPTCHA Token vorhanden bei Registrierung?
    if (!this.isLogin && this.captchaEnabled && !this.captchaToken) {
      this.errorMessage = this.translationService.translate('auth.captchaRequired') || 
                         'Please complete the CAPTCHA verification';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formData = {
      email: this.authForm.value.email,
      password: this.authForm.value.password,
      lang: this.translationService.currentLang() || 'en',
      captchaToken: this.captchaToken // Wichtig: Token mitsenden bei Registrierung
    };

    const authObservable = this.isLogin
      ? this.authService.login({ email: formData.email, password: formData.password })
      : this.authService.register(formData);

    authObservable.subscribe({
      next: (response) => {
        this.loading = false;
        
        if (this.isLogin) {
          // Bei Login: Direkt schließen und success emiten
          console.log('✅ Login erfolgreich:', response);
          this.success.emit();
          this.close.emit();
        } else {
          // Bei Registrierung: Success-Panel anzeigen
          console.log('✅ Registrierung erfolgreich:', response);
          this.registrationSuccess = true;
          this.registeredEmail = formData.email;
          // NICHT schließen - Success-Panel bleibt im Dialog!
        }
      },
      error: (error) => {
        console.error('❌ Authentifizierungsfehler:', error);
        this.handleRegistrationError(error);
      }
    });
  }

  /**
   * Wird vom Success-Panel aufgerufen
   */
  handleGoToLogin(): void {
    this.registrationSuccess = false;
    this.isLogin = true;
    this.authForm.reset();
    this.authForm = this.createForm();
  }
  
  /**
   * ZENTRALE FEHLERBEHANDLUNG
   * 
   * - Parsed Backend-Fehler
   * - Setzt CAPTCHA zurück
   * - Erhält Formularwerte
   * - Zeigt benutzerfreundliche Meldungen
   */
  private handleRegistrationError(error: any): void {
    this.loading = false;
    
    // Parse error mit zentralem Handler
    const registrationError = this.errorHandler.parseError(error);
    
    // CAPTCHA zurücksetzen nach JEDEM Fehler
    this.resetCaptcha();
    
    // Fehlermeldung anzeigen
    this.errorMessage = this.errorHandler.getDefaultMessage(registrationError.code);
    
    // Spezielle Behandlung für EMAIL_ALREADY_EXISTS
    if (registrationError.code === 'EMAIL_ALREADY_EXISTS') {
      // Setze Fehler direkt am Email-Control (überschreibt async validator)
      const emailControl = this.authForm.get('email');
      if (emailControl) {
        emailControl.setErrors({
          ...emailControl.errors,
          emailTaken: true
        });
        emailControl.markAsTouched();
      }
    }
    
    // Hinweis-Meldung hinzufügen (wenn vorhanden)
    const hint = this.errorHandler.getHintMessage(registrationError.code);
    if (hint) {
      this.errorMessage += ' ' + hint;
    }
    
    // Form NICHT zurücksetzen - Benutzer soll nur CAPTCHA neu lösen!
    // Email, Passwort, etc. bleiben erhalten
  }

  /**
   * Reset CAPTCHA Token und Widget nach Submit oder Fehler
   */
  private resetCaptcha(): void {
    this.captchaToken = null;
    if (this.captchaComponent) {
      // Kleiner Delay damit das CAPTCHA sich sauber zurücksetzen kann
      setTimeout(() => {
        this.captchaComponent?.reset();
      }, 100);
    }
  }
}

