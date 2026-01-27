      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0077ed;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      width: 100%;
      padding: 0.875rem;
      background: #f5f5f7;
      color: #1d1d1f;
      border: 1px solid #e8e8ed;
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-secondary:hover {
      background: #e8e8ed;
    }

    .btn-link {
      background: none;
      border: none;
      color: #0071e3;
      font-weight: 600;
      font-size: 0.9375rem;
      cursor: pointer;
      padding: 0.5rem;
      transition: opacity 0.3s;
    }

    .btn-link:hover:not(:disabled) {
      opacity: 0.8;
    }

    .btn-link:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1.25rem;
    }

    /* ==================== SPINNER ==================== */
    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ==================== INFO BOX ==================== */
    .info-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      margin-top: 1.5rem;
    }

    .info-icon {
      flex-shrink: 0;
      color: #0071e3;
    }

    .info-box strong {
      display: block;
      margin-bottom: 0.25rem;
      color: #1d1d1f;
      font-size: 0.9375rem;
    }

    .info-box p {
      margin: 0;
      color: #6e6e73;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    /* ==================== RESEND SECTION ==================== */
    .resend-section {
      text-align: center;
      margin: 1rem 0;
      padding: 1rem;
      background: #f5f5f7;
      border-radius: 12px;
    }

    .resend-section p {
      margin: 0;
      color: #6e6e73;
      font-size: 0.9375rem;
    }

    /* ==================== MESSAGES ==================== */
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #fff5f5;
      border: 1px solid #fecaca;
      border-radius: 12px;
      margin-top: 1rem;
      color: #dc2626;
      font-size: 0.9375rem;
      line-height: 1.5;
      animation: shake 0.3s;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .error-icon {
      flex-shrink: 0;
      color: #dc2626;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      margin-top: 1rem;
      color: #16a34a;
      font-size: 0.9375rem;
      line-height: 1.5;
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .success-icon {
      flex-shrink: 0;
      color: #16a34a;
    }

    /* ==================== MOBILE RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .verification-step {
        padding: 1.5rem;
        border-radius: 12px;
      }

      .step-icon {
        font-size: 2.5rem;
      }

      .step-header h3 {
        font-size: 1.25rem;
      }

      .code-input {
        font-size: 1.75rem;
        letter-spacing: 0.3rem;
      }
    }
  `]
})
export class PhoneVerificationComponent {
  @Input() storeId!: number;
  @Output() verified = new EventEmitter<string>(); // Emits verified phone number
  @Output() cancelled = new EventEmitter<void>();

  step: 'phone' | 'code' = 'phone';
  phoneInput = '';
  phoneNumber = '';
  codeInput = '';
  verificationId: number | null = null;
  channel = '';

  sending = false;
  verifying = false;
  errorMessage = '';
  successMessage = '';

  // Resend logic
  canResend = false;
  resendCountdown = 60;
  private resendTimer: any;

  constructor(private http: HttpClient) {}

  isValidPhone(): boolean {
    // Remove spaces and check if it's a valid phone number
    const cleaned = this.phoneInput.replace(/\s/g, '');
    return cleaned.length >= 9 && /^\d+$/.test(cleaned);
  }

  sendVerificationCode(): void {
    if (!this.isValidPhone()) {
      this.errorMessage = 'Bitte geben Sie eine gültige Telefonnummer ein.';
      return;
    }

    this.sending = true;
    this.errorMessage = '';
    
    // Format phone number to E.164
    this.phoneNumber = '+49' + this.phoneInput.replace(/\s/g, '');

    const url = `${environment.publicApiUrl}/phone-verification/send`;
    this.http.post<any>(url, {
      phoneNumber: this.phoneNumber,
      storeId: this.storeId
    }).subscribe({
      next: (response) => {
        this.sending = false;
        if (response.success) {
          this.verificationId = response.verificationId;
          this.channel = response.channel;
          this.successMessage = response.message;
          this.step = 'code';
          this.startResendTimer();
          
          // Auto-focus on code input after a short delay
          setTimeout(() => {
            const input = document.getElementById('verificationCode') as HTMLInputElement;
            if (input) input.focus();
          }, 300);
        } else {
          this.errorMessage = response.error || 'Code konnte nicht gesendet werden.';
        }
      },
      error: (error) => {
        this.sending = false;
        this.errorMessage = error.error?.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
        console.error('Error sending code:', error);
      }
    });
  }

  verifyCode(): void {
    if (this.codeInput.length !== 6) {
      this.errorMessage = 'Bitte geben Sie den vollständigen 6-stelligen Code ein.';
      return;
    }

    this.verifying = true;
    this.errorMessage = '';

    const url = `${environment.publicApiUrl}/phone-verification/verify`;
    this.http.post<any>(url, {
      verificationId: this.verificationId,
      code: this.codeInput
    }).subscribe({
      next: (response) => {
        this.verifying = false;
        if (response.success) {
          this.successMessage = response.message;
          // Emit verified phone number to parent
          setTimeout(() => {
            this.verified.emit(this.phoneNumber);
          }, 1000);
        } else {
          this.errorMessage = response.error || 'Falscher Code.';
          this.codeInput = '';
        }
      },
      error: (error) => {
        this.verifying = false;
        this.errorMessage = error.error?.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
        this.codeInput = '';
        console.error('Error verifying code:', error);
      }
    });
  }

  resendCode(): void {
    this.codeInput = '';
    this.errorMessage = '';
    this.sendVerificationCode();
  }

  changePhoneNumber(): void {
    this.step = 'phone';
    this.codeInput = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.stopResendTimer();
  }

  formatPhoneNumber(phone: string): string {
    // Format +491234567890 to +49 123 456 7890
    if (!phone) return '';
    return phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  }

  private startResendTimer(): void {
    this.canResend = false;
    this.resendCountdown = 60;
    
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResend = true;
        this.stopResendTimer();
      }
    }, 1000);
  }

  private stopResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopResendTimer();
  }
}
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

/**
 * Telefonnummer-Verifizierung für Cash on Delivery
 * 
 * Best Practices:
 * - Einfache UX (max. 1 zusätzlicher Schritt)
 * - WhatsApp > SMS Fallback
 * - Klare Fehlermeldungen
 * - Mobile-First Design
 * - Auto-Focus auf Code-Input
 */
@Component({
  selector: 'app-phone-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="phone-verification-container">
      <!-- Step 1: Telefonnummer eingeben -->
      <div *ngIf="step === 'phone'" class="verification-step">
        <div class="step-header">
          <div class="step-icon">📱</div>
          <h3>Telefonnummer verifizieren</h3>
          <p class="step-description">
            Für Nachnahme-Bestellungen benötigen wir eine verifizierte Telefonnummer,
            um Fake-Bestellungen zu vermeiden.
          </p>
        </div>

        <div class="phone-input-group">
          <label for="phoneNumber">Telefonnummer</label>
          <div class="input-wrapper">
            <span class="country-code">+49</span>
            <input
              id="phoneNumber"
              type="tel"
              [(ngModel)]="phoneInput"
              placeholder="151 23456789"
              (keyup.enter)="sendVerificationCode()"
              [disabled]="sending"
              class="phone-input"
              autocomplete="tel"
            />
          </div>
          <p class="input-hint">Format: +49 151 23456789 (mit Ländervorwahl)</p>
        </div>

        <button
          class="btn-primary"
          (click)="sendVerificationCode()"
          [disabled]="sending || !isValidPhone()"
        >
          <span class="btn-icon" *ngIf="!sending">📤</span>
          <span class="spinner-small" *ngIf="sending"></span>
          {{ sending ? 'Wird gesendet...' : 'Code per WhatsApp/SMS senden' }}
        </button>

        <div class="info-box">
          <svg class="info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9V9h2v6zm0-8H9V5h2v2z" fill="currentColor"/>
          </svg>
          <div>
            <strong>Wie funktioniert's?</strong>
            <p>Sie erhalten einen 6-stelligen Code per WhatsApp oder SMS. Dieser ist 10 Minuten gültig.</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Code eingeben -->
      <div *ngIf="step === 'code'" class="verification-step">
        <div class="step-header">
          <div class="step-icon">🔐</div>
          <h3>Code eingeben</h3>
          <p class="step-description">
            Wir haben einen Code per <strong>{{ channel === 'whatsapp' ? 'WhatsApp' : 'SMS' }}</strong>
            an <strong>{{ formatPhoneNumber(phoneNumber) }}</strong> gesendet.
          </p>
        </div>

        <div class="code-input-group">
          <label for="verificationCode">Verifizierungscode</label>
          <input
            #codeInput
            id="verificationCode"
            type="text"
            [(ngModel)]="codeInput"
            placeholder="000000"
            maxlength="6"
            (keyup.enter)="verifyCode()"
            [disabled]="verifying"
            class="code-input"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="one-time-code"
          />
          <p class="input-hint">6-stelliger Code</p>
        </div>

        <button
          class="btn-primary"
          (click)="verifyCode()"
          [disabled]="verifying || codeInput.length !== 6"
        >
          <span class="btn-icon" *ngIf="!verifying">✓</span>
          <span class="spinner-small" *ngIf="verifying"></span>
          {{ verifying ? 'Wird geprüft...' : 'Code bestätigen' }}
        </button>

        <div class="resend-section">
          <p *ngIf="!canResend">Neuer Code in {{ resendCountdown }}s möglich</p>
          <button
            *ngIf="canResend"
            class="btn-link"
            (click)="resendCode()"
            [disabled]="sending"
          >
            🔄 Code erneut senden
          </button>
        </div>

        <button class="btn-secondary" (click)="changePhoneNumber()">
          ← Telefonnummer ändern
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        <svg class="error-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/>
        </svg>
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-message">
        <svg class="success-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" fill="currentColor"/>
        </svg>
        {{ successMessage }}
      </div>
    </div>
  `,
  styles: [`
    /* ==================== CONTAINER ==================== */
    .phone-verification-container {
      max-width: 500px;
      margin: 0 auto;
    }

    .verification-step {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    /* ==================== HEADER ==================== */
    .step-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .step-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .step-header h3 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1d1d1f;
      letter-spacing: -0.01em;
    }

    .step-description {
      margin: 0;
      color: #6e6e73;
      line-height: 1.5;
      font-size: 0.9375rem;
    }

    /* ==================== PHONE INPUT ==================== */
    .phone-input-group {
      margin-bottom: 1.5rem;
    }

    .phone-input-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #1d1d1f;
      font-size: 0.9375rem;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      background: #f5f5f7;
      border: 2px solid #e8e8ed;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      transition: all 0.3s;
    }

    .input-wrapper:focus-within {
      background: white;
      border-color: #0071e3;
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
    }

    .country-code {
      font-weight: 600;
      color: #1d1d1f;
      margin-right: 0.5rem;
      font-size: 1rem;
    }

    .phone-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      color: #1d1d1f;
      outline: none;
      font-weight: 500;
    }

    .phone-input::placeholder {
      color: #86868b;
    }

    /* ==================== CODE INPUT ==================== */
    .code-input-group {
      margin-bottom: 1.5rem;
    }

    .code-input-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #1d1d1f;
      font-size: 0.9375rem;
    }

    .code-input {
      width: 100%;
      padding: 1rem;
      background: #f5f5f7;
      border: 2px solid #e8e8ed;
      border-radius: 12px;
      font-size: 2rem;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5rem;
      color: #1d1d1f;
      transition: all 0.3s;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .code-input:focus {
      background: white;
      border-color: #0071e3;
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
      outline: none;
    }

    .code-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .input-hint {
      margin: 0.5rem 0 0;
      color: #86868b;
      font-size: 0.8125rem;
    }

    /* ==================== BUTTONS ==================== */
    .btn-primary {
      width: 100%;
      padding: 1rem;
      background: #0071e3;
      color: white;
      border: none;

