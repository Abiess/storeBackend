import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>markt.ma Registrierung</h1>
        <p class="subtitle">Erstellen Sie Ihren Store in wenigen Minuten</p>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">E-Mail</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              placeholder="ihre@email.de"
            />
            <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="error">
              Bitte geben Sie eine gültige E-Mail-Adresse ein
            </div>
          </div>

          <div class="form-group">
            <label for="password">Passwort</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              placeholder="Mindestens 6 Zeichen"
            />
            <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="error">
              Passwort muss mindestens 6 Zeichen lang sein
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-error">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="alert alert-success">
            {{ successMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="registerForm.invalid || loading">
            {{ loading ? 'Wird registriert...' : 'Konto erstellen' }}
          </button>
        </form>

        <p class="auth-footer">
          Bereits ein Konto? <a routerLink="/login">Jetzt anmelden</a>
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
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.successMessage = 'Registrierung erfolgreich! Sie werden weitergeleitet...';
          setTimeout(() => {
            // FIXED: Prüfe auf returnUrl und leite zurück zum Shop (nicht Dashboard!)
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
            console.log('🔄 Weiterleitung nach Registrierung zu:', returnUrl);
            this.router.navigate([returnUrl]);
          }, 1500);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        }
      });
    }
  }
}
