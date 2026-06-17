import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">

        <!-- Icon + Titel -->
        <div class="card-header">
          <div class="icon-wrap">
            <span class="icon">🔑</span>
          </div>
          <h1>Passwort vergessen?</h1>
          <p class="subtitle">Gib deine E-Mail-Adresse ein – wir schicken dir einen Reset-Link.</p>
        </div>

        <!-- Success-State -->
        <div *ngIf="successMessage" class="success-state">
          <div class="success-icon">✅</div>
          <h2>E-Mail gesendet!</h2>
          <p>{{ successMessage }}</p>
          <a [routerLink]="['/login']" class="btn btn-primary back-btn">Zurück zum Login</a>
        </div>

        <!-- Formular -->
        <form *ngIf="!successMessage" [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">E-Mail-Adresse</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="deine@email.de"
              [class.input-error]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
            />
            <div *ngIf="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched" class="error">
              Bitte gib eine gültige E-Mail-Adresse ein.
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            <span class="alert-icon">⚠️</span>
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="forgotPasswordForm.invalid || loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? 'Wird gesendet…' : 'Reset-Link senden' }}
          </button>

          <div class="back-link">
            <a [routerLink]="['/login']">← Zurück zum Login</a>
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
  `]
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.value.email;

      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email })
        .pipe(
          catchError(error => {
            return of({
              error: true,
              message: error.error?.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.'
            });
          })
        )
        .subscribe((response: any) => {
          this.loading = false;
          if (response.error) {
            this.errorMessage = response.message;
          } else {
            this.successMessage = response.message || 'Falls diese E-Mail-Adresse registriert ist, wurde ein Reset-Link gesendet. Bitte prüfe auch deinen Spam-Ordner.';
            this.forgotPasswordForm.reset();
          }
        });
    }
  }
}
