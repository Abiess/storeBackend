import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="page">

      <!-- ═══ LINKE BRAND-SEITE (nur Desktop) ═══ -->
      <div class="brand-panel" aria-hidden="true">
        <div class="brand-inner">
          <img src="assets/images/logo.svg" alt="markt.ma" class="brand-logo-img" />
          <div class="brand-illustration">🔐</div>
          <h2 class="brand-title">Sicher &amp; einfach</h2>
          <p class="brand-sub">Dein neues Passwort wird verschlüsselt gespeichert.</p>
          <div class="brand-features">
            <div class="brand-feature">✅ Ende-zu-Ende verschlüsselt</div>
            <div class="brand-feature">✅ Token gilt nur 1 Stunde</div>
            <div class="brand-feature">✅ Automatisch ungültig nach Nutzung</div>
          </div>
        </div>
      </div>

      <!-- ═══ RECHTE FORM-SEITE ═══ -->
      <div class="form-panel">
        <div class="form-inner">

          <!-- Mobile Logo -->
          <div class="mobile-logo">
            <a routerLink="/login">
              <img src="assets/images/logo.svg" alt="markt.ma" class="mobile-logo-img" />
            </a>
          </div>

          <!-- ── Loading State ── -->
          <div *ngIf="validatingToken" class="state-box">
            <div class="pulse-ring"><div class="pulse-dot"></div></div>
            <h2>{{ 'auth.resetPasswordValidating' | translate }}</h2>
            <p>{{ 'auth.resetPasswordValidatingHint' | translate }}</p>
          </div>

          <!-- ── Invalid Token ── -->
          <div *ngIf="!validatingToken && !tokenValid && !successMessage" class="state-box">
            <div class="state-emoji error-icon">⛔</div>
            <h2>{{ 'auth.resetPasswordInvalidTitle' | translate }}</h2>
            <p class="state-text">{{ 'auth.resetPasswordInvalidText' | translate }}</p>
            <a [routerLink]="['/forgot-password']" class="btn btn-primary">
              🔄 {{ 'auth.resetPasswordRequestNew' | translate }}
            </a>
            <a [routerLink]="['/login']" class="link-plain">{{ 'auth.backToLogin' | translate }}</a>
          </div>

          <!-- ── Success State ── -->
          <div *ngIf="successMessage" class="state-box success-box">
            <div class="state-emoji success-bounce">🎉</div>
            <h2>{{ 'auth.resetPasswordSuccessTitle' | translate }}</h2>
            <p class="state-text">{{ successMessage }}</p>
            <a [routerLink]="['/login']" class="btn btn-primary">
              🚀 {{ 'auth.resetPasswordLoginNow' | translate }}
            </a>
          </div>

          <!-- ── Form ── -->
          <ng-container *ngIf="!validatingToken && tokenValid && !successMessage">

            <div class="form-head">
              <h1>{{ 'auth.resetPasswordTitle' | translate }}</h1>
              <p>{{ 'auth.resetPasswordSubtitle' | translate }}</p>
            </div>

            <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" novalidate>

              <!-- Passwort-Feld -->
              <div class="field" [class.field--error]="pw?.invalid && pw?.touched" [class.field--ok]="pw?.valid && pw?.value">
                <label for="password">{{ 'auth.resetPasswordNewLabel' | translate }}</label>
                <div class="input-row">
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    formControlName="password"
                    [placeholder]="'auth.resetPasswordNewPlaceholder' | translate"
                    autocomplete="new-password"
                  />
                  <button type="button" class="eye" (click)="showPassword=!showPassword">
                    <span>{{ showPassword ? '🙈' : '👁' }}</span>
                  </button>
                </div>
                <div class="field-err" *ngIf="pw?.invalid && pw?.touched">
                  {{ 'auth.resetPasswordMinLength' | translate }}
                </div>

                <!-- Stärke-Anzeige -->
                <div class="strength-wrap" *ngIf="pw?.value">
                  <div class="strength-bars">
                    <div class="sb" [class.sb--active]="strengthScore >= 1" [style.background]="strengthScore >= 1 ? strengthColor : ''"></div>
                    <div class="sb" [class.sb--active]="strengthScore >= 2" [style.background]="strengthScore >= 2 ? strengthColor : ''"></div>
                    <div class="sb" [class.sb--active]="strengthScore >= 3" [style.background]="strengthScore >= 3 ? strengthColor : ''"></div>
                    <div class="sb" [class.sb--active]="strengthScore >= 4" [style.background]="strengthScore >= 4 ? strengthColor : ''"></div>
                  </div>
                  <span class="strength-txt" [style.color]="strengthColor">
                    {{ 'auth.strengthLabel' | translate }} {{ strengthLabel | translate }}
                  </span>
                </div>

                <!-- Anforderungs-Checkliste -->
                <ul class="reqs" *ngIf="pw?.value">
                  <li [class.req--ok]="pw!.value?.length >= 6">
                    <span class="req-icon">{{ pw!.value?.length >= 6 ? '✅' : '⬜' }}</span>
                    {{ 'auth.reqMinChars' | translate }}
                  </li>
                  <li [class.req--ok]="pw!.value?.length >= 10">
                    <span class="req-icon">{{ pw!.value?.length >= 10 ? '✅' : '⬜' }}</span>
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
              </div>

              <!-- Bestätigung-Feld -->
              <div class="field" [class.field--error]="resetPasswordForm.hasError('passwordMismatch') && cpw?.touched" [class.field--ok]="!resetPasswordForm.hasError('passwordMismatch') && cpw?.value">
                <label for="confirmPassword">{{ 'auth.resetPasswordConfirmLabel' | translate }}</label>
                <div class="input-row">
                  <input
                    id="confirmPassword"
                    [type]="showConfirm ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    [placeholder]="'auth.resetPasswordConfirmPlaceholder' | translate"
                    autocomplete="new-password"
                  />
                  <button type="button" class="eye" (click)="showConfirm=!showConfirm">
                    <span>{{ showConfirm ? '🙈' : '👁' }}</span>
                  </button>
                </div>
                <div class="field-err" *ngIf="resetPasswordForm.hasError('passwordMismatch') && cpw?.touched">
                  {{ 'auth.resetPasswordMismatch' | translate }}
                </div>
                <div class="field-ok" *ngIf="!resetPasswordForm.hasError('passwordMismatch') && cpw?.value">
                  {{ 'auth.resetPasswordMatch' | translate }}
                </div>
              </div>

              <!-- API-Fehler -->
              <div *ngIf="errorMessage" class="alert-error" role="alert">
                <span class="alert-icon">⚠️</span>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Submit -->
              <button type="submit" class="btn btn-primary btn-submit" [disabled]="resetPasswordForm.invalid || loading">
                <span *ngIf="loading" class="btn-spinner"></span>
                <span>{{ loading ? ('auth.resetPasswordSaving' | translate) : ('auth.resetPasswordSave' | translate) }}</span>
              </button>

            </form>

            <a [routerLink]="['/login']" class="link-plain">{{ 'auth.backToLogin' | translate }}</a>
          </ng-container>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ══════════════════════════════════════
       PAGE LAYOUT – Split Panel
    ══════════════════════════════════════ */
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: row;
    }

    /* ── Brand Panel (links, Desktop only) ── */
    .brand-panel {
      display: none; /* hidden on mobile */
      width: 420px;
      flex-shrink: 0;
      background: linear-gradient(160deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }
    .brand-panel::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 300px; height: 300px;
      background: rgba(255,255,255,0.06);
      border-radius: 50%;
    }
    .brand-panel::after {
      content: '';
      position: absolute;
      bottom: -60px; left: -60px;
      width: 250px; height: 250px;
      background: rgba(255,255,255,0.06);
      border-radius: 50%;
    }
    .brand-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 48px 36px;
      text-align: center;
    }
    .brand-logo-img {
      width: 150px;
      height: 150px;
      object-fit: contain;
      margin-bottom: 24px;
      background: #fff;
      border-radius: 20px;
      padding: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    .brand-illustration {
      font-size: 80px;
      margin-bottom: 28px;
      filter: drop-shadow(0 8px 24px rgba(0,0,0,0.2));
    }
    .brand-title {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 12px;
    }
    .brand-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.75);
      line-height: 1.6;
      margin-bottom: 36px;
    }
    .brand-features { display: flex; flex-direction: column; gap: 10px; width: 100%; }
    .brand-feature {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      color: rgba(255,255,255,0.9);
      text-align: left;
      backdrop-filter: blur(8px);
    }

    /* ── Form Panel (rechts / alles auf Mobile) ── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f4ff;
      padding: 24px 16px;
      min-height: 100vh;
    }
    .form-inner {
      width: 100%;
      max-width: 460px;
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 8px 40px rgba(102,126,234,0.12);
    }

    /* Mobile Logo */
    .mobile-logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .mobile-logo a { display: inline-block; }
    .mobile-logo-img {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }

    /* ══════════════════════════════════════
       STATE BOXES
    ══════════════════════════════════════ */
    .state-box {
      text-align: center;
      padding: 8px 0 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .state-emoji {
      font-size: 56px;
      margin-bottom: 16px;
      line-height: 1;
    }
    .success-bounce { animation: bounce 0.6s cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes bounce {
      0%   { transform: scale(0.3); opacity: 0; }
      60%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
    }
    .state-box h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 10px;
    }
    .state-box p {
      font-size: 14px;
      color: #666;
      line-height: 1.65;
      margin-bottom: 28px;
    }
    .success-box { padding-top: 16px; }

    /* Pulse loader */
    .pulse-ring {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(102,126,234,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      animation: pulseRing 1.4s ease-in-out infinite;
    }
    .pulse-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      animation: pulseDot 1.4s ease-in-out infinite;
    }
    @keyframes pulseRing {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.7; }
    }
    @keyframes pulseDot {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(0.85); }
    }

    /* ══════════════════════════════════════
       FORM HEAD
    ══════════════════════════════════════ */
    .form-head {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f0ecff;
    }
    .form-head h1 {
      font-size: 24px;
      font-weight: 800;
      color: #1a1a2e;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .form-head p { font-size: 14px; color: #777; }

    /* ══════════════════════════════════════
       FIELDS
    ══════════════════════════════════════ */
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

    /* ── Stärke ── */
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
    .sb--active { /* background set via [style] */ }
    .strength-txt { font-size: 12px; font-weight: 600; white-space: nowrap; }

    /* ── Anforderungs-Liste ── */
    .reqs {
      list-style: none;
      margin-top: 12px;
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

    /* ══════════════════════════════════════
       ALERT
    ══════════════════════════════════════ */
    .alert-error {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 13px 16px;
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 10px;
      color: #c53030;
      font-size: 13px;
      margin-bottom: 18px;
      line-height: 1.5;
    }
    .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

    /* ══════════════════════════════════════
       BUTTONS
    ══════════════════════════════════════ */
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
      text-decoration: none;
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

    .link-plain {
      display: block;
      text-align: center;
      margin-top: 18px;
      font-size: 13px;
      color: #7c6fcd;
      text-decoration: none;
      font-weight: 500;
    }
    .link-plain:hover { text-decoration: underline; color: #5a4fcf; }

    /* ══════════════════════════════════════
       RESPONSIVE – Desktop: Brand Panel zeigen
    ══════════════════════════════════════ */
    @media (min-width: 860px) {
      .brand-panel { display: flex; }
      .form-panel {
        background: #f5f4ff;
        padding: 32px 48px;
      }
      .form-inner {
        padding: 44px 40px;
        border-radius: 24px;
      }
      .mobile-logo { display: none; }
    }

    /* ── Small Mobile ── */
    @media (max-width: 480px) {
      .form-panel { padding: 16px 12px; align-items: flex-start; padding-top: 24px; }
      .form-inner { padding: 28px 20px; border-radius: 16px; }
      .form-head h1 { font-size: 20px; }
      .reqs { grid-template-columns: 1fr; }
      input { font-size: 16px; /* verhindert iOS-Zoom */ }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  validatingToken = true;
  tokenValid = false;
  errorMessage = '';
  successMessage = '';
  token: string | null = null;
  showPassword = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.validatingToken = false;
      this.tokenValid = false;
      return;
    }
    this.validateToken(this.token);
  }

  // Shortcuts für Template
  get pw()  { return this.resetPasswordForm.get('password'); }
  get cpw() { return this.resetPasswordForm.get('confirmPassword'); }

  get hasUpperAndLower(): boolean {
    const v = this.pw?.value || '';
    return /[A-Z]/.test(v) && /[a-z]/.test(v);
  }
  get hasNumber(): boolean {
    return /[0-9!@#$%^&*_\-+=]/.test(this.pw?.value || '');
  }

  get strengthScore(): number {
    const v: string = this.pw?.value || '';
    let s = 0;
    if (v.length >= 6)  s++;
    if (v.length >= 10) s++;
    if (this.hasUpperAndLower) s++;
    if (this.hasNumber) s++;
    return s;
  }
  get strengthColor(): string {
    const c = ['#fc8181','#f6ad55','#f6e05e','#68d391'];
    return c[Math.max(0, this.strengthScore - 1)] ?? '#e5e7eb';
  }
  /** Gibt den i18n-Key zurück, der dann im Template per | translate übersetzt wird */
  get strengthLabel(): string {
    const keys = ['auth.strengthWeak','auth.strengthFair','auth.strengthGood','auth.strengthStrong'];
    return keys[Math.max(0, this.strengthScore - 1)] ?? 'auth.strengthWeak';
  }

  passwordMatchValidator(group: FormGroup) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  private validateToken(token: string) {
    this.validatingToken = true;
    this.http.get<{ valid: boolean; message: string }>(
      `${environment.apiUrl}/auth/reset-password/validate`, { params: { token } }
    ).pipe(
      catchError(err => of({ valid: false, message: err.error?.message || 'Token ungültig oder abgelaufen' }))
    ).subscribe(r => {
      this.validatingToken = false;
      this.tokenValid = r.valid;
    });
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      this.loading = true;
      this.errorMessage = '';
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, {
        token: this.token,
        newPassword: this.resetPasswordForm.value.password
      }).pipe(
        catchError(err => of({ error: true, message: err.error?.message || 'Fehler beim Speichern. Bitte erneut versuchen.' }))
      ).subscribe((r: any) => {
        this.loading = false;
        if (r.error) {
          this.errorMessage = r.message;
        } else {
          this.successMessage = r.message || 'Dein Passwort wurde erfolgreich geändert.';
          this.resetPasswordForm.reset();
        }
      });
    }
  }
}
