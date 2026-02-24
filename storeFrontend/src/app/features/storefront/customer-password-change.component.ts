import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService, PasswordChangeRequest } from '../../core/services/customer-profile.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';

@Component({
  selector: 'app-customer-password-change',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="password-change">
      <h2>{{ 'profile.changePassword' | translate }}</h2>
      <p class="description">{{ 'profile.changePasswordHint' | translate }}</p>

      <form (ngSubmit)="changePassword()" #passwordForm="ngForm">
        <div class="form-group">
          <label for="currentPassword">{{ 'profile.currentPassword' | translate }} {{ 'checkout.required' | translate }}</label>
          <div class="password-input">
            <input
              [type]="showCurrentPassword ? 'text' : 'password'"
              id="currentPassword"
              name="currentPassword"
              [(ngModel)]="passwordRequest.currentPassword"
              required
              minlength="6"
              class="form-control"
              [placeholder]="'profile.currentPasswordPlaceholder' | translate"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showCurrentPassword = !showCurrentPassword">
              {{ showCurrentPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="newPassword">{{ 'profile.newPassword' | translate }} {{ 'checkout.required' | translate }}</label>
          <div class="password-input">
            <input
              [type]="showNewPassword ? 'text' : 'password'"
              id="newPassword"
              name="newPassword"
              [(ngModel)]="passwordRequest.newPassword"
              required
              minlength="6"
              class="form-control"
              [placeholder]="'profile.newPasswordPlaceholder' | translate"
              (ngModelChange)="validatePasswordMatch()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showNewPassword = !showNewPassword">
              {{ showNewPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <small class="form-hint">{{ 'profile.passwordMinLength' | translate }}</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">{{ 'profile.confirmPassword' | translate }} {{ 'checkout.required' | translate }}</label>
          <div class="password-input">
            <input
              [type]="showConfirmPassword ? 'text' : 'password'"
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              required
              minlength="6"
              class="form-control"
              [class.invalid]="confirmPassword && !passwordsMatch"
              [placeholder]="'profile.confirmPasswordPlaceholder' | translate"
              (ngModelChange)="validatePasswordMatch()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showConfirmPassword = !showConfirmPassword">
              {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <small class="form-hint error" *ngIf="confirmPassword && !passwordsMatch">
            ⚠️ {{ 'profile.passwordMismatch' | translate }}
          </small>
          <small class="form-hint success" *ngIf="confirmPassword && passwordsMatch">
            ✅ {{ 'profile.passwordMatch' | translate }}
          </small>
        </div>

        <div class="password-strength" *ngIf="passwordRequest.newPassword">
          <label>{{ 'profile.passwordStrength' | translate }}:</label>
          <div class="strength-bar">
            <div 
              class="strength-indicator" 
              [class]="getPasswordStrengthClass()"
              [style.width.%]="getPasswordStrength()">
            </div>
          </div>
          <small class="strength-label">{{ getPasswordStrengthLabel() }}</small>
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          ✅ {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          ❌ {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="btn-primary" 
            [disabled]="!passwordForm.valid || !passwordsMatch || saving">
            <span *ngIf="!saving">🔒 {{ 'profile.changePassword' | translate }}</span>
            <span *ngIf="saving">⏳ {{ 'common.loading' | translate }}</span>
          </button>
          <button type="button" class="btn-secondary" (click)="resetForm()">
            🔄 {{ 'common.reset' | translate }}
          </button>
        </div>
      </form>

      <div class="security-tips">
        <h3>💡 {{ 'profile.securityTips' | translate }}:</h3>
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
    .password-change {
      max-width: 600px;
    }

    .description {
      color: #666;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .password-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      padding-right: 45px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-control.invalid {
      border-color: #dc3545;
    }

    .toggle-password {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 20px;
      padding: 5px;
      opacity: 0.6;
      transition: opacity 0.3s;
    }

    .toggle-password:hover {
      opacity: 1;
    }

    .form-hint {
      display: block;
      margin-top: 6px;
      font-size: 13px;
      color: #999;
    }

    .form-hint.error {
      color: #dc3545;
    }

    .form-hint.success {
      color: #28a745;
    }

    .password-strength {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .password-strength label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .strength-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .strength-indicator {
      height: 100%;
      transition: width 0.3s, background-color 0.3s;
    }

    .strength-indicator.weak {
      background: #dc3545;
    }

    .strength-indicator.medium {
      background: #ffc107;
    }

    .strength-indicator.strong {
      background: #28a745;
    }

    .strength-label {
      font-size: 13px;
      color: #666;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 30px;
    }

    .security-tips {
      margin-top: 40px;
      padding: 24px;
      background: #f0f4ff;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .security-tips h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #333;
      font-size: 16px;
    }

    .security-tips ul {
      margin: 0;
      padding-left: 24px;
      color: #666;
      line-height: 1.8;
    }

    .security-tips li {
      margin-bottom: 8px;
    }

    @media (max-width: 576px) {
      .form-actions {
        flex-direction: column;
      }

      .form-actions button {
        width: 100%;
      }
    }
  `]
})
export class CustomerPasswordChangeComponent {
  passwordRequest: PasswordChangeRequest = {
    currentPassword: '',
    newPassword: ''
  };
  confirmPassword = '';

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  passwordsMatch = true;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private customerService: CustomerProfileService,
    private translationService: TranslationService
  ) {}

  validatePasswordMatch(): void {
    this.passwordsMatch = !this.confirmPassword ||
                          this.passwordRequest.newPassword === this.confirmPassword;
  }

  getPasswordStrength(): number {
    const password = this.passwordRequest.newPassword;
    if (!password) return 0;

    let strength = 0;

    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    return Math.min(strength, 100);
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) return 'weak';
    if (strength < 70) return 'medium';
    return 'strong';
  }

  getPasswordStrengthLabel(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) return this.translationService.translate('profile.strengthWeak');
    if (strength < 70) return this.translationService.translate('profile.strengthMedium');
    return this.translationService.translate('profile.strengthStrong');
  }

  changePassword(): void {
    if (!this.passwordsMatch) {
      this.errorMessage = this.translationService.translate('profile.passwordMismatch');
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.customerService.changePassword(this.passwordRequest).subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = this.translationService.translate('profile.passwordChangedSuccess');
        this.resetForm();

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.saving = false;
        if (error.status === 401) {
          this.errorMessage = this.translationService.translate('profile.errorWrongCurrentPassword');
        } else {
          this.errorMessage = error.error?.message || this.translationService.translate('profile.errorChangePassword');
        }
        console.error('❌ Fehler beim Ändern des Passworts:', error);
      }
    });
  }

  resetForm(): void {
    this.passwordRequest = {
      currentPassword: '',
      newPassword: ''
    };
    this.confirmPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.passwordsMatch = true;
    this.errorMessage = '';
  }
}
