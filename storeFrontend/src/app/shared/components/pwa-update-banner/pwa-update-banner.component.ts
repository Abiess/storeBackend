import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '@app/core/services/pwa-update.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';

/**
 * PWA Update Banner Component
 * 
 * Zeigt ein dezentes Banner an, wenn eine neue App-Version verfügbar ist.
 * 
 * ─── Features ───────────────────────────────────────────────────
 * - Erscheint nur wenn updateAvailable$ === true
 * - Positioniert als fixed Banner (top oder bottom, je nach Design)
 * - Nicht störend: Kein Modal, kein Fullscreen-Overlay
 * - User entscheidet: "Jetzt aktualisieren" oder "Später"
 * - Responsive: Mobile und Desktop optimiert
 * - RTL-Support: Arabisch funktioniert korrekt
 * 
 * ─── Nutzung ────────────────────────────────────────────────────
 * 
 * In app.component.html:
 * ```html
 * <app-pwa-update-banner></app-pwa-update-banner>
 * <router-outlet></router-outlet>
 * ```
 * 
 * ─── Verhalten ──────────────────────────────────────────────────
 * 
 * **Jetzt aktualisieren:**
 * - pwaUpdate.activateUpdate() wird aufgerufen
 * - Neue Version wird aktiviert
 * - App lädt neu (kontrollierter Reload)
 * 
 * **Später:**
 * - pwaUpdate.dismissUpdate() wird aufgerufen
 * - Banner verschwindet für aktuelle Session
 * - Bei neuer Version C erscheint Banner erneut
 */
@Component({
  selector: 'app-pwa-update-banner',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LucideAngularModule],
  template: `
    <div 
      *ngIf="pwaUpdate.updateAvailable$ | async" 
      class="pwa-update-banner"
      role="alert"
      [attr.aria-label]="'pwa.update.ariaLabel' | translate">
      
      <div class="pwa-update-banner__content">
        <div class="pwa-update-banner__icon">
          <lucide-angular name="refresh-cw" [size]="20" strokeWidth="2"></lucide-angular>
        </div>
        
        <div class="pwa-update-banner__text">
          <div class="pwa-update-banner__title">
            {{ 'pwa.update.title' | translate }}
          </div>
          <div class="pwa-update-banner__subtitle">
            {{ 'pwa.update.subtitle' | translate }}
          </div>
        </div>
        
        <div class="pwa-update-banner__actions">
          <button 
            class="pwa-update-banner__btn pwa-update-banner__btn--primary"
            (click)="pwaUpdate.activateUpdate()"
            [attr.aria-label]="'pwa.update.updateNowAriaLabel' | translate">
            {{ 'pwa.update.updateNow' | translate }}
          </button>
          
          <button 
            class="pwa-update-banner__btn pwa-update-banner__btn--secondary"
            (click)="pwaUpdate.dismissUpdate()"
            [attr.aria-label]="'pwa.update.laterAriaLabel' | translate">
            {{ 'pwa.update.later' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== PWA Update Banner ==================== */
    
    .pwa-update-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .pwa-update-banner__content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .pwa-update-banner__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: rotate 2s linear infinite;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .pwa-update-banner__text {
      flex: 1;
      min-width: 0;
    }

    .pwa-update-banner__title {
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 0.125rem;
    }

    .pwa-update-banner__subtitle {
      font-size: 0.8125rem;
      opacity: 0.9;
      line-height: 1.3;
    }

    .pwa-update-banner__actions {
      flex-shrink: 0;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .pwa-update-banner__btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      white-space: nowrap;
    }

    .pwa-update-banner__btn--primary {
      background: rgba(255, 255, 255, 0.95);
      color: #667eea;
      
      &:hover {
        background: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      
      &:active {
        transform: translateY(0);
      }
    }

    .pwa-update-banner__btn--secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
    }

    /* ==================== Mobile Optimierung ==================== */
    
    @media (max-width: 768px) {
      .pwa-update-banner__content {
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
      }

      .pwa-update-banner__text {
        flex: 1 1 100%;
        order: 2;
      }

      .pwa-update-banner__icon {
        order: 1;
      }

      .pwa-update-banner__actions {
        order: 3;
        flex: 1 1 100%;
        margin-top: 0.5rem;
      }

      .pwa-update-banner__btn {
        flex: 1;
        padding: 0.625rem 1rem;
      }

      .pwa-update-banner__title {
        font-size: 0.875rem;
      }

      .pwa-update-banner__subtitle {
        font-size: 0.75rem;
      }
    }

    /* ==================== Sehr kleine Screens (< 400px) ==================== */
    
    @media (max-width: 400px) {
      .pwa-update-banner__subtitle {
        display: none; /* Subtitle verstecken auf sehr kleinen Screens */
      }
    }

    /* ==================== RTL Support (Arabisch) ==================== */
    
    [dir="rtl"] .pwa-update-banner__content {
      direction: rtl;
    }

    [dir="rtl"] .pwa-update-banner__actions {
      flex-direction: row-reverse;
    }

    /* ==================== Admin Sidebar Offset ==================== */
    
    /* Wenn Admin-Sidebar sichtbar (Desktop), Banner mit Offset */
    @media (min-width: 1024px) {
      .pwa-update-banner {
        left: var(--sidebar-width, 240px);
      }

      /* Wenn Sidebar collapsed */
      body:has(.sidebar-collapsed) .pwa-update-banner {
        left: 68px;
      }
    }

    /* Mobile: Sidebar ist Overlay, kein Offset nötig */
    @media (max-width: 1023px) {
      .pwa-update-banner {
        left: 0;
      }
    }
  `]
})
export class PwaUpdateBannerComponent {
  constructor(public pwaUpdate: PwaUpdateService) {}
}
