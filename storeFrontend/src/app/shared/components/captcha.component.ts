import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, PLATFORM_ID, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * CAPTCHA Component (hCaptcha oder reCAPTCHA v3)
 *
 * Verwendung:
 * ```html
 * <app-captcha
 *   (tokenReceived)="onCaptchaToken($event)"
 *   (error)="onCaptchaError($event)">
 * </app-captcha>
 * ```
 */
@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (captchaEnabled && !captchaToken && !captchaConfigurationError) {
      <div #captchaContainer class="captcha-wrapper"></div>
    }
    @if (captchaToken) {
      <div class="captcha-success">✅ Verification successful</div>
    }
    @if (captchaConfigurationError) {
      <div class="captcha-error">⚠️ Sicherheitsprüfung konnte nicht geladen werden</div>
    }
  `,
  styles: [`
    .captcha-wrapper { margin: 16px 0; min-height: 78px; }
    .captcha-success {
      color: #10b981; font-size: 14px; margin: 8px 0;
      display: flex; align-items: center; gap: 8px;
    }
    .captcha-error {
      color: #ef4444; font-size: 14px; margin: 8px 0;
      display: flex; align-items: center; gap: 8px;
    }
  `]
})
export class CaptchaComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() tokenReceived = new EventEmitter<string>();
  @Output() error = new EventEmitter<string>();
  @Input() action = 'submit';

  @ViewChild('captchaContainer') containerRef!: ElementRef<HTMLDivElement>;

  captchaEnabled = environment.captcha?.enabled ?? false;
  provider = environment.captcha?.provider ?? 'hcaptcha';
  siteKey = environment.captcha?.siteKey ?? '';
  captchaToken: string | null = null;
  captchaConfigurationError = false;

  private widgetId: string | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // SSR: Kein Browser-API, keine CAPTCHA-Logik
    if (!this.isBrowser) {
      return;
    }

    // CAPTCHA explizit deaktiviert in Development
    if (!environment.production && !this.captchaEnabled) {
      console.log('[CAPTCHA] CAPTCHA deaktiviert in Development environment');
      this.emitDummyToken();
      return;
    }

    // CAPTCHA aktiviert, aber Site Key fehlt oder ist Platzhalter
    if (this.captchaEnabled && (!this.siteKey || this.siteKey.includes('__') || this.siteKey.trim() === '')) {
      console.error('[CAPTCHA] CRITICAL: Site Key fehlt oder ist Platzhalter!');
      console.error('[CAPTCHA] Production-Build ohne GitHub Secret HCAPTCHA_SITE_KEY?');
      
      if (environment.production) {
        // Production: Harter Konfigurationsfehler
        this.captchaConfigurationError = true;
        this.error.emit('CAPTCHA_CONFIGURATION_ERROR');
      } else {
        // Development: Fallback zu Dummy-Token
        console.warn('[CAPTCHA] Development: Fallback zu Dummy-Token');
        this.emitDummyToken();
      }
      return;
    }

    console.log('[CAPTCHA] Initialisierung mit Provider:', this.provider);
  }

  ngAfterViewInit() {
    // Nur Widget rendern wenn Browser UND CAPTCHA enabled UND kein Konfigurationsfehler
    if (!this.isBrowser || !this.captchaEnabled || this.captchaConfigurationError) {
      return;
    }
    
    if (!this.siteKey || this.siteKey.includes('__') || this.siteKey.trim() === '') {
      // Site Key fehlt - bereits in ngOnInit behandelt
      return;
    }
    
    this.loadScript().then(() => this.renderWidget()).catch(err => {
      console.error('[CAPTCHA] Script-Load fehlgeschlagen:', err);
      this.error.emit('CAPTCHA_SCRIPT_LOAD_FAILED');
    });
  }

  ngOnDestroy() {
    if (this.widgetId !== null) {
      try {
        const hc = (window as any).hcaptcha;
        if (hc) { hc.remove(this.widgetId); }
      } catch { /* ignore */ }
      this.widgetId = null;
    }
  }

  /** Lädt hCaptcha-Script genau EINMAL (render=explicit!) */
  private loadScript(): Promise<void> {
    const scriptId = 'hcaptcha-script';

    // Script bereits im DOM?
    if (document.getElementById(scriptId)) {
      // Warte bis window.hcaptcha bereit ist
      if ((window as any).hcaptcha) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const existing = document.getElementById(scriptId) as HTMLScriptElement;
        existing.addEventListener('load', () => resolve(), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = scriptId;
      // WICHTIG: render=explicit verhindert Auto-Rendering (das den "Missing sitekey" Fehler verursacht)
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[CAPTCHA] hCaptcha Script geladen (explicit mode)');
        resolve();
      };
      script.onerror = () => reject(new Error('hCaptcha script failed to load'));
      document.head.appendChild(script);
    });
  }

  /** Rendert das hCaptcha-Widget in den Container */
  private renderWidget() {
    const hcaptcha = (window as any).hcaptcha;
    if (!hcaptcha) {
      console.error('[CAPTCHA] window.hcaptcha nicht verfügbar nach Script-Load');
      this.error.emit('hCaptcha not available');
      return;
    }

    const container = this.containerRef?.nativeElement;
    if (!container) {
      console.error('[CAPTCHA] Container-Element nicht im DOM');
      this.error.emit('CAPTCHA container missing');
      return;
    }

    // Container leeren (falls re-render nach Route-Wechsel)
    container.innerHTML = '';

    try {
      this.widgetId = hcaptcha.render(container, {
        sitekey: this.siteKey,
        callback: (token: string) => {
          // SECURITY: Keine Token-Längen in Production (Fingerprinting-Risiko)
          if (!environment.production) {
            console.log('[CAPTCHA] Token erhalten:', {
              present: !!token,
              length: token?.length ?? 0
            });
          }
          this.captchaToken = token;
          this.tokenReceived.emit(token);
        },
        'error-callback': (err: any) => {
          console.error('[CAPTCHA] Fehler:', err);
          this.error.emit('hCaptcha Error');
        },
        'expired-callback': () => {
          console.warn('[CAPTCHA] Token abgelaufen');
          this.captchaToken = null;
          this.error.emit('hCaptcha Expired');
        }
      });
      console.log('[CAPTCHA] ✅ Widget gerendert, ID:', this.widgetId);
    } catch (err) {
      console.error('[CAPTCHA] Render fehlgeschlagen:', err);
      this.error.emit('hCaptcha render failed');
    }
  }

  private emitDummyToken() {
    this.captchaToken = 'CAPTCHA_DISABLED_DEV_MODE';
    this.tokenReceived.emit(this.captchaToken);
  }

  /** CAPTCHA manuell neu laden (z.B. nach Fehler oder Ablauf) */
  reset() {
    this.captchaToken = null;
    if (this.widgetId !== null) {
      try {
        (window as any).hcaptcha?.reset(this.widgetId);
      } catch { /* ignore */ }
    }
  }
}
