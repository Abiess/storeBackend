import {
  Component, Input, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
  effect, Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService, BannerSettings } from '@app/core/services/banner.service';
import { TranslationService } from '@app/core/services/translation.service';
import { Subscription } from 'rxjs';

// Renderer2 + DOCUMENT für SSR-sicheres Body-Class-Management
import { Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Promo-Banner-Komponente für den Storefront.
 *
 * Verhalten:
 *  – Zeigt immer einen Banner, auch ohne DB-Eintrag (Client-seitige Defaults)
 *  – Nur versteckt wenn: Admin setzt enabled=false ODER User schließt per ✕
 *  – Animierter Lauftext (Marquee via CSS), pausierbar per Hover
 *  – Mehrsprachig (de/en/ar) mit Fallback-Kette
 *  – RTL-Support, responsive, fixed top/bottom, sticky über Header
 */
@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Banner nur versteckt wenn: admin disabled ODER user hat geschlossen -->
    <div
      *ngIf="visible && settings.enabled"
      class="promo-banner"
      [class.banner-top]="settings.position !== 'bottom'"
      [class.banner-bottom]="settings.position === 'bottom'"
      [style.background]="settings.bgColor"
      [style.color]="settings.textColor"
      role="banner"
      aria-live="polite">

      <!-- Lauftext-Wrapper -->
      <div class="banner-track-wrapper" [class.static-text]="settings.animationSpeed === 0">
        <div
          class="banner-track"
          [style.animation-duration.s]="animDuration"
          [style.--banner-bg]="settings.bgColor">
          <span class="banner-content">
            <span *ngIf="settings.icon" class="banner-icon" aria-hidden="true">{{ settings.icon }}&nbsp;</span>
            {{ displayText }}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span *ngIf="settings.icon" class="banner-icon" aria-hidden="true">{{ settings.icon }}&nbsp;</span>
            {{ displayText }}
          </span>
        </div>
      </div>

      <!-- Schließ-Button -->
      <button
        class="banner-close"
        (click)="dismiss()"
        [style.color]="settings.textColor"
        aria-label="Banner schließen"
        title="Schließen">
        ✕
      </button>
    </div>
  `,
  styles: [`
    /* Host nimmt keinen Platz weg wenn Banner ausgeblendet */
    :host { display: block; }

    .promo-banner {
      position: fixed;
      left: 0;
      right: 0;
      /* z-index über allem: Header (1000), Modals (1100), Banner (1200) */
      z-index: 9999;
      display: flex;
      align-items: center;
      min-height: 40px;
      height: 40px;
      padding: 0 48px 0 0;
      overflow: hidden;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
      /* Sicherstellen dass Farben nicht transparent bleiben */
      background-color: #667eea;
      color: #ffffff;
    }

    .banner-top    { top: 0; }
    .banner-bottom { bottom: 0; }

    /* Lauftext Animation */
    .banner-track-wrapper {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
      min-width: 0; /* Flexbox-Fix damit overflow:hidden wirkt */
    }

    .banner-track {
      display: inline-flex;
      animation: banner-scroll linear infinite;
      white-space: nowrap;
      /* Sicherstellen dass Track sichtbar ist */
      visibility: visible;
      opacity: 1;
    }
    .banner-track:hover { animation-play-state: paused; }

    .banner-content {
      display: inline-block;
      padding: 0 32px;
      line-height: 40px;
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
      font-size: 15px;
      opacity: 0.85;
      padding: 4px 8px;
      border-radius: 4px;
      transition: opacity 0.2s, background 0.2s;
      line-height: 1;
      color: inherit;
      flex-shrink: 0;
    }
    .banner-close:hover { opacity: 1; background: rgba(0, 0, 0, 0.15); }

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
      .promo-banner { font-size: 12px; min-height: 34px; height: 34px; }
      .banner-content { line-height: 34px; }
    }
  `]
})
export class PromoBannerComponent implements OnInit, OnDestroy {

  @Input() storeId!: number;

  /** Immer mit sicheren Defaults initialisiert – niemals null/undefined */
  settings: BannerSettings = this.defaultSettings();

  visible = true;
  displayText = '';
  animDuration = 12;

  private sub?: Subscription;
  private langEffect?: ReturnType<typeof effect>;

  constructor(
    private bannerService: BannerService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Sofort Defaults anzeigen – BEVOR API-Antwort kommt (kein leeres Flash)
    this.applySettings(this.defaultSettings());
    this.cdr.markForCheck(); // OnPush: explizit triggern damit Defaults sofort gerendert werden

    if (!this.storeId) {
      // Kein storeId → Defaults behalten und anzeigen
      return;
    }

    // API laden – Ergebnis ist immer BannerSettings (Service gibt nie null zurück)
    this.sub = this.bannerService.getPublicBanner(this.storeId).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.cdr.markForCheck();
      },
      error: () => {
        // Sollte nicht passieren (Service fängt Fehler ab), aber sicherheitshalber:
        this.applySettings(this.defaultSettings());
        this.cdr.markForCheck();
      }
    });

    // Auf Signal-basierte Sprachwechsel reagieren
    this.langEffect = effect(() => {
      this.translationService.currentLang(); // Signal lesen → registriert Abhängigkeit
      this.updateDisplayText();
      this.cdr.markForCheck();
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.langEffect?.destroy();
    // Body-Klasse aufräumen wenn Component entfernt wird
    this.setBannerBodyClass(false);
  }

  dismiss(): void {
    this.visible = false;
    this.setBannerBodyClass(false);
    this.cdr.markForCheck();
  }

  /** Einstellungen anwenden und Display-Text neu berechnen */
  private applySettings(s: BannerSettings): void {
    this.settings = s;
    this.updateDisplayText();
    this.setBannerBodyClass(this.visible && s.enabled);
  }

  /** Display-Text aus mehrsprachigen Texts bestimmen, Fallback-Kette */
  private updateDisplayText(): void {
    const texts = this.settings?.texts;
    if (!texts) {
      this.displayText = '🎉 Heute Rabatt auf ausgewählte Produkte!';
      return;
    }

    const lang = this.translationService.currentLang();

    // Fallback-Kette: aktuelle Sprache → de → en → erster verfügbarer Wert → Hardcoded
    this.displayText =
      texts[lang] ||
      texts['de'] ||
      texts['en'] ||
      Object.values(texts).find(v => !!v) ||
      '🎉 Heute Rabatt auf ausgewählte Produkte!';

    // Animationsdauer aus Textlänge und Geschwindigkeit berechnen
    const speed = this.settings.animationSpeed ?? 60;
    if (speed > 0) {
      const estimatedPx = this.displayText.length * 8 + 200;
      this.animDuration = Math.max(5, Math.round(estimatedPx / speed));
    } else {
      this.animDuration = 0;
    }
  }

  /** Client-seitige Defaults – werden sofort angezeigt, bevor API antwortet */
  private defaultSettings(): BannerSettings {
    return {
      storeId: this.storeId ?? 0,
      enabled: true,
      position: 'top',
      bgColor: '#667eea',
      textColor: '#ffffff',
      animationSpeed: 60,
      texts: {
        de: '🎉 Heute Rabatt auf ausgewählte Produkte!',
        en: '🎉 Special discounts available today!',
        ar: '🎉 خصومات مميزة متوفرة اليوم!'
      }
    };
  }

  /** Body-Klasse für Layout-Offset (Header + Content nach unten) */
  private setBannerBodyClass(active: boolean): void {
    if (active) {
      this.renderer.addClass(this.document.body, 'promo-banner-active');
    } else {
      this.renderer.removeClass(this.document.body, 'promo-banner-active');
    }
  }
}
