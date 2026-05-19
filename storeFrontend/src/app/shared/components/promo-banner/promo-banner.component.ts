import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, effect, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService, BannerSettings } from '@app/core/services/banner.service';
import { TranslationService } from '@app/core/services/translation.service';
import { Subscription } from 'rxjs';

/**
 * Promo-Banner-Komponente für den Storefront.
 * Zeigt einen animierten Lauftext-Banner (Marquee-ähnlich via CSS-Animation).
 * Unterstützt:
 *  – position: top | bottom
 *  – Mehrsprachige Texte (de/en/ar) mit Fallback
 *  – Geschwindigkeitskonfiguration (px/s)
 *  – Schließ-Button
 *  – RTL-Support
 *
 * Verwendung im Storefront-Template:
 *  <app-promo-banner [storeId]="storeId"></app-promo-banner>
 */
@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      *ngIf="visible && settings?.enabled"
      class="promo-banner"
      [class.banner-top]="settings?.position === 'top'"
      [class.banner-bottom]="settings?.position === 'bottom'"
      [style.background]="settings?.bgColor"
      [style.color]="settings?.textColor"
      role="banner"
      aria-live="polite">

      <!-- Lauftext-Wrapper -->
      <div class="banner-track-wrapper" [class.static-text]="settings?.animationSpeed === 0">
        <div
          class="banner-track"
          [style.animation-duration.s]="animDuration"
          [style.--banner-bg]="settings?.bgColor">
          <span class="banner-content">
            <span *ngIf="settings?.icon" class="banner-icon" aria-hidden="true">{{ settings?.icon }}&nbsp;</span>
            {{ displayText }}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span *ngIf="settings?.icon" class="banner-icon" aria-hidden="true">{{ settings?.icon }}&nbsp;</span>
            {{ displayText }}
          </span>
        </div>
      </div>

      <!-- Schließ-Button -->
      <button
        class="banner-close"
        (click)="dismiss()"
        [style.color]="settings?.textColor"
        aria-label="Banner schließen"
        title="Schließen">
        ✕
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .promo-banner {
      position: fixed;
      left: 0; right: 0;
      z-index: 1200;
      display: flex;
      align-items: center;
      min-height: 36px;
      padding: 0 44px 0 0;
      overflow: hidden;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }

    .banner-top    { top: 0; }
    .banner-bottom { bottom: 0; }

    /* Lauftext Animation */
    .banner-track-wrapper {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
    }

    .banner-track {
      display: inline-flex;
      animation: banner-scroll linear infinite;
      white-space: nowrap;
    }
    .banner-track:hover { animation-play-state: paused; }

    .banner-content {
      display: inline-block;
      padding: 8px 32px;
    }

    /* Statischer Modus (animationSpeed = 0) */
    .static-text .banner-track {
      animation: none;
      display: flex;
      justify-content: center;
      width: 100%;
    }
    .static-text .banner-content:last-child { display: none; }

    .banner-icon { font-style: normal; }

    /* Schließ-Button */
    .banner-close {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.75;
      padding: 4px 6px;
      border-radius: 4px;
      transition: opacity 0.2s, background 0.2s;
      line-height: 1;
    }
    .banner-close:hover { opacity: 1; background: rgba(0,0,0,0.1); }

    @keyframes banner-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* RTL: Text läuft in die andere Richtung */
    :host-context([dir="rtl"]) .banner-track {
      animation-name: banner-scroll-rtl;
    }
    @keyframes banner-scroll-rtl {
      0%   { transform: translateX(0); }
      100% { transform: translateX(50%); }
    }

    /* Mobile */
    @media (max-width: 480px) {
      .promo-banner { font-size: 12px; min-height: 32px; }
    }
  `]
})
export class PromoBannerComponent implements OnInit, OnDestroy {

  @Input() storeId!: number;

  settings: BannerSettings | null = null;
  visible = true;
  displayText = '';
  /** Dauer der Animation in Sekunden – berechnet aus px/s und Textlänge */
  animDuration = 12;

  private sub?: Subscription;
  private langEffect?: ReturnType<typeof effect>;

  constructor(
    private bannerService: BannerService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    if (!this.storeId) return;

    this.sub = this.bannerService.getPublicBanner(this.storeId).subscribe(settings => {
      // null = kein Banner oder Fehler → still ignorieren, kein Flash
      if (!settings || !settings.enabled) {
        this.settings = settings;
        this.cdr.markForCheck();
        return;
      }
      this.settings = settings;
      this.updateDisplayText();
      this.cdr.markForCheck();
    });

    // Auf Signal-basierte Sprachwechsel reagieren (Angular Signals)
    this.langEffect = effect(() => {
      this.translationService.currentLang(); // Signal lesen → registriert Abhängigkeit
      this.updateDisplayText();
      this.cdr.markForCheck();
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langEffect?.destroy();
  }

  dismiss(): void {
    this.visible = false;
    this.cdr.markForCheck();
  }

  private updateDisplayText(): void {
    if (!this.settings?.texts) return;

    const lang = this.translationService.currentLang(); // Signal call
    const texts = this.settings.texts;

    // Fallback-Kette: aktuelle Sprache → de → en → erster verfügbarer Wert
    this.displayText =
      texts[lang] ||
      texts['de'] ||
      texts['en'] ||
      Object.values(texts).find(v => !!v) ||
      '';

    // Animationsdauer aus Textlänge und Geschwindigkeit berechnen
    // Formel: Zeit = Pixel / px_pro_Sekunde
    // Annahme: ca. 8px pro Zeichen
    const speed = this.settings.animationSpeed || 60;
    if (speed > 0) {
      const estimatedPx = this.displayText.length * 8 + 200;
      this.animDuration = Math.max(5, estimatedPx / speed);
    }
  }
}


