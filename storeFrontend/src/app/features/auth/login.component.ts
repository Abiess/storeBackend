import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LanguageSwitcherComponent],
  template: `
    <div class="auth-container">
      <div class="language-switcher-wrapper">
        <app-language-switcher></app-language-switcher>
      </div>
      <div class="auth-card">
        <h1>markt.ma Login</h1>
        <p class="subtitle">Melden Sie sich bei Ihrem Store-Dashboard an</p>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">E-Mail</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              placeholder="ihre@email.de"
            />
            <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="error">
              Bitte geben Sie eine gültige E-Mail-Adresse ein
            </div>
          </div>

          <div class="form-group">
            <label for="password">Passwort</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              placeholder="••••••••"
            />
            <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="error">
              Passwort ist erforderlich
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="loginForm.invalid || loading">
            {{ loading ? 'Wird angemeldet...' : 'Anmelden' }}
          </button>
        </form>

        <p class="auth-footer">
          Noch kein Konto? <a [routerLink]="['/register']" [queryParams]="{ returnUrl: returnUrl }">Jetzt registrieren</a>
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
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Speichere returnUrl für Template-Verwendung
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Prüfe auf Fehlerparameter in der URL
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'session_expired') {
        this.errorMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
      } else if (params['error'] === 'auth_required') {
        this.errorMessage = 'Bitte melden Sie sich an, um auf diese Seite zuzugreifen.';
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Prüfe auf returnUrl und leite dorthin weiter
          console.log('🔄 Weiterleitung nach Login zu:', this.returnUrl);
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Angaben.';
        }
      });
    }
  }
}
