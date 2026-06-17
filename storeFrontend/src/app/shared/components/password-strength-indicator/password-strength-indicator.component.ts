import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Wiederverwendbare Passwort-Stärke-Anzeige mit 4 Balken und Anforderungs-Checkliste.
 * Wird in ResetPasswordComponent und CustomerPasswordChangeComponent genutzt.
 *
 * Usage:
 *   <app-password-strength-indicator [password]="passwordControl?.value ?? ''">
 *   </app-password-strength-indicator>
 */
@Component({
  selector: 'app-password-strength-indicator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <ng-container *ngIf="password">

      <!-- ── Stärke-Balken ── -->
      <div class="strength-wrap">
        <div class="strength-bars">
          <div class="sb" [class.sb--active]="score >= 1" [style.background]="score >= 1 ? color : ''"></div>
          <div class="sb" [class.sb--active]="score >= 2" [style.background]="score >= 2 ? color : ''"></div>
          <div class="sb" [class.sb--active]="score >= 3" [style.background]="score >= 3 ? color : ''"></div>
          <div class="sb" [class.sb--active]="score >= 4" [style.background]="score >= 4 ? color : ''"></div>
        </div>
        <span class="strength-txt" [style.color]="color">
          {{ 'auth.strengthLabel' | translate }} {{ labelKey | translate }}
        </span>
      </div>

      <!-- ── Anforderungs-Checkliste ── -->
      <ul class="reqs">
        <li [class.req--ok]="password.length >= 6">
          <span class="req-icon">{{ password.length >= 6 ? '✅' : '⬜' }}</span>
          {{ 'auth.reqMinChars' | translate }}
        </li>
        <li [class.req--ok]="password.length >= 10">
          <span class="req-icon">{{ password.length >= 10 ? '✅' : '⬜' }}</span>
          {{ 'auth.reqMoreChars' | translate }}
        </li>
        <li [class.req--ok]="hasUpperAndLower">
          <span class="req-icon">{{ hasUpperAndLower ? '✅' : '⬜' }}</span>
          {{ 'auth.reqUpperLower' | translate }}
        </li>
        <li [class.req--ok]="hasNumber">
          <span class="req-icon">{{ hasNumber ? '✅' : '⬜' }}</span>
          {{ 'auth.reqNumberSpecial' | translate }}
        </li>
      </ul>

    </ng-container>
  `,
  styles: [`
    /* ── Stärke-Balken ── */
    .strength-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    .strength-bars { display: flex; gap: 5px; flex: 1; }
    .sb {
      flex: 1;
      height: 5px;
      border-radius: 3px;
      background: #e5e7eb;
      transition: background 0.3s;
    }
    .strength-txt { font-size: 12px; font-weight: 600; white-space: nowrap; }

    /* ── Anforderungs-Liste ── */
    .reqs {
      list-style: none;
      margin: 12px 0 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }
    .reqs li {
      font-size: 12px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.2s;
    }
    .reqs li.req--ok { color: #38a169; }
    .req-icon { font-size: 13px; line-height: 1; }

    @media (max-width: 480px) {
      .reqs { grid-template-columns: 1fr; }
    }
  `]
})
export class PasswordStrengthIndicatorComponent {
  @Input() password: string = '';

  get hasUpperAndLower(): boolean {
    return /[A-Z]/.test(this.password) && /[a-z]/.test(this.password);
  }

  get hasNumber(): boolean {
    return /[0-9!@#$%^&*_\-+=]/.test(this.password);
  }

  get score(): number {
    let s = 0;
    if (this.password.length >= 6)  s++;
    if (this.password.length >= 10) s++;
    if (this.hasUpperAndLower) s++;
    if (this.hasNumber) s++;
    return s;
  }

  get color(): string {
    const c = ['#fc8181', '#f6ad55', '#f6e05e', '#68d391'];
    return c[Math.max(0, this.score - 1)] ?? '#e5e7eb';
  }

  /** i18n-Key für das Stärke-Label */
  get labelKey(): string {
    const keys = ['auth.strengthWeak', 'auth.strengthFair', 'auth.strengthGood', 'auth.strengthStrong'];
    return keys[Math.max(0, this.score - 1)] ?? 'auth.strengthWeak';
  }
}

