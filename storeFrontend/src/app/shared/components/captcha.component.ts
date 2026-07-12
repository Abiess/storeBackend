import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, PLATFORM_ID, Inject } from '@angular/core';
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
 * 
 * Token wird automatisch generiert und via EventEmitter zurückgegeben.
 */
@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule],  // ✅ FIX: NgIf und andere Common Directives
  template: `
    <div *ngIf="captchaEnabled && !captchaToken">
      <!-- hCaptcha Container -->
      <div *ngIf="provider === 'hcaptcha'" 
           id="hcaptcha-container" 
           class="h-captcha"></div>
      
      <!-- reCAPTCHA v3 läuft unsichtbar im Hintergrund -->
      <div *ngIf="provider === 'recaptcha'" 
           id="recaptcha-container"></div>
    </div>
    
    <!-- Success Indicator (optional) -->
    <div *ngIf="captchaToken" class="captcha-success">
      ✅ Verification successful
    </div>
  `,
  styles: [`
    .h-captcha {
      margin: 16px 0;
    }
    .captcha-success {
      color: #10b981;
      font-size: 14px;
      margin: 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class CaptchaComponent implements OnInit, OnDestroy {
  @Output() tokenReceived = new EventEmitter<string>();
  @Output() error = new EventEmitter<string>();
  @Input() action: string = 'submit'; // reCAPTCHA v3: action name

  captchaEnabled = environment.captcha.enabled;
  provider = environment.captcha.provider;
  siteKey = environment.captcha.siteKey;
  captchaToken: string | null = null;

  private scriptLoaded = false;
  private widgetId: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (!this.captchaEnabled || !isPlatformBrowser(this.platformId)) {
      // CAPTCHA deaktiviert oder Server-Side Rendering → Skip
      this.emitDummyToken();
      return;
    }

    // Prüfe ob Site Key ein Platzhalter ist (noch nicht ersetzt durch CI/CD)
    if (!this.siteKey || this.siteKey.includes('__') || this.siteKey === '') {
      console.warn('CAPTCHA Site Key ist Platzhalter oder leer - CAPTCHA wird übersprungen');
      console.warn('Für Production: GitHub Secret HCAPTCHA_SITE_KEY setzen');
      this.emitDummyToken();
      return;
    }

    this.loadCaptchaScript();
  }

  ngOnDestroy() {
    // Cleanup: hCaptcha Widget entfernen
    if (this.widgetId !== null && (window as any).hcaptcha) {
      try {
        (window as any).hcaptcha.remove(this.widgetId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private loadCaptchaScript() {
    if (this.scriptLoaded) {
      this.renderCaptcha();
      return;
    }

    const scriptSrc = this.provider === 'hcaptcha'
      ? 'https://js.hcaptcha.com/1/api.js'
      : 'https://www.google.com/recaptcha/api.js?render=' + this.siteKey;

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.scriptLoaded = true;
      this.renderCaptcha();
    };
    script.onerror = () => {
      console.error('CAPTCHA Script konnte nicht geladen werden');
      this.error.emit('CAPTCHA Script Load Failed');
    };

    document.head.appendChild(script);
  }

  private renderCaptcha() {
    if (this.provider === 'hcaptcha') {
      this.renderHCaptcha();
    } else if (this.provider === 'recaptcha') {
      this.renderReCaptcha();
    }
  }

  private renderHCaptcha() {
    const hcaptcha = (window as any).hcaptcha;
    if (!hcaptcha) {
      console.error('hCaptcha Library nicht geladen');
      return;
    }

    setTimeout(() => {
      const container = document.getElementById('hcaptcha-container');
      if (!container) return;

      this.widgetId = hcaptcha.render('hcaptcha-container', {
        sitekey: this.siteKey,
        callback: (token: string) => {
          this.captchaToken = token;
          this.tokenReceived.emit(token);
        },
        'error-callback': () => {
          this.error.emit('hCaptcha Validation Failed');
        },
        'expired-callback': () => {
          this.captchaToken = null;
          this.error.emit('hCaptcha Expired');
        }
      });
    }, 100);
  }

  private renderReCaptcha() {
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) {
      console.error('reCAPTCHA Library nicht geladen');
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha.execute(this.siteKey, { action: this.action })
        .then((token: string) => {
          this.captchaToken = token;
          this.tokenReceived.emit(token);
        })
        .catch((err: any) => {
          console.error('reCAPTCHA Execution Failed', err);
          this.error.emit('reCAPTCHA Execution Failed');
        });
    });
  }

  /**
   * Dummy Token für Development (CAPTCHA deaktiviert)
   */
  private emitDummyToken() {
    const dummyToken = 'CAPTCHA_DISABLED_DEV_MODE';
    this.captchaToken = dummyToken;
    this.tokenReceived.emit(dummyToken);
  }

  /**
   * CAPTCHA manuell neu laden (z.B. nach Fehler)
   */
  reset() {
    this.captchaToken = null;
    if (this.provider === 'hcaptcha' && this.widgetId !== null) {
      (window as any).hcaptcha?.reset(this.widgetId);
    } else if (this.provider === 'recaptcha') {
      this.renderReCaptcha();
    }
  }
}
