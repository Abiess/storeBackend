import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelegramService, MtprotoStatus, ChannelInfo } from '@app/core/services/telegram.service';

type Step = 'credentials' | 'verify-code' | 'channels' | 'import';

/**
 * Telegram MTProto Channel Importer.
 *
 * Klar getrennt vom Bot-Token-Feature:
 *   DIESES FEATURE  = Channels LESEN (api_id + api_hash von my.telegram.org)
 *   Bot-Settings    = Benachrichtigungen SENDEN (Bot Token)
 *
 * Flow:
 *   1. api_id + api_hash + Telefonnummer eingeben
 *   2. Code vom Telegram-App eingeben
 *   3. Channels aus dem Account auswählen
 *   4. Import auslösen → Produkt-Entwürfe werden erstellt
 */
@Component({
  selector: 'app-telegram-mtproto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mtproto-container">

      <!-- HEADER -->
      <div class="mtproto-header">
        <div class="header-icon">📡</div>
        <div>
          <h2>Telegram Channel Importer</h2>
          <p>
            Verbinde deinen persönlichen Telegram-Account um aus beliebigen Channels
            (auch ohne Bot-Mitgliedschaft) Produkte zu importieren.
          </p>
        </div>
        <div class="auth-badge" [class.authed]="status?.sessionValid">
          {{ status?.sessionValid ? '✅ Verbunden: ' + status?.phone : '🔴 Nicht verbunden' }}
        </div>
      </div>

      <!-- STEP INDICATOR -->
      <div class="step-indicator" *ngIf="!status?.sessionValid">
        <div class="step" [class.active]="currentStep === 'credentials'" [class.done]="stepDone('credentials')">
          <span class="step-num">1</span><span class="step-label">Zugangsdaten</span>
        </div>
        <div class="step-line"></div>
        <div class="step" [class.active]="currentStep === 'verify-code'" [class.done]="stepDone('verify-code')">
          <span class="step-num">2</span><span class="step-label">Code bestätigen</span>
        </div>
        <div class="step-line"></div>
        <div class="step" [class.active]="currentStep === 'channels'">
          <span class="step-num">3</span><span class="step-label">Channels wählen</span>
        </div>
      </div>

      <!-- ─────────────────────────────── -->
      <!-- SCHRITT 1: Credentials -->
      <!-- ─────────────────────────────── -->
      <div class="step-card" *ngIf="!status?.sessionValid && currentStep === 'credentials'">
        <h3>🔑 Schritt 1: Telegram-Zugangsdaten</h3>

        <div class="info-box">
          <strong>Wo bekomme ich api_id und api_hash?</strong><br>
          Gehe auf <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>
          → <em>API development tools</em> → App-Daten notieren.<br>
          Diese Daten gehören zu deinem persönlichen Account und sind privat.
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>API ID <span class="required">*</span></label>
            <input type="number" [(ngModel)]="apiId" name="apiId"
              placeholder="12345678" class="form-input" [disabled]="sendingCode">
          </div>
          <div class="form-group">
            <label>API Hash <span class="required">*</span></label>
            <input type="password" [(ngModel)]="apiHash" name="apiHash"
              placeholder="abc123..." class="form-input" autocomplete="off"
              [disabled]="sendingCode">
          </div>
        </div>

        <div class="form-group">
          <label>Telefonnummer <span class="required">*</span></label>
          <input type="tel" [(ngModel)]="phone" name="phone"
            placeholder="+491234567890" class="form-input" [disabled]="sendingCode">
          <small>International mit Ländervorwahl (z.B. +49 für Deutschland)</small>
        </div>

        <div class="action-bar">
          <button class="btn-primary" (click)="requestCode()"
            [disabled]="sendingCode || !apiId || !apiHash || !phone">
            {{ sendingCode ? '⏳ Sende Code...' : '📱 Code senden' }}
          </button>
        </div>

        <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>
      </div>

      <!-- ─────────────────────────────── -->
      <!-- SCHRITT 2: Code eingeben -->
      <!-- ─────────────────────────────── -->
      <div class="step-card" *ngIf="!status?.sessionValid && currentStep === 'verify-code'">
        <h3>📨 Schritt 2: Code bestätigen</h3>

        <div class="info-box success">
          Code wurde an <strong>{{ phone }}</strong> gesendet!<br>
          Öffne Telegram auf deinem Gerät und gib den empfangenen Code ein.
        </div>

        <!-- Countdown-Timer -->
        <div class="countdown-bar" [class.warn]="codeSecondsLeft <= 30 && codeSecondsLeft > 0" [class.expired]="codeSecondsLeft === 0">
          <span *ngIf="codeSecondsLeft > 0">
            ⏱️ Code läuft ab in: <strong>{{ formatCountdown(codeSecondsLeft) }}</strong>
          </span>
          <span *ngIf="codeSecondsLeft === 0">
            ⚠️ Code abgelaufen – bitte neuen Code anfordern!
          </span>
        </div>

        <div class="form-group">
          <label>Telegram-Code <span class="required">*</span></label>
          <input type="text" [(ngModel)]="verifyCode" name="code"
            placeholder="12345" class="form-input code-input"
            maxlength="10" autofocus [disabled]="verifying">
        </div>

        <div class="form-group" *ngIf="needs2FA">
          <label>2FA-Passwort</label>
          <input type="password" [(ngModel)]="twoFaPassword" name="twoFaPassword"
            placeholder="Cloud-Passwort" class="form-input" [disabled]="verifying">
          <small>Nur erforderlich wenn du 2-Faktor-Authentifizierung aktiviert hast.</small>
        </div>

        <div class="action-bar">
          <button class="btn-secondary" (click)="goBackToCredentials()" [disabled]="verifying">
            ← Zurück
          </button>
          <button class="btn-resend" (click)="requestCode()" [disabled]="sendingCode || verifying">
            {{ sendingCode ? '⏳ Sende...' : '🔄 Neuen Code senden' }}
          </button>
          <button class="btn-primary" (click)="verify()"
            [disabled]="verifying || !verifyCode || codeSecondsLeft === 0">
            {{ verifying ? '⏳ Verifiziere...' : '✅ Bestätigen' }}
          </button>
        </div>

        <label class="checkbox-row" style="margin-top: 12px">
          <input type="checkbox" [(ngModel)]="needs2FA"> 2FA-Passwort benötigt
        </label>

        <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>
      </div>

      <!-- ─────────────────────────────── -->
      <!-- VERBUNDEN: Channel-Auswahl + Import -->
      <!-- ─────────────────────────────── -->
      <div *ngIf="status?.sessionValid">

        <!-- Account-Info + Logout -->
        <div class="connected-bar">
          <div>
            <strong>📱 {{ status?.phone }}</strong>
            <small>Telegram-Account verbunden</small>
          </div>
          <button class="btn-danger-sm" (click)="logout()" [disabled]="loggingOut">
            {{ loggingOut ? '...' : '🚪 Abmelden' }}
          </button>
        </div>

        <!-- Channels laden -->
        <div class="section-box">
          <div class="section-title">
            <h3>📋 Channels auswählen</h3>
            <button class="btn-sm" (click)="loadChannels()" [disabled]="loadingChannels">
              {{ loadingChannels ? '⏳' : '🔄' }} Channels laden
            </button>
          </div>
          <p class="section-desc">
            Wähle die Channels aus denen Produkte importiert werden sollen.
            Der Import erstellt Produkt-<strong>Entwürfe</strong> für deine manuelle Review.
          </p>

          <!-- Channel-Liste -->
          <div class="channel-list" *ngIf="availableChannels.length > 0">
            <div class="channel-item"
              *ngFor="let ch of availableChannels"
              [class.selected]="isWatched(ch)"
              (click)="toggleChannel(ch)">
              <div class="channel-check">{{ isWatched(ch) ? '✅' : '⬜' }}</div>
              <div class="channel-info">
                <strong>{{ ch.title }}</strong>
                <small *ngIf="ch.username">&#64;{{ ch.username }}</small>
                <small *ngIf="ch.members_count">{{ ch.members_count | number }} Mitglieder</small>
              </div>
            </div>
          </div>

          <div class="empty-channels" *ngIf="!loadingChannels && availableChannels.length === 0">
            <p>Noch keine Channels geladen. Klicke "Channels laden".</p>
          </div>

          <!-- Manuell eingeben -->
          <div class="manual-input">
            <label>Oder manuell eingeben:</label>
            <div class="manual-row">
              <input type="text" [(ngModel)]="manualChannel" placeholder="&#64;username oder -100123456789"
                class="form-input" (keyup.enter)="addManualChannel()">
              <button class="btn-sm" (click)="addManualChannel()" [disabled]="!manualChannel">
                + Hinzufügen
              </button>
            </div>
          </div>

          <!-- Ausgewählte Channels -->
          <div class="watched-channels" *ngIf="watchedChannels.length > 0">
            <h4>📌 Ausgewählte Channels ({{ watchedChannels.length }})</h4>
            <div class="watched-tag" *ngFor="let ch of watchedChannels">
              <span>{{ ch }}</span>
              <button class="tag-remove" (click)="removeWatched(ch)">×</button>
            </div>
          </div>

          <div class="action-bar">
            <button class="btn-primary" (click)="saveChannels()" [disabled]="savingChannels || watchedChannels.length === 0">
              {{ savingChannels ? '⏳ Speichern...' : '💾 Channels speichern' }}
            </button>
          </div>
          <div class="feedback success" *ngIf="channelSaveSuccess">✅ Channels gespeichert!</div>
        </div>

        <!-- Import -->
        <div class="section-box" *ngIf="watchedChannels.length > 0">
          <h3>📥 Produkte importieren</h3>
          <p class="section-desc">
            Importiert neue Posts aus den ausgewählten Channels als <strong>Produkt-Entwürfe</strong>.
            Jeder Import holt nur <em>neue</em> Posts seit dem letzten Import (inkrementell).
          </p>

          <div class="import-limit-row">
            <label>Max. Posts pro Channel:</label>
            <input type="number" [(ngModel)]="importLimit" min="1" max="100"
              class="form-input form-input-small">
            <button class="btn-sm" (click)="saveLimit()" [disabled]="savingLimit">
              {{ savingLimit ? '...' : 'Speichern' }}
            </button>
          </div>

          <div class="action-bar" style="margin-top: 16px">
            <button class="btn-import" (click)="importAll()" [disabled]="importing">
              <span *ngIf="!importing">🚀 Alle Channels jetzt importieren</span>
              <span *ngIf="importing"><span class="spinner-inline"></span> Importiere...</span>
            </button>
          </div>

          <div class="feedback error" *ngIf="importError">❌ {{ importError }}</div>

          <!-- Ergebnis -->
          <div class="result-card" *ngIf="importResults">
            <h4>Import abgeschlossen</h4>
            <div *ngFor="let entry of importResultEntries">
              <div class="result-channel">
                <strong>{{ entry.channel }}</strong>
                <span class="result-stats-sm">
                  ✅ {{ entry.result.imported }} importiert •
                  ⏩ {{ entry.result.skipped }} übersprungen •
                  ❌ {{ entry.result.errors }} Fehler
                </span>
              </div>
            </div>
            <p class="review-hint">
              ⚠️ Importierte Produkte sind <strong>Entwürfe</strong> und warten auf deine Review unter
              <em>Produkte → Status: Entwurf</em>.
            </p>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .mtproto-container { max-width: 720px; }
    .mtproto-header {
      display: flex; align-items: flex-start; gap: 16px;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .header-icon { font-size: 36px; line-height: 1; }
    .mtproto-header h2 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
    .mtproto-header p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; }
    .auth-badge {
      margin-left: auto; padding: 6px 14px; border-radius: 8px;
      background: #fef2f2; color: #b91c1c; font-size: 13px; font-weight: 600;
      white-space: nowrap; align-self: center;
    }
    .auth-badge.authed { background: #f0fdf4; color: #166534; }

    /* Step Indicator */
    .step-indicator {
      display: flex; align-items: center; gap: 0; margin-bottom: 24px;
    }
    .step {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #9ca3af;
    }
    .step.active { color: #667eea; font-weight: 700; background: #eff6ff; }
    .step.done { color: #059669; }
    .step-num {
      width: 24px; height: 24px; border-radius: 50%; border: 2px solid currentColor;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;
    }
    .step-line { flex: 1; height: 2px; background: #e5e7eb; min-width: 20px; }

    /* Cards */
    .step-card, .section-box {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 20px 24px; margin-bottom: 16px;
    }
    .step-card h3, .section-box h3 {
      font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 16px;
    }
    .info-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 12px 16px; font-size: 13px; color: #1e40af; margin-bottom: 16px;
      line-height: 1.6;
    }
    .info-box a { color: #2563eb; }
    .info-box.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .required { color: #ef4444; }
    .form-input {
      width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 14px; color: #111827; background: #fff; box-sizing: border-box;
    }
    .form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,.15); }
    .form-input:disabled { background: #f3f4f6; color: #9ca3af; }
    .form-input-small { width: 100px; }
    .code-input { font-size: 20px; letter-spacing: 6px; text-align: center; }
    .form-group small { display: block; font-size: 12px; color: #6b7280; margin-top: 4px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; cursor: pointer; }
    .action-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }

    /* Countdown */
    .countdown-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 8px; font-size: 13px;
      background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;
      margin-bottom: 14px; transition: background .3s, color .3s;
    }
    .countdown-bar.warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .countdown-bar.expired { background: #fef2f2; border-color: #fecaca; color: #b91c1c; font-weight: 700; }

    /* Buttons */
    .btn-primary, .btn-secondary, .btn-sm, .btn-import, .btn-danger-sm, .btn-resend {
      padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px;
      font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s;
    }
    .btn-primary:active, .btn-import:active { transform: scale(.97); }
    .btn-primary { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-resend { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 10px 16px; }
    .btn-resend:disabled { opacity: .5; cursor: not-allowed; }
    .btn-sm { padding: 7px 14px; font-size: 13px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-sm:disabled { opacity: .5; cursor: not-allowed; }
    .btn-import {
      background: linear-gradient(135deg,#667eea,#764ba2); color: #fff;
      padding: 12px 28px; font-size: 15px;
    }
    .btn-import:disabled { opacity: .5; cursor: not-allowed; }
    .btn-danger-sm { padding: 6px 12px; font-size: 12px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .btn-danger-sm:disabled { opacity: .5; }

    /* Connected bar */
    .connected-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
      padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .connected-bar strong { display: block; font-size: 14px; color: #166534; }
    .connected-bar small { font-size: 12px; color: #4ade80; display: block; }

    /* Section title */
    .section-title {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px; flex-wrap: wrap; gap: 8px;
    }
    .section-title h3 { margin: 0; }
    .section-desc { font-size: 13px; color: #6b7280; margin: 0 0 16px; line-height: 1.5; }

    /* Channels */
    .channel-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .channel-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
      cursor: pointer; transition: border-color .15s, background .15s;
    }
    .channel-item.selected { border-color: #667eea; background: #eff6ff; }
    .channel-item:hover { border-color: #a5b4fc; }
    .channel-check { font-size: 18px; }
    .channel-info strong { display: block; font-size: 14px; color: #111827; }
    .channel-info small { font-size: 12px; color: #6b7280; display: block; }
    .empty-channels { text-align: center; padding: 20px; color: #9ca3af; font-size: 13px; }
    .manual-input { margin-top: 12px; }
    .manual-input label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
    .manual-row { display: flex; gap: 8px; align-items: center; }
    .manual-row .form-input { flex: 1; }

    /* Watched tags */
    .watched-channels { margin-top: 16px; }
    .watched-channels h4 { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px; }
    .watched-tag {
      display: inline-flex; align-items: center; gap: 6px;
      background: #667eea; color: #fff; border-radius: 20px;
      padding: 4px 12px; margin: 3px; font-size: 13px;
    }
    .tag-remove { background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; }

    /* Import result */
    .import-limit-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .import-limit-row label { font-size: 13px; font-weight: 600; color: #374151; }
    .result-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .result-card h4 { font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .result-channel { margin-bottom: 10px; }
    .result-channel strong { display: block; font-size: 14px; }
    .result-stats-sm { font-size: 12px; color: #6b7280; }
    .review-hint { font-size: 13px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }

    /* Feedback */
    .feedback { padding: 10px 16px; border-radius: 8px; font-size: 14px; margin-top: 12px; }
    .feedback.error   { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .feedback.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

    .spinner-inline {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .7s linear infinite; margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .step-label { display: none; }
    }
  `]
})
export class TelegramMtprotoComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  // Auth State
  currentStep: Step = 'credentials';
  status: MtprotoStatus | null = null;

  // Step 1
  apiId: number | null = null;
  apiHash = '';
  phone = '';
  sendingCode = false;

  // Step 2
  verifyCode = '';
  twoFaPassword = '';
  needs2FA = false;
  verifying = false;

  // Countdown: Telegram-Codes laufen nach ~120s ab
  codeSecondsLeft = 0;
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CODE_TTL = 120; // Sekunden

  // Channels
  availableChannels: ChannelInfo[] = [];
  watchedChannels: string[] = [];
  manualChannel = '';
  loadingChannels = false;
  savingChannels = false;
  channelSaveSuccess = false;

  // Import
  importLimit = 50;
  savingLimit = false;
  importing = false;
  importResults: Record<string, any> | null = null;
  importError = '';

  // Misc
  errorMsg = '';
  loggingOut = false;

  constructor(private telegramService: TelegramService) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  // ── Countdown-Timer ───────────────────────────────────────────────────────

  private startCountdown(): void {
    this.stopCountdown();
    this.codeSecondsLeft = this.CODE_TTL;
    this._countdownInterval = setInterval(() => {
      if (this.codeSecondsLeft > 0) {
        this.codeSecondsLeft--;
      } else {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }

  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Zurück zu Schritt 1 – leert Code-Feld damit kein alter Code versehentlich abgeschickt wird */
  goBackToCredentials(): void {
    this.currentStep = 'credentials';
    this.verifyCode = '';
    this.twoFaPassword = '';
    this.needs2FA = false;
    this.errorMsg = '';
    this.stopCountdown();
    this.codeSecondsLeft = 0;
  }

  private loadStatus(): void {
    this.telegramService.mtprotoStatus(this.storeId).subscribe({
      next: s => {
        this.status = s;
        this.importLimit = s.importLimit || 50;
        if (s.watchedChannels) {
          try { this.watchedChannels = JSON.parse(s.watchedChannels); } catch { }
        }
      },
      error: () => { this.status = null; }
    });
  }

  private extractSeconds(msg: string): number {
    const match = msg.match(/(\d+)\s*Sekunden/i) || msg.match(/(\d+)\s*seconds/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ── Step 1: Code senden ──────────────────────────────────────────────────

  requestCode(): void {
    this.errorMsg = '';
    this.sendingCode = true;
    // WICHTIG: alten Code und Timer immer leeren – verhindert dass abgelaufener Code abgeschickt wird
    this.verifyCode = '';
    this.twoFaPassword = '';
    this.needs2FA = false;
    this.stopCountdown();
    this.codeSecondsLeft = 0;

    this.telegramService.mtprotoRequestCode(this.storeId, this.apiId!, this.apiHash, this.phone).subscribe({
      next: () => {
        this.currentStep = 'verify-code';
        this.sendingCode = false;
        // Countdown starten – Telegram-Codes laufen nach ~120s ab
        this.startCountdown();
      },
      error: err => {
        this.sendingCode = false;
        const status = err.status;
        const msg = err.error?.message || err.error?.error || err.error?.detail || err.message || 'Fehler beim Senden des Codes';

        if (status === 429) {
          // Sekunden aus Fehlermeldung extrahieren und lesbar anzeigen
          const seconds = this.extractSeconds(msg);
          if (seconds > 3600) {
            const h = Math.ceil(seconds / 3600);
            this.errorMsg = `⏳ Zu viele Versuche. Telegram hat diese Nummer für ~${h} Stunden gesperrt. Bitte morgen erneut versuchen.`;
          } else if (seconds > 60) {
            const m = Math.ceil(seconds / 60);
            this.errorMsg = `⏳ Zu viele Versuche. Bitte ${m} Minuten warten.`;
          } else if (seconds > 0) {
            this.errorMsg = `⏳ Zu viele Versuche. Bitte ${seconds} Sekunden warten.`;
          } else {
            this.errorMsg = `⏳ ${msg}`;
          }
        } else if (status === 403) {
          this.errorMsg = `🚫 ${msg}`;
        } else if (status === 0 || !status) {
          this.errorMsg = '🔌 Scraper nicht erreichbar – bitte kurz warten und erneut versuchen.';
        } else {
          this.errorMsg = `❌ ${msg}`;
        }
        console.error('[Telegram Auth] requestCode Fehler:', err);
      }
    });
  }

  // ── Step 2: Code verifizieren ────────────────────────────────────────────

  verify(): void {
    this.errorMsg = '';
    this.verifying = true;
    const pw = this.needs2FA ? this.twoFaPassword : undefined;
    this.telegramService.mtprotoVerifyCode(this.storeId, this.verifyCode, pw).subscribe({
      next: () => {
        this.verifying = false;
        this.loadStatus();
      },
      error: err => {
        this.verifying = false;
        const errorCode = err.error?.error;
        const msg = err.error?.message || err.error?.detail || err.error?.error || 'Falscher Code';

        // 410: Code abgelaufen → automatisch zurück zu Schritt 1
        if (err.status === 410 || errorCode === 'CODE_EXPIRED' ||
            msg.toLowerCase().includes('abgelaufen') || msg.toLowerCase().includes('expired')) {
          this.goBackToCredentials();
          this.errorMsg = '⏱️ Der Code ist abgelaufen. Bitte fordere einen neuen Code an.';
          return;
        }

        // 401: 2FA erforderlich
        if (err.status === 401 || errorCode === 'TWO_FA_REQUIRED' ||
            msg.includes('2FA') || msg.includes('password') || msg.includes('Passwort')) {
          this.needs2FA = true;
          this.errorMsg = '🔐 Zwei-Faktor-Authentifizierung aktiv – bitte Passwort eingeben.';
          return;
        }

        this.errorMsg = msg;
      }
    });
  }

  // ── Channels ─────────────────────────────────────────────────────────────

  loadChannels(): void {
    this.loadingChannels = true;
    this.telegramService.mtprotoListChannels(this.storeId).subscribe({
      next: res => {
        this.availableChannels = res.channels || [];
        this.loadingChannels = false;
      },
      error: err => {
        this.errorMsg = err.error?.detail || 'Fehler beim Laden der Channels';
        this.loadingChannels = false;
      }
    });
  }

  isWatched(ch: ChannelInfo): boolean {
    const username = ch.username ? `@${ch.username}` : String(ch.id);
    return this.watchedChannels.includes(username);
  }

  toggleChannel(ch: ChannelInfo): void {
    const id = ch.username ? `@${ch.username}` : String(ch.id);
    const idx = this.watchedChannels.indexOf(id);
    if (idx >= 0) this.watchedChannels.splice(idx, 1);
    else this.watchedChannels.push(id);
  }

  addManualChannel(): void {
    const ch = this.manualChannel.trim();
    if (!ch || this.watchedChannels.includes(ch)) return;
    this.watchedChannels.push(ch);
    this.manualChannel = '';
  }

  removeWatched(ch: string): void {
    this.watchedChannels = this.watchedChannels.filter(c => c !== ch);
  }

  saveChannels(): void {
    this.savingChannels = true;
    this.channelSaveSuccess = false;
    this.telegramService.mtprotoUpdateWatchedChannels(this.storeId, this.watchedChannels).subscribe({
      next: () => {
        this.savingChannels = false;
        this.channelSaveSuccess = true;
        setTimeout(() => this.channelSaveSuccess = false, 3000);
      },
      error: () => { this.savingChannels = false; }
    });
  }

  // ── Import ───────────────────────────────────────────────────────────────

  saveLimit(): void {
    this.savingLimit = true;
    this.telegramService.mtprotoUpdateConfig(this.storeId, { importLimit: this.importLimit }).subscribe({
      next: () => { this.savingLimit = false; },
      error: () => { this.savingLimit = false; }
    });
  }

  importAll(): void {
    this.importing = true;
    this.importError = '';
    this.importResults = null;

    this.telegramService.mtprotoImportAll(this.storeId).subscribe({
      next: results => {
        this.importResults = results;
        this.importing = false;
      },
      error: err => {
        this.importError = err.error?.detail || err.error?.message || 'Import fehlgeschlagen';
        this.importing = false;
      }
    });
  }

  get importResultEntries(): { channel: string; result: any }[] {
    if (!this.importResults) return [];
    return Object.entries(this.importResults).map(([channel, result]) => ({ channel, result }));
  }

  // ── Misc ─────────────────────────────────────────────────────────────────

  logout(): void {
    this.loggingOut = true;
    this.telegramService.mtprotoLogout(this.storeId).subscribe({
      next: () => {
        this.status = null;
        this.loggingOut = false;
        this.currentStep = 'credentials';
        this.watchedChannels = [];
      },
      error: () => { this.loggingOut = false; }
    });
  }

  stepDone(step: Step): boolean {
    const order: Step[] = ['credentials', 'verify-code', 'channels', 'import'];
    return order.indexOf(this.currentStep) > order.indexOf(step);
  }
}

