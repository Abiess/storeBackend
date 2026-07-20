import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { WhatsappConfigService, WhatsappContext } from '@app/core/services/whatsapp-config.service';
import { WhatsappTrackingService } from '@app/core/services/whatsapp-tracking.service';
import { Subscription } from 'rxjs';

/**
 * WhatsApp-Kontakt-Widget – fixer Button rechts unten.
 *
 * Kontext:
 *  - 'platform' → "markt.ma kontaktieren"  (Landing Page, allgemeine Seiten)
 *  - 'store'    → "Händler kontaktieren"    (Subdomain-Storefront)
 *
 * Die Nummer kommt aus WhatsappConfigService:
 *  – Landing Page   : environment.whatsappNumber
 *  – Storefront     : store.whatsappNumber aus Store-Settings
 */
@Component({
  selector: 'app-whatsapp-widget',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    @if (phoneNumber) {
      <div class="wa-widget">

        <!-- Erweitertes Label (erscheint beim Hover) -->
        <div class="wa-label-chip">
          <svg class="wa-label-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
              -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
              -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
              .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207
              -.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
              -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2
              5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085
              1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M11.985 0C5.373 0 0 5.373 0 11.985c0 2.11.553 4.09 1.518 5.808L.057 23.927
              l6.305-1.654A11.935 11.935 0 0011.985 24C18.597 24 24 18.627 24 12.015
              24 5.403 18.597 0 11.985 0zm0 21.818a9.832 9.832 0 01-5.012-1.37l-.36-.214
              -3.733.979 1-3.633-.235-.374a9.818 9.818 0 01-1.506-5.221c0-5.42 4.41-9.83
              9.846-9.83 5.435 0 9.845 4.41 9.845 9.83 0 5.421-4.41 9.833-9.845 9.833z"/>
          </svg>
          <span class="wa-label-text">
            {{ context === 'store'
               ? ('whatsapp.contactSeller' | translate)
               : ('whatsapp.contactUs'     | translate) }}
          </span>
        </div>

        <!-- Haupt-Button -->
        <a
          [href]="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="wa-btn"
          [class.wa-btn--store]="context === 'store'"
          [attr.aria-label]="context === 'store'
            ? ('whatsapp.contactSeller' | translate)
            : ('whatsapp.contactUs'     | translate)"
          (click)="trackClick()">

          <!-- WhatsApp SVG-Logo (offizielles Icon) -->
          <svg class="wa-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#fff" d="M4.868 43.303l2.694-9.835a18.97 18.97 0 01-2.542-9.489C5.022 13.066 13.988 4.1
              24.978 4.1c5.332.002 10.338 2.078 14.108 5.851a19.77 19.77 0 015.842 14.086
              c-.004 10.99-8.971 19.957-19.96 19.957a19.98 19.98 0 01-9.538-2.423L4.868 43.303z"/>
            <path fill="#128C7E"
              d="M4.868 43.303l2.694-9.835a18.97 18.97 0 01-2.542-9.489C5.022 13.066 13.988 4.1
              24.978 4.1c5.332.002 10.338 2.078 14.108 5.851a19.77 19.77 0 015.842 14.086
              c-.004 10.99-8.971 19.957-19.96 19.957a19.98 19.98 0 01-9.538-2.423L4.868 43.303z"
              opacity=".15"/>
            <path fill="none" stroke="#128C7E" stroke-miterlimit="10" stroke-width="2"
              d="M24.978 4.1a19.82 19.82 0 00-14.003 5.814 19.72 19.72 0 00-5.953 14.065
              c0 3.487.91 6.87 2.636 9.849L4.868 43.303l9.732-2.554a19.9 19.9 0 009.378 2.364
              c10.991 0 19.956-8.965 19.96-19.957a19.77 19.77 0 00-5.842-14.086A19.84 19.84 0 0024.978 4.1z"/>
            <path fill="#fff"
              d="M32.073 27.457c-.496-.248-2.937-1.449-3.392-1.614-.455-.166-.786-.248-1.117.248
              s-1.282 1.614-1.571 1.945c-.289.332-.579.373-1.075.124s-2.096-.772-3.992-2.464
              c-1.476-1.317-2.473-2.943-2.762-3.44-.289-.497-.031-.765.217-1.012.223-.222.496-.58.744-.869
              s.331-.497.497-.83.083-.621-.041-.869-1.117-2.69-1.53-3.683c-.403-.968-.812-.837-1.117-.852
              a20.142 20.142 0 00-.951-.018c-.331 0-.869.124-1.324.621-.455.497-1.737 1.697-1.737 4.14
              s1.778 4.802 2.026 5.134c.248.331 3.5 5.341 8.48 7.489 1.184.511 2.108.817 2.828 1.045
              1.188.378 2.27.325 3.125.197 1.353-.203 2.936-1.2 3.349-2.358.413-1.158.413-2.15.289-2.357
              s-.455-.331-.951-.579z"/>
          </svg>
        </a>
      </div>
    }
  `,
  styles: [`
    /* ── Host: fixer Button rechts unten (Standard-WhatsApp-Position) ── */
    :host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      left: auto;
      z-index: 9998; /* Knapp unter dem Chatbot (9999) */
      display: block;
    }

    /* RTL: auf linke Seite spiegeln */
    :host-context([dir="rtl"]) {
      left: 24px;
      right: auto;
    }

    .wa-widget {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ──────────────────────── Haupt-Button ──────────────────────── */
    .wa-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      box-shadow: 0 4px 16px rgba(37, 211, 102, 0.50);
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.3s ease;
      position: relative;
    }

    /* Store-Kontext: etwas dunklerer Grünton damit erkennbar */
    .wa-btn--store {
      background: linear-gradient(135deg, #20BA5A 0%, #0E7A52 100%);
      box-shadow: 0 4px 16px rgba(14, 122, 82, 0.50);
    }

    .wa-btn:hover {
      transform: scale(1.12) translateY(-3px);
      box-shadow: 0 8px 28px rgba(37, 211, 102, 0.65);
    }

    .wa-btn:active { transform: scale(0.95); }

    /* Pulsierender Ring-Effekt */
    .wa-btn::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background: rgba(37, 211, 102, 0.25);
      animation: wa-pulse 2.5s ease-in-out infinite;
    }

    @keyframes wa-pulse {
      0%, 100% { transform: scale(1);   opacity: 0.8; }
      50%       { transform: scale(1.25); opacity: 0; }
    }

    /* ──────────────────────── Icon ──────────────────────── */
    .wa-icon {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
    }

    /* ──────────────────────── Label-Chip (erscheint beim Hover) ──────────────────────── */
    .wa-label-chip {
      position: absolute;
      right: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%) translateX(6px);
      background: #1f2937;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      padding: 7px 12px 7px 10px;
      border-radius: 10px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      box-shadow: 0 4px 14px rgba(0,0,0,0.28);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* RTL: Chip links vom Button */
    :host-context([dir="rtl"]) .wa-label-chip {
      right: auto;
      left: calc(100% + 12px);
      transform: translateY(-50%) translateX(-6px);
    }

    /* Pfeil rechts am Chip (zeigt auf Button) */
    .wa-label-chip::after {
      content: '';
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-right: none;
      border-left-color: #1f2937;
    }

    /* RTL: Pfeil links */
    :host-context([dir="rtl"]) .wa-label-chip::after {
      right: auto;
      left: -6px;
      border-left: none;
      border-right-color: #1f2937;
    }

    .wa-label-icon {
      width: 14px;
      height: 14px;
      fill: #25D366;
      flex-shrink: 0;
    }

    .wa-widget:hover .wa-label-chip {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }

    :host-context([dir="rtl"]) .wa-widget:hover .wa-label-chip {
      transform: translateY(-50%) translateX(0);
    }

    /* ──────────────────────── Mobile ──────────────────────── */
    @media (max-width: 480px) {
      :host {
        bottom: 16px;
        right: 16px;
        left: auto;
      }
      :host-context([dir="rtl"]) {
        left: 16px;
        right: auto;
      }
      .wa-btn {
        width: 54px;
        height: 54px;
      }
      .wa-icon {
        width: 28px;
        height: 28px;
      }
      /* Chip auf Mobile verstecken (zu wenig Platz) */
      .wa-label-chip { display: none; }
    }

    /* ── Produktdetail-Seite Mobile: über den sticky CTA heben ──
       Der Product Sticky CTA (volle Breite, ~80px) sitzt ganz unten.
       Desktop (> 767px) bleibt unverändert. */
    @media (max-width: 767px) {
      /* Product Detail Page */
      :host-context(body.is-product-detail) {
        bottom: calc(80px + env(safe-area-inset-bottom, 0px) + 12px);
      }
      
      /* Alle Storefront-Seiten: WhatsApp über der Bottom-Nav (64px + safe-area) */
      :host-context(.storefront-wrapper),
      :host {
        z-index: 10050; /* Unter Bottom-Nav (10100), aber sichtbar */
        bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px);
      }
    }
  `]
})
export class WhatsappWidgetComponent implements OnInit, OnDestroy {

  /** Aktuelle Nummer aus WhatsappConfigService (null = Widget versteckt) */
  phoneNumber: string | null = null;

  /** Vorbefüllte Nachricht */
  message: string = WhatsappConfigService.DEFAULT_MESSAGE;

  /** Aktueller Kontext: 'platform' oder 'store' */
  context: WhatsappContext = 'platform';

  private sub?: Subscription;

  constructor(
    private whatsappConfig: WhatsappConfigService,
    private tracking: WhatsappTrackingService
  ) {}

  ngOnInit(): void {
    this.sub = this.whatsappConfig.number$.subscribe(num => {
      this.phoneNumber = num;
    });
    this.sub.add(
      this.whatsappConfig.message$.subscribe(msg => {
        this.message = msg;
      })
    );
    this.sub.add(
      this.whatsappConfig.context$.subscribe(ctx => {
        this.context = ctx;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  trackClick(): void {
    this.tracking.track({ source: 'widget', url: this.whatsappUrl });
  }

  get whatsappUrl(): string {
    if (!this.phoneNumber) return '#';
    const phone   = this.phoneNumber.replace(/\D/g, '');
    const encoded = this.message ? `?text=${encodeURIComponent(this.message)}` : '';
    return `https://wa.me/${phone}${encoded}`;
  }
}
