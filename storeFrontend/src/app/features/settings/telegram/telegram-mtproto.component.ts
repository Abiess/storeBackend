import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TelegramService, MtprotoStatus, ChannelInfo, TelegramSyncSettings } from '@app/core/services/telegram.service';

type Step = 'credentials' | 'verify-code' | 'channels' | 'import';

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
          <p>Verbinde deinen Telegram-Account um aus beliebigen Channels Produkte zu importieren.</p>
        </div>
        <div class="auth-badge" [class.authed]="status?.sessionValid">
          {{ status?.sessionValid ? '✅ Verbunden: ' + status?.phone : '🔴 Nicht verbunden' }}
        </div>
      </div>

      <!-- STEP INDICATOR -->
      <div class="step-indicator" *ngIf="!status?.sessionValid">
        <div class="step" [class.active]="currentStep === 'credentials'" [class.done]="stepDone('credentials')">
          <span class="step-num">1</span><span class="step-label">Telefonnummer</span>
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

      <!-- ─── SCHRITT 1: Telefonnummer ─── -->
      <div class="step-card" *ngIf="!status?.sessionValid && currentStep === 'credentials'">
        <h3>📱 Schritt 1: Telegram-Login</h3>

        <!-- Standard-Flow (Plattform-App) -->
        <div *ngIf="platformAppAvailable !== false && !advancedMode">
          <div class="info-box">
            Gib deine Telegram-Telefonnummer ein – du erhältst dann einen Code in der Telegram-App.
          </div>

          <div class="form-group">
            <label>Telefonnummer <span class="required">*</span></label>
            <input type="tel" [(ngModel)]="phone" name="phone"
              placeholder="+491234567890" class="form-input" [disabled]="sendingCode">
            <small>International mit Ländervorwahl (z.B. +49 für Deutschland)</small>
          </div>

          <div class="action-bar">
            <button class="btn-primary" (click)="requestCode()"
              [disabled]="sendingCode || !phone">
              {{ sendingCode ? '⏳ Wird gesendet...' : '📱 Code senden' }}
            </button>
          </div>

          <!-- Advanced Mode Umschalter -->
          <div class="advanced-toggle">
            <button class="btn-link" (click)="advancedMode = true">
              ⚙️ Eigene Telegram-App verwenden (Advanced)
            </button>
          </div>
        </div>

        <!-- Advanced Mode / Kein Plattform-App -->
        <div *ngIf="advancedMode || platformAppAvailable === false">
          <div class="info-box" *ngIf="platformAppAvailable === false">
            <strong>Keine Plattform-App konfiguriert.</strong><br>
            Erstelle deine eigene App auf
            <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>
            → <em>API development tools</em>.
          </div>
          <div class="info-box" *ngIf="advancedMode && platformAppAvailable !== false">
            <strong>Advanced Mode:</strong> Du verwendest eigene API-Credentials.
            <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>
            → <em>API development tools</em> → App-Daten notieren.
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
                placeholder="abc123..." class="form-input" autocomplete="off" [disabled]="sendingCode">
            </div>
          </div>
          <div class="form-group">
            <label>Telefonnummer <span class="required">*</span></label>
            <input type="tel" [(ngModel)]="phone" name="phone"
              placeholder="+491234567890" class="form-input" [disabled]="sendingCode">
          </div>

          <div class="action-bar">
            <button *ngIf="advancedMode && platformAppAvailable !== false"
                    class="btn-secondary" (click)="advancedMode = false" [disabled]="sendingCode">
              ← Standard-Modus
            </button>
            <button class="btn-primary" (click)="requestCode()"
              [disabled]="sendingCode || !phone || !apiId || !apiHash">
              {{ sendingCode ? '⏳ Wird gesendet...' : '📱 Code senden' }}
            </button>
          </div>
        </div>

        <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>
      </div>

      <!-- ─── SCHRITT 2: Code ─── -->
      <div class="step-card" *ngIf="!status?.sessionValid && currentStep === 'verify-code'">
        <h3>📨 Schritt 2: Code bestätigen</h3>

        <div class="info-box success">
          Code wurde an <strong>{{ phone }}</strong> gesendet!<br>
          Öffne Telegram und gib den empfangenen Code ein.
        </div>

        <div class="countdown-bar"
             [class.warn]="codeSecondsLeft <= 30 && codeSecondsLeft > 0"
             [class.expired]="codeSecondsLeft === 0">
          <span *ngIf="codeSecondsLeft > 0">⏱️ Läuft ab in: <strong>{{ formatCountdown(codeSecondsLeft) }}</strong></span>
          <span *ngIf="codeSecondsLeft === 0">⚠️ Code abgelaufen – bitte neuen Code anfordern!</span>
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
        </div>

        <div class="action-bar">
          <button class="btn-secondary" (click)="goBackToCredentials()" [disabled]="verifying">← Zurück</button>
          <button class="btn-resend" (click)="requestCode()" [disabled]="sendingCode || verifying">
            {{ sendingCode ? '⏳ Sende...' : '🔄 Neuen Code senden' }}
          </button>
          <button class="btn-primary" (click)="verify()"
            [disabled]="verifying || !verifyCode || codeSecondsLeft === 0">
            {{ verifying ? '⏳ Verifiziere...' : '✅ Bestätigen' }}
          </button>
        </div>

        <label class="checkbox-row" style="margin-top:12px">
          <input type="checkbox" [(ngModel)]="needs2FA"> 2FA-Passwort benötigt
        </label>

        <div class="feedback error" *ngIf="errorMsg">❌ {{ errorMsg }}</div>
      </div>

      <!-- ─── SCHRITT 3 – Connecting (kurze Übergangsphase) ─── -->
      <div class="step-card connecting-card" *ngIf="!status?.sessionValid && currentStep === 'channels'">
        <div class="connecting-anim">
          <span class="connecting-icon">📡</span>
          <div class="connecting-dots"><span></span><span></span><span></span></div>
        </div>
        <h3>Verbindung wird hergestellt…</h3>
        <p style="color:#6b7280;font-size:13px;margin:0">
          Dein Telegram-Account wird verbunden. Einen Moment bitte.
        </p>
      </div>

      <!-- ─── VERBUNDEN ─── -->
      <div *ngIf="status?.sessionValid">
        <div class="connected-bar">
          <div>
            <strong>📱 {{ status?.phone }}</strong>
            <small>Telegram-Account verbunden</small>
          </div>
          <button class="btn-danger-sm" (click)="logout()" [disabled]="loggingOut">
            {{ loggingOut ? '...' : '🚪 Abmelden' }}
          </button>
        </div>

        <div class="section-box">
          <div class="section-title">
            <h3>📋 Channels auswählen</h3>
            <button class="btn-sm" (click)="loadChannels()" [disabled]="loadingChannels">
              {{ loadingChannels ? '⏳' : '🔄' }} Channels laden
            </button>
          </div>

          <div class="channel-list" *ngIf="availableChannels.length > 0">
            <div class="channel-item" *ngFor="let ch of availableChannels"
              [class.selected]="isWatched(ch)" (click)="toggleChannel(ch)">
              <div class="channel-check">{{ isWatched(ch) ? '✅' : '⬜' }}</div>
              <div class="channel-info">
                <strong>{{ ch.title }}</strong>
                <small *ngIf="ch.username">&#64;{{ ch.username }}</small>
                <small *ngIf="ch.members_count">{{ ch.members_count | number }} Mitglieder</small>
              </div>
            </div>
          </div>

          <!-- Lade-Spinner beim Laden -->
          <div class="channels-loading" *ngIf="loadingChannels">
            <span class="spinner-inline" style="border-color:rgba(102,126,234,.3);border-top-color:#667eea;width:20px;height:20px;"></span>
            <span style="font-size:13px;color:#6b7280">Lade deine Telegram-Channels…</span>
          </div>

          <!-- Leer-Zustand mit besserem Hinweis -->
          <div class="empty-channels" *ngIf="!loadingChannels && availableChannels.length === 0">
            <div class="empty-channels-icon">📋</div>
            <p><strong>Keine Channels gefunden</strong></p>
            <p style="font-size:12px;color:#9ca3af;margin:4px 0 0">
              Falls du Channels hast, klicke "🔄 Channels laden". Oder füge einen Channel manuell ein.
            </p>
          </div>

          <div class="manual-input">
            <label>Oder manuell eingeben:</label>
            <div class="manual-row">
              <input type="text" [(ngModel)]="manualChannel" placeholder="&#64;username oder -100123456789"
                class="form-input" (keyup.enter)="addManualChannel()">
              <button class="btn-sm" (click)="addManualChannel()" [disabled]="!manualChannel">+ Hinzufügen</button>
            </div>
          </div>

          <div class="watched-channels" *ngIf="watchedChannels.length > 0">
            <h4>📌 Ausgewählte Channels ({{ watchedChannels.length }})</h4>
            <div class="watched-tag" *ngFor="let ch of watchedChannels">
              <span>{{ ch }}</span>
              <button class="tag-remove" (click)="removeWatched(ch)">×</button>
            </div>
          </div>

          <div class="action-bar">
            <button class="btn-primary" (click)="saveChannels()" [disabled]="savingChannels || watchedChannels.length === 0">
              {{ savingChannels ? '⏳' : '💾' }} Channels speichern
            </button>
          </div>
          <div class="feedback success" *ngIf="channelSaveSuccess">✅ Channels gespeichert!</div>
        </div>

        <div class="section-box" *ngIf="watchedChannels.length > 0">
          <h3>📥 Produkte importieren</h3>
          <p class="section-desc">Importiert neue Posts aus den ausgewählten Channels als <strong>Produkt-Entwürfe</strong>.</p>

          <div class="import-limit-row">
            <label>Max. Posts pro Channel:</label>
            <input type="number" [(ngModel)]="importLimit" min="1" max="100" class="form-input form-input-small">
            <button class="btn-sm" (click)="saveLimit()" [disabled]="savingLimit">{{ savingLimit ? '...' : 'Speichern' }}</button>
          </div>

          <div class="action-bar" style="margin-top:16px">
            <button class="btn-import" (click)="importAll()" [disabled]="importing">
              <span *ngIf="!importing">🚀 Alle Channels jetzt importieren</span>
              <span *ngIf="importing"><span class="spinner-inline"></span> Importiere...</span>
            </button>
          </div>
          <div class="feedback error" *ngIf="importError">❌ {{ importError }}</div>

          <div class="result-card" *ngIf="importResults">
            <h4>Import abgeschlossen</h4>
            <div *ngFor="let entry of importResultEntries">
              <div class="result-channel">
                <strong>{{ entry.channel }}</strong>
                <span class="result-stats-sm">
                  ✅ {{ entry.result.imported }} • ⏩ {{ entry.result.skipped }} • ❌ {{ entry.result.errors }}
                </span>
                <!-- Preis/Bild-Warnungen -->
                <div class="result-warnings" *ngIf="entry.result.noPriceCount > 0 || entry.result.noImageCount > 0">
                  <span class="warn-badge" *ngIf="entry.result.noPriceCount > 0">
                    💰 {{ entry.result.noPriceCount }} ohne Preis (Standardpreis 1 gesetzt)
                  </span>
                  <span class="warn-badge" *ngIf="entry.result.noImageCount > 0">
                    🖼️ {{ entry.result.noImageCount }} ohne Bild
                  </span>
                </div>
              </div>
            </div>
            <p class="review-hint">⚠️ Importierte Produkte sind <strong>Entwürfe</strong> – bitte unter <em>Produkte → Entwurf</em> prüfen.</p>
            <p class="review-hint" style="background:#fffbeb;border-color:#fde68a;color:#92400e" *ngIf="hasPriceWarning">
              💰 Produkte mit Standardpreis 1 in der Produktliste mit „Preis prüfen" markiert.
            </p>
          </div>
        </div>

        <!-- ─── Auto-Sync Einstellungen ─── -->
        <div class="section-box sync-settings-box">
          <h3>⚙️ Auto-Sync Einstellungen</h3>
          <p class="section-desc">Steuere wie neue Telegram-Posts verarbeitet werden.</p>

          <div class="sync-setting-row">
            <div class="sync-setting-info">
              <strong>Automatisch importieren</strong>
              <small>Neue Posts werden automatisch als Entwürfe importiert (ohne manuellen Klick)</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="syncSettings.autoImportEnabled"
                     (change)="saveSyncSettings()">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="sync-setting-row" [class.disabled-row]="!syncSettings.autoImportEnabled">
            <div class="sync-setting-info">
              <strong>Auto-Publish</strong>
              <small>Produkte direkt aktivieren statt als Entwurf speichern</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="syncSettings.autoPublishEnabled"
                     [disabled]="!syncSettings.autoImportEnabled"
                     (change)="saveSyncSettings()">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="sync-setting-row" [class.disabled-row]="!syncSettings.autoPublishEnabled">
            <div class="sync-setting-info">
              <strong>Nur mit Preis & Bild veröffentlichen</strong>
              <small>Auto-Publish nur wenn Preis UND Bild erkannt wurden – sonst immer DRAFT</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="syncSettings.publishOnlyWithPriceAndImage"
                     [disabled]="!syncSettings.autoPublishEnabled"
                     (change)="saveSyncSettings()">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="sync-setting-row">
            <div class="sync-setting-info">
              <strong>Dashboard-Benachrichtigungen</strong>
              <small>Dezente Meldung wenn neue Produkte importiert wurden</small>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="syncSettings.showNewProductNotifications"
                     (change)="saveSyncSettings()">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="feedback success" *ngIf="syncSettingsSaved">✅ Einstellungen gespeichert</div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .mtproto-container { max-width: 720px; }
    .mtproto-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .header-icon { font-size: 36px; line-height: 1; }
    .mtproto-header h2 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
    .mtproto-header p { font-size: 13px; color: #6b7280; margin: 0; }
    .auth-badge { margin-left: auto; padding: 6px 14px; border-radius: 8px; background: #fef2f2; color: #b91c1c; font-size: 13px; font-weight: 600; align-self: center; white-space: nowrap; }
    .auth-badge.authed { background: #f0fdf4; color: #166534; }

    .step-indicator { display: flex; align-items: center; margin-bottom: 24px; }
    .step { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #9ca3af; }
    .step.active { color: #667eea; font-weight: 700; background: #eff6ff; }
    .step.done { color: #059669; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
    .step-line { flex: 1; height: 2px; background: #e5e7eb; min-width: 20px; }

    .step-card, .section-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; }
    .step-card h3, .section-box h3 { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 16px; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #1e40af; margin-bottom: 16px; line-height: 1.6; }
    .info-box a { color: #2563eb; }
    .info-box.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .required { color: #ef4444; }
    .form-input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; color: #111827; background: #fff; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,.15); }
    .form-input:disabled { background: #f3f4f6; color: #9ca3af; }
    .form-input-small { width: 100px; }
    .code-input { font-size: 20px; letter-spacing: 6px; text-align: center; }
    .form-group small { display: block; font-size: 12px; color: #6b7280; margin-top: 4px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; cursor: pointer; }
    .action-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }

    .advanced-toggle { margin-top: 16px; text-align: center; }
    .btn-link { background: none; border: none; color: #6b7280; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0; }
    .btn-link:hover { color: #667eea; }

    /* Connecting-Übergangs-Card */
    .connecting-card { text-align: center; padding: 32px 24px; }
    .connecting-card h3 { margin: 12px 0 8px; font-size: 15px; color: #111827; }
    .connecting-anim { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
    .connecting-icon { font-size: 2rem; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:.5; transform: scale(.9); } }
    .connecting-dots { display: flex; gap: 5px; }
    .connecting-dots span { width: 7px; height: 7px; border-radius: 50%; background: #667eea; animation: bounce 1.2s ease-in-out infinite; }
    .connecting-dots span:nth-child(2) { animation-delay: .2s; }
    .connecting-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }

    /* Channels Loading & Empty */
    .channels-loading { display: flex; align-items: center; gap: 10px; padding: 20px; justify-content: center; }
    .empty-channels { text-align: center; padding: 24px 16px; }
    .empty-channels-icon { font-size: 2rem; margin-bottom: 8px; opacity: .5; }
    .empty-channels p { margin: 0; font-size: 13px; color: #6b7280; }

    .countdown-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; margin-bottom: 14px; }
    .countdown-bar.warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .countdown-bar.expired { background: #fef2f2; border-color: #fecaca; color: #b91c1c; font-weight: 700; }

    .btn-primary, .btn-secondary, .btn-sm, .btn-import, .btn-danger-sm, .btn-resend {
      padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s;
    }
    .btn-primary { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-resend { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .btn-resend:disabled { opacity: .5; cursor: not-allowed; }
    .btn-sm { padding: 7px 14px; font-size: 13px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-sm:disabled { opacity: .5; cursor: not-allowed; }
    .btn-import { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; padding: 12px 28px; font-size: 15px; }
    .btn-import:disabled { opacity: .5; cursor: not-allowed; }
    .btn-danger-sm { padding: 6px 12px; font-size: 12px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .connected-bar { display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .connected-bar strong { display: block; font-size: 14px; color: #166534; }
    .connected-bar small { font-size: 12px; color: #4ade80; display: block; }

    .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
    .section-title h3 { margin: 0; }
    .section-desc { font-size: 13px; color: #6b7280; margin: 0 0 16px; }

    .channel-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .channel-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color .15s; }
    .channel-item.selected { border-color: #667eea; background: #eff6ff; }
    .channel-check { font-size: 18px; }
    .channel-info strong { display: block; font-size: 14px; color: #111827; }
    .channel-info small { font-size: 12px; color: #6b7280; display: block; }
    .empty-channels { text-align: center; padding: 20px; color: #9ca3af; font-size: 13px; }
    .manual-input { margin-top: 12px; }
    .manual-input label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
    .manual-row { display: flex; gap: 8px; }
    .manual-row .form-input { flex: 1; }

    .watched-channels { margin-top: 16px; }
    .watched-channels h4 { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px; }
    .watched-tag { display: inline-flex; align-items: center; gap: 6px; background: #667eea; color: #fff; border-radius: 20px; padding: 4px 12px; margin: 3px; font-size: 13px; }
    .tag-remove { background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; }

    .import-limit-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .import-limit-row label { font-size: 13px; font-weight: 600; color: #374151; }
    .result-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .result-card h4 { font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .result-channel { margin-bottom: 10px; }
    .result-channel strong { display: block; font-size: 14px; }
    .result-stats-sm { font-size: 12px; color: #6b7280; }
    .result-warnings { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .warn-badge { font-size: 11px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 2px 8px; border-radius: 10px; }
    .review-hint { font-size: 13px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }

    /* Auto-Sync Settings */
    .sync-settings-box { margin-top: 0; }
    .sync-setting-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid #f3f4f6; gap: 16px;
    }
    .sync-setting-row:last-of-type { border-bottom: none; }
    .sync-setting-row.disabled-row { opacity: .45; pointer-events: none; }
    .sync-setting-info { flex: 1; }
    .sync-setting-info strong { display: block; font-size: 13px; font-weight: 600; color: #111827; }
    .sync-setting-info small { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; line-height: 1.4; }
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; cursor: pointer; inset: 0; background: #d1d5db;
      border-radius: 22px; transition: .2s;
    }
    .toggle-slider:before {
      position: absolute; content: ''; height: 16px; width: 16px;
      left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .2s;
    }
    input:checked + .toggle-slider { background: #667eea; }
    input:checked + .toggle-slider:before { transform: translateX(18px); }

    .feedback { padding: 10px 16px; border-radius: 8px; font-size: 14px; margin-top: 12px; }
    .feedback.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .feedback.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

    .spinner-inline { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .step-label { display: none; }
    }
  `]
})
export class TelegramMtprotoComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  currentStep: Step = 'credentials';
  status: MtprotoStatus | null = null;
  platformAppAvailable: boolean | null = null;

  // Sync Settings
  syncSettings: TelegramSyncSettings = {
    autoImportEnabled: false,
    autoPublishEnabled: false,
    publishOnlyWithPriceAndImage: true,
    showNewProductNotifications: true
  };
  syncSettingsSaved = false;

  // Standard-Flow
  phone = '';
  sendingCode = false;
  advancedMode = false;

  // Advanced Mode
  apiId: number | null = null;
  apiHash = '';

  // Step 2
  verifyCode = '';
  twoFaPassword = '';
  needs2FA = false;
  verifying = false;
  codeSecondsLeft = 0;
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CODE_TTL = 120;
  private _verifySub: Subscription | null = null;

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

  errorMsg = '';
  loggingOut = false;

  constructor(private telegramService: TelegramService) {}

  ngOnInit(): void {
    this.loadStatus();
    this.checkPlatformApp();
    this.loadSyncSettings();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this._cancelVerify();
  }

  private loadSyncSettings(): void {
    this.telegramService.mtprotoGetSyncSettings(this.storeId).subscribe({
      next: s => { this.syncSettings = s; },
      error: () => {} // Defaults bleiben
    });
  }

  saveSyncSettings(): void {
    this.telegramService.mtprotoUpdateSyncSettings(this.storeId, this.syncSettings).subscribe({
      next: () => {
        this.syncSettingsSaved = true;
        setTimeout(() => this.syncSettingsSaved = false, 2500);
      }
    });
  }

  get hasPriceWarning(): boolean {
    if (!this.importResults) return false;
    return Object.values(this.importResults).some((r: any) => r.noPriceCount > 0);
  }

  private checkPlatformApp(): void {
    this.telegramService.mtprotoPlatformAppAvailable(this.storeId).subscribe({
      next: res => {
        this.platformAppAvailable = res.available;
        // Wenn keine Plattform-App → direkt Advanced Mode anzeigen
        if (!res.available) this.advancedMode = true;
      },
      error: () => { this.platformAppAvailable = false; this.advancedMode = true; }
    });
  }

  private loadStatus(): void {
    this.telegramService.mtprotoStatus(this.storeId).subscribe({
      next: s => {
        this.status = s;
        this.importLimit = s.importLimit || 50;
        if (s.watchedChannels) {
          try { this.watchedChannels = JSON.parse(s.watchedChannels); } catch { }
        }
        // Auto-load Channels wenn verbunden und noch nicht geladen
        if (s.sessionValid && !this.loadingChannels && this.availableChannels.length === 0) {
          this.loadChannels();
        }
      },
      error: () => { this.status = null; }
    });
  }

  // ── Countdown ───────────────────────────────────────────────────────────
  private startCountdown(): void {
    this.stopCountdown();
    this.codeSecondsLeft = this.CODE_TTL;
    this._countdownInterval = setInterval(() => {
      if (this.codeSecondsLeft > 0) this.codeSecondsLeft--;
      else this.stopCountdown();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this._countdownInterval) { clearInterval(this._countdownInterval); this._countdownInterval = null; }
  }

  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  goBackToCredentials(): void {
    this._cancelVerify();
    this.currentStep = 'credentials';
    this.verifyCode = '';
    this.twoFaPassword = '';
    this.needs2FA = false;
    this.errorMsg = '';
    this.stopCountdown();
    this.codeSecondsLeft = 0;
  }

  private _cancelVerify(): void {
    if (this._verifySub) { this._verifySub.unsubscribe(); this._verifySub = null; }
    this.verifying = false;
  }

  private extractSeconds(msg: string): number {
    const match = msg.match(/(\d+)\s*Sekunden/i) || msg.match(/(\d+)\s*seconds/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ── Step 1: Code senden ─────────────────────────────────────────────────
  requestCode(): void {
    this.errorMsg = '';
    this.sendingCode = true;
    this._cancelVerify();
    this.verifyCode = '';
    this.twoFaPassword = '';
    this.needs2FA = false;
    this.stopCountdown();
    this.codeSecondsLeft = 0;

    // Standard-Flow: nur phone; Advanced: auch apiId + apiHash
    const apiIdParam = this.advancedMode && this.apiId ? this.apiId : undefined;
    const apiHashParam = this.advancedMode && this.apiHash ? this.apiHash : undefined;

    this.telegramService.mtprotoRequestCode(this.storeId, this.phone, apiIdParam, apiHashParam).subscribe({
      next: () => {
        this.currentStep = 'verify-code';
        this.sendingCode = false;
        this.startCountdown();
      },
      error: err => {
        this.sendingCode = false;
        const status = err.status;
        const msg = err.error?.message || err.error?.error || err.error?.detail || err.message || 'Fehler';
        if (status === 429) {
          const sec = this.extractSeconds(msg);
          if (sec > 3600) this.errorMsg = `⏳ Telegram gesperrt für ~${Math.ceil(sec/3600)} Stunden.`;
          else if (sec > 60) this.errorMsg = `⏳ Bitte ${Math.ceil(sec/60)} Minuten warten.`;
          else if (sec > 0) this.errorMsg = `⏳ Bitte ${sec} Sekunden warten.`;
          else this.errorMsg = `⏳ ${msg}`;
        } else if (status === 0 || !status) {
          this.errorMsg = '🔌 Scraper nicht erreichbar – bitte kurz warten.';
        } else {
          this.errorMsg = `❌ ${msg}`;
        }
      }
    });
  }

  // ── Step 2: Verify ──────────────────────────────────────────────────────
  verify(): void {
    if (this.verifying || this.currentStep !== 'verify-code' || !this.verifyCode) return;
    this.errorMsg = '';
    this.verifying = true;
    const pw = this.needs2FA ? this.twoFaPassword : undefined;

    this._verifySub = this.telegramService.mtprotoVerifyCode(this.storeId, this.verifyCode, pw).subscribe({
      next: () => {
        this._verifySub = null;
        this.verifying = false;
        this.stopCountdown();
        this.currentStep = 'channels'; // Sofort navigieren – verhindert Doppel-Submit
        this.loadStatus();
      },
      error: err => {
        this._verifySub = null;
        this.verifying = false;
        const errorCode = err.error?.error;
        const msg = err.error?.message || err.error?.detail || err.error?.error || 'Falscher Code';

        if (err.status === 410 || errorCode === 'CODE_EXPIRED' ||
            msg.toLowerCase().includes('abgelaufen') || msg.toLowerCase().includes('expired')) {
          this.goBackToCredentials();
          this.errorMsg = '⏱️ Code abgelaufen. Bitte neuen Code anfordern.';
          return;
        }
        // 409: Kein ausstehender Code / Session unterbrochen → zurück zu Schritt 1
        if (err.status === 409 || errorCode === 'NO_PENDING_CODE' ||
            msg.toLowerCase().includes('kein ausstehender') || msg.toLowerCase().includes('erst schritt 1')) {
          this.goBackToCredentials();
          this.errorMsg = '🔄 Sitzung unterbrochen. Bitte erneut Code anfordern.';
          return;
        }
        if (err.status === 401 || msg.includes('2FA') || msg.includes('password') || msg.includes('Passwort')) {
          this.needs2FA = true;
          this.errorMsg = '🔐 2FA aktiv – bitte Passwort eingeben.';
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
      next: res => { this.availableChannels = res.channels || []; this.loadingChannels = false; },
      error: () => { this.loadingChannels = false; }
    });
  }

  isWatched(ch: ChannelInfo): boolean {
    const id = ch.username ? `@${ch.username}` : String(ch.id);
    return this.watchedChannels.includes(id);
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
      next: () => { this.savingChannels = false; this.channelSaveSuccess = true; setTimeout(() => this.channelSaveSuccess = false, 3000); },
      error: () => { this.savingChannels = false; }
    });
  }

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
      next: results => { this.importResults = results; this.importing = false; },
      error: err => { this.importError = err.error?.detail || err.error?.message || 'Import fehlgeschlagen'; this.importing = false; }
    });
  }

  get importResultEntries(): { channel: string; result: any }[] {
    if (!this.importResults) return [];
    return Object.entries(this.importResults).map(([channel, result]) => ({ channel, result }));
  }

  logout(): void {
    this.loggingOut = true;
    this.telegramService.mtprotoLogout(this.storeId).subscribe({
      next: () => { this.status = null; this.loggingOut = false; this.currentStep = 'credentials'; this.watchedChannels = []; },
      error: () => { this.loggingOut = false; }
    });
  }

  stepDone(step: Step): boolean {
    const order: Step[] = ['credentials', 'verify-code', 'channels', 'import'];
    return order.indexOf(this.currentStep) > order.indexOf(step);
  }
}

