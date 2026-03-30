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

  ngOnDestroy(): void {
    // Cleanup: Timer clearen wenn Component destroyed wird
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
    }
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
          this.successMessage = this.translationService.translate('auth.registerSuccess');
          // Formular zurücksetzen
          this.registerForm.reset();
        },
        error: (error) => {
          this.loading = false;
          const errorMsg = error.error?.message || '';
          
          // Prüfe ob Email bereits registriert ist
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
          ) || error.status === 409; // 409 = Conflict
          
          if (isEmailExists) {
            // Zeige Nachricht und wechsle zum Login mit den Credentials
            this.errorMessage = this.translationService.translate('auth.emailAlreadyExists') || 
                               'Diese E-Mail ist bereits registriert.';
            
            // Starte Countdown
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
}
