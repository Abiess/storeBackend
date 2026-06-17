import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerProfileService } from '../../core/services/customer-profile.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { PasswordStrengthIndicatorComponent } from '@app/shared/components/password-strength-indicator/password-strength-indicator.component';

@Component({
  selector: 'app-customer-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, PasswordStrengthIndicatorComponent],
  template: `
    <div class="pw-change-wrap">

      <div class="form-head">
        <h1>🔒 {{ 'profile.changePassword' | translate }}</h1>
        <p>{{ 'profile.changePasswordHint' | translate }}</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

        <!-- ── Aktuelles Passwort ── -->
        <div class="field"
             [class.field--error]="cur?.invalid && cur?.touched"
             [class.field--ok]="cur?.valid && cur?.value">
          <label for="cur">{{ 'profile.currentPassword' | translate }}</label>
          <div class="input-row">
            <input
              id="cur"
              [type]="showCurrent ? 'text' : 'password'"
              formControlName="currentPassword"
              [placeholder]="'profile.currentPasswordPlaceholder' | translate"
              autocomplete="current-password"
            />
            <button type="button" class="eye" (click)="showCurrent = !showCurrent">
              <span>{{ showCurrent ? '🙈' : '👁' }}</span>
            </button>
          </div>
          <div class="field-err" *ngIf="cur?.invalid && cur?.touched">
            {{ 'auth.resetPasswordMinLength' | translate }}
          </div>
        </div>

        <!-- ── Neues Passwort ── -->
        <div class="field"
             [class.field--error]="pw?.invalid && pw?.touched"
             [class.field--ok]="pw?.valid && pw?.value">
          <label for="pw">{{ 'profile.newPassword' | translate }}</label>
          <div class="input-row">
            <input
              id="pw"
              [type]="showNew ? 'text' : 'password'"
              formControlName="password"
              [placeholder]="'profile.newPasswordPlaceholder' | translate"
              autocomplete="new-password"
            />
            <button type="button" class="eye" (click)="showNew = !showNew">
              <span>{{ showNew ? '🙈' : '👁' }}</span>
            </button>
          </div>
          <div class="field-err" *ngIf="pw?.invalid && pw?.touched">
            {{ 'auth.resetPasswordMinLength' | translate }}
          </div>

          <!-- Stärke-Anzeige (shared) -->
          <app-password-strength-indicator [password]="pw?.value ?? ''">
          </app-password-strength-indicator>
        </div>

        <!-- ── Passwort bestätigen ── -->
        <div class="field"
             [class.field--error]="form.hasError('passwordMismatch') && cpw?.touched"
             [class.field--ok]="!form.hasError('passwordMismatch') && cpw?.value">
          <label for="cpw">{{ 'profile.confirmPassword' | translate }}</label>
          <div class="input-row">
            <input
              id="cpw"
              [type]="showConfirm ? 'text' : 'password'"
              formControlName="confirmPassword"
              [placeholder]="'profile.confirmPasswordPlaceholder' | translate"
              autocomplete="new-password"
            />
            <button type="button" class="eye" (click)="showConfirm = !showConfirm">
              <span>{{ showConfirm ? '🙈' : '👁' }}</span>
            </button>
          </div>
          <div class="field-err" *ngIf="form.hasError('passwordMismatch') && cpw?.touched">
            {{ 'auth.resetPasswordMismatch' | translate }}
          </div>
          <div class="field-ok" *ngIf="!form.hasError('passwordMismatch') && cpw?.value">
            {{ 'auth.resetPasswordMatch' | translate }}
          </div>
        </div>

        <!-- ── API-Fehler ── -->
        <div *ngIf="errorMessage" class="alert-error" role="alert">
          <span class="alert-icon">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- ── Erfolg ── -->
        <div *ngIf="successMessage" class="alert-success" role="status">
          <span class="alert-icon">🎉</span>
          <span>{{ successMessage }}</span>
        </div>

        <!-- ── Submit ── -->
        <button type="submit" class="btn btn-primary btn-submit"
                [disabled]="form.invalid || loading">
          <span *ngIf="loading" class="btn-spinner"></span>
          <span>{{ loading ? ('common.loading' | translate) : ('profile.changePassword' | translate) }}</span>
        </button>

      </form>

      <!-- ── Sicherheits-Tipps ── -->
      <div class="security-tips">
        <h3>💡 {{ 'profile.securityTips' | translate }}</h3>
        <ul>
          <li>{{ 'profile.tip1' | translate }}</li>
          <li>{{ 'profile.tip2' | translate }}</li>
          <li>{{ 'profile.tip3' | translate }}</li>
          <li>{{ 'profile.tip4' | translate }}</li>
          <li>{{ 'profile.tip5' | translate }}</li>
        </ul>
      </div>

    </div>
  `,
  styles: [`
    .pw-change-wrap { max-width: 520px; }

    /* ── Form Head ── */
    .form-head {
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f0ecff;
    }
    .form-head h1 {
      font-size: 20px;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0 0 6px 0;
      letter-spacing: -0.3px;
    }
    .form-head p { font-size: 14px; color: #777; margin: 0; }

    /* ── Fields ── */
    .field { margin-bottom: 22px; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 7px;
    }

    .input-row {
      position: relative;
      display: flex;
      align-items: center;
    }

    input {
      width: 100%;
      padding: 13px 46px 13px 15px;
      border: 1.5px solid #e0daf5;
      border-radius: 10px;
      font-size: 15px;
      color: #1a1a2e;
      background: #faf9ff;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      outline: none;
      box-sizing: border-box;
      -webkit-appearance: none;
    }
    input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102,126,234,0.12);
      background: #fff;
    }
    .field--error input { border-color: #fc8181; box-shadow: 0 0 0 4px rgba(252,129,129,0.1); }
    .field--ok   input { border-color: #68d391; box-shadow: 0 0 0 4px rgba(104,211,145,0.1); }

    .eye {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.15s;
      font-size: 17px;
      line-height: 1;
      color: #9ca3af;
    }
    .eye:hover { background: rgba(102,126,234,0.08); }

    .field-err { font-size: 12px; color: #e53e3e; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
    .field-ok  { font-size: 12px; color: #38a169; margin-top: 6px; font-weight: 500; }

    /* ── Alerts ── */
    .alert-error, .alert-success {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 13px 16px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 18px;
      line-height: 1.5;
    }
    .alert-error  { background: #fff5f5; border: 1px solid #fed7d7; color: #c53030; }
    .alert-success { background: #f0fff4; border: 1px solid #c6f6d5; color: #276749; }
    .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

    /* ── Button ── */
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      letter-spacing: 0.1px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      box-shadow: 0 4px 15px rgba(102,126,234,0.35);
    }
    .btn-submit { margin-top: 6px; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    .btn:not(:disabled):hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
    .btn:not(:disabled):active { transform: translateY(0); }

    .btn-spinner {
      width: 17px;
      height: 17px;
      border: 2.5px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Security Tips ── */
    .security-tips {
      margin-top: 32px;
      padding: 20px 24px;
      background: #f0f4ff;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .security-tips h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 700;
      color: #374151;
    }
    .security-tips ul {
      margin: 0;
      padding-left: 20px;
      color: #6b7280;
      line-height: 1.8;
      font-size: 13px;
    }
    .security-tips li { margin-bottom: 4px; }

    @media (max-width: 480px) {
      input { font-size: 16px; }
    }
  `]
})
export class CustomerPasswordChangeComponent {

  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  showCurrent = false;
  showNew     = false;
  showConfirm = false;

  get cur() { return this.form.get('currentPassword'); }
  get pw()  { return this.form.get('password'); }
  get cpw() { return this.form.get('confirmPassword'); }

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerProfileService
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup) {
    const pw  = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { currentPassword, password } = this.form.value;

    this.customerService.changePassword({ currentPassword, newPassword: password }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Passwort erfolgreich geändert! 🎉';
        this.form.reset();
        setTimeout(() => { this.successMessage = ''; }, 6000);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Das aktuelle Passwort ist falsch.';
        } else {
          this.errorMessage = err.error?.message || 'Fehler beim Ändern des Passworts.';
        }
      }
    });
  }
}
