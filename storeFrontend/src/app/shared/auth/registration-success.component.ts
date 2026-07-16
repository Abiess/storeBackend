import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Registrierung Erfolgs-Panel
 * 
 * Zeigt nach erfolgreicher Registrierung die "Posteingang prüfen" Ansicht.
 * Mit Resend-Funktionalität und Link zum Login.
 * 
 * WICHTIG: Dieselbe Komponente für Hauptdomain UND Storefront!
 * 
 * Verwendung:
 * ```html
 * <app-registration-success
 *   [email]="registeredEmail"
 *   (goToLogin)="handleGoToLogin()">
 * </app-registration-success>
 * ```
 */
@Component({
  selector: 'app-registration-success',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="success-panel" role="status" aria-live="polite">
      <div class="success-icon">📧</div>
      <h2>{{ 'auth.checkInboxTitle' | translate }}</h2>
      
      <p class="success-text">
        {{ 'auth.registrationSuccess' | translate }}
      </p>
      
      <p class="email-hint" *ngIf="email">
        <strong>{{ email }}</strong>
      </p>
      
      <p class="hint-text">{{ 'auth.checkSpamHint' | translate }}</p>

      <div *ngIf="resendMessage" class="alert" [class.alert-success]="!resendError" [class.alert-error]="resendError">
        {{ resendMessage }}
      </div>

      <div class="success-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          (click)="onResend()" 
          [disabled]="resending || resendCooldown > 0">
          <span *ngIf="!resending && resendCooldown === 0">{{ 'auth.resendVerification' | translate }}</span>
          <span *ngIf="resending">{{ 'auth.resending' | translate }}</span>
          <span *ngIf="!resending && resendCooldown > 0">{{ 'auth.resendIn' | translate }} {{ resendCooldown }}s</span>
        </button>
        <button type="button" class="btn btn-primary" (click)="goToLogin.emit()">
          {{ 'auth.goToLogin' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .success-panel {
      text-align: center;
      animation: fadeIn 0.4s ease;
    }
    
    .success-icon {
      font-size: 56px;
      margin-bottom: 12px;
      animation: pop 0.5s ease;
    }
    
    @keyframes pop {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
    }
    
    .success-panel h2 {
      color: #28a745;
      font-size: 22px;
      margin-bottom: 12px;
    }
    
    .success-text {
      color: #444;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    
    .email-hint {
      color: #667eea;
      font-size: 15px;
      margin: 8px 0;
    }
    
    .hint-text {
      color: #888;
      font-size: 13px;
      margin-bottom: 20px;
    }
    
    .success-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }
    
    @media (min-width: 481px) {
      .success-actions {
        flex-direction: row;
      }
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
    
    .btn-secondary {
      background: #f4f6f9;
      color: #555;
      border: 1px solid #ddd;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #e9ecef;
    }
    
    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .alert-success {
      background: #d4edda;
      color: #155724;
    }
    
    .alert-error {
      background: #f8d7da;
      color: #721c24;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class RegistrationSuccessComponent {
  @Input() email = '';
  @Output() goToLogin = new EventEmitter<void>();
  
  resending = false;
  resendMessage = '';
  resendError = false;
  resendCooldown = 0;
  private resendTimer: any = null;
  
  constructor(
    private authService: AuthService,
    private translationService: TranslationService
  ) {}
  
  onResend(): void {
    if (this.resending || this.resendCooldown > 0 || !this.email) return;
    
    this.resending = true;
    this.resendMessage = '';
    this.resendError = false;
    
    this.authService.resendVerificationEmail(this.email).subscribe({
      next: () => {
        this.resending = false;
        this.resendError = false;
        this.resendMessage = this.translationService.translate('auth.resendSuccess')
          || 'Verifikations-E-Mail wurde erneut gesendet.';
        this.startResendCooldown(60);
      },
      error: (err) => {
        this.resending = false;
        this.resendError = true;
        this.resendMessage = err?.error?.message
          || this.translationService.translate('auth.resendFailed')
          || 'Senden fehlgeschlagen. Bitte später erneut versuchen.';
      }
    });
  }
  
  private startResendCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }
  
  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }
}
