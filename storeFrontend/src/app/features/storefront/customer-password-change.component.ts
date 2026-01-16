import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService, PasswordChangeRequest } from '../../core/services/customer-profile.service';

@Component({
  selector: 'app-customer-password-change',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="password-change">
      <h2>Passwort ändern</h2>
      <p class="description">Ändern Sie Ihr Passwort für mehr Sicherheit</p>

      <form (ngSubmit)="changePassword()" #passwordForm="ngForm">
        <div class="form-group">
          <label for="currentPassword">Aktuelles Passwort *</label>
          <div class="password-input">
            <input
              [type]="showCurrentPassword ? 'text' : 'password'"
              id="currentPassword"
              name="currentPassword"
              [(ngModel)]="passwordRequest.currentPassword"
              required
              minlength="6"
              class="form-control"
              placeholder="Geben Sie Ihr aktuelles Passwort ein"
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
          <label for="newPassword">Neues Passwort *</label>
          <div class="password-input">
            <input
              [type]="showNewPassword ? 'text' : 'password'"
              id="newPassword"
              name="newPassword"
              [(ngModel)]="passwordRequest.newPassword"
              required
              minlength="6"
              class="form-control"
              placeholder="Mindestens 6 Zeichen"
              (ngModelChange)="validatePasswordMatch()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showNewPassword = !showNewPassword">
              {{ showNewPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <small class="form-hint">Das Passwort sollte mindestens 6 Zeichen lang sein</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Neues Passwort bestätigen *</label>
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
              placeholder="Passwort erneut eingeben"
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
            ⚠️ Die Passwörter stimmen nicht überein
          </small>
          <small class="form-hint success" *ngIf="confirmPassword && passwordsMatch">
            ✅ Die Passwörter stimmen überein
          </small>
        </div>

        <div class="password-strength" *ngIf="passwordRequest.newPassword">
          <label>Passwortstärke:</label>
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
            <span *ngIf="!saving">🔒 Passwort ändern</span>
            <span *ngIf="saving">⏳ Wird geändert...</span>
          </button>
          <button type="button" class="btn-secondary" (click)="resetForm()">
            🔄 Zurücksetzen
          </button>
        </div>
      </form>

      <div class="security-tips">
        <h3>💡 Tipps für ein sicheres Passwort:</h3>
        <ul>
          <li>Verwenden Sie mindestens 8 Zeichen</li>
          <li>Kombinieren Sie Groß- und Kleinbuchstaben</li>
          <li>Fügen Sie Zahlen und Sonderzeichen hinzu</li>
          <li>Vermeiden Sie persönliche Informationen</li>
          <li>Nutzen Sie für jeden Account ein anderes Passwort</li>
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

  constructor(private customerService: CustomerProfileService) {}

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
    if (strength < 40) return 'Schwach - Bitte ein sichereres Passwort wählen';
    if (strength < 70) return 'Mittel - Gut, aber kann noch verbessert werden';
    return 'Stark - Sehr sicheres Passwort!';
  }

  changePassword(): void {
    if (!this.passwordsMatch) {
      this.errorMessage = 'Die Passwörter stimmen nicht überein';
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.customerService.changePassword(this.passwordRequest).subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = 'Passwort erfolgreich geändert!';
        this.resetForm();

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.saving = false;
        if (error.status === 401) {
          this.errorMessage = 'Das aktuelle Passwort ist falsch';
        } else {
          this.errorMessage = error.error?.message || 'Fehler beim Ändern des Passworts';
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

