import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { WhatsappConfigService } from '@app/core/services/whatsapp-config.service';
import { Subscription } from 'rxjs';
/**
 * Statisches WhatsApp-Kontakt-Widget.
 * Erscheint als fixer grüner Button rechts unten (links neben dem Chatbot-Button).
 * Öffnet beim Klick wa.me/<nummer> in einem neuen Tab.
 *
 * Die Telefonnummer kommt aus WhatsappConfigService:
 *  - Jetzt: environment.whatsappNumber (Plattform-Fallback)
 *  - Später: store.whatsappNumber aus Store-Settings per setNumber()
 *
 * Kein @Input mehr nötig – das Widget steuert seine eigene Sichtbarkeit.
 */
@Component({
  selector: 'app-whatsapp-widget',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    @if (phoneNumber) {
      <div class="wa-widget">
        <!-- Tooltip-Label (erscheint beim Hover) -->
        <span class="wa-tooltip" role="tooltip">
          {{ 'whatsapp.contactUs' | translate }}
        </span>

        <!-- Haupt-Button -->
        <a
          [href]="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="wa-btn"
          [attr.aria-label]="'whatsapp.contactUs' | translate">

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
    :host {
      position: fixed;
      bottom: 20px;
      /* Chatbot-Button sitzt bei right:20px mit 60px Breite → 30px Abstand */
      right: 90px;
      z-index: 9998; /* Knapp unter dem Chatbot (9999) */
      display: block;
    }

    /* RTL-Support */
    :host-context([dir="rtl"]) {
      right: auto;
      left: 90px;
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
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.45);
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.3s ease;
      position: relative;
    }

    .wa-btn:hover {
      transform: scale(1.12) translateY(-3px);
      box-shadow: 0 8px 24px rgba(37, 211, 102, 0.6);
    }

    .wa-btn:active {
      transform: scale(0.95);
    }

    /* Pulsierender Ring-Effekt */
    .wa-btn::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: rgba(37, 211, 102, 0.3);
      animation: wa-pulse 2.5s ease-in-out infinite;
    }

    @keyframes wa-pulse {
      0%, 100% { transform: scale(1);   opacity: 0.7; }
      50%       { transform: scale(1.2); opacity: 0.0; }
    }

    /* ──────────────────────── Icon ──────────────────────── */
    .wa-icon {
      width: 30px;
      height: 30px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
    }

    /* ──────────────────────── Tooltip ──────────────────────── */
    .wa-tooltip {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      background: #1f2937;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      padding: 6px 12px;
      border-radius: 8px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    /* Tooltip-Pfeil */
    .wa-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 18px;
      border: 6px solid transparent;
      border-top-color: #1f2937;
    }

    .wa-widget:hover .wa-tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    /* Mobile: etwas kompakter */
    @media (max-width: 480px) {
      :host {
        bottom: 10px;
        right: 80px;
      }
      :host-context([dir="rtl"]) {
        right: auto;
        left: 80px;
      }
      .wa-btn {
        width: 52px;
        height: 52px;
      }
      .wa-icon {
        width: 26px;
        height: 26px;
      }
    }
  `]
})
export class WhatsappWidgetComponent implements OnInit, OnDestroy {

  /** Aktuelle Nummer aus WhatsappConfigService (null = Widget versteckt) */
  phoneNumber: string | null = null;

  /** Vorbefüllte Nachricht (aus Service, überschreibbar per Store-Settings) */
  message: string = WhatsappConfigService.DEFAULT_MESSAGE;

  private sub?: Subscription;

  constructor(private whatsappConfig: WhatsappConfigService) {}

  ngOnInit(): void {
    this.sub = this.whatsappConfig.number$.subscribe(num => {
      this.phoneNumber = num;
    });
    this.sub.add(
      this.whatsappConfig.message$.subscribe(msg => {
        this.message = msg;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /**
   * Baut die wa.me-URL auf:
   *   https://wa.me/<nur Ziffern>?text=<encodeURIComponent(message)>
   *
   * - encodeURIComponent: kompatibel mit Arabisch, Französisch, allen Unicode-Zeichen
   * - wa.me öffnet direkt die WhatsApp-App (mobil & desktop)
   * - Kein + vor dem Leerzeichen – WhatsApp erwartet %20, nicht +
   */
  get whatsappUrl(): string {
    if (!this.phoneNumber) return '#';
    const phone   = this.phoneNumber.replace(/\D/g, ''); // nur Ziffern
    const encoded = this.message ? `?text=${encodeURIComponent(this.message)}` : '';
    return `https://wa.me/${phone}${encoded}`;
  }
}

