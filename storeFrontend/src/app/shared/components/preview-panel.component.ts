import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreviewPanelService, PreviewMiniData } from '../../core/services/preview-panel.service';

/**
 * Wiederverwendbares Sliding-Preview-Panel + FAB-Button.
 *
 * Einbinden: Einmalig in `app.component.ts` (global), analog zu `app-fab-host`.
 * Steuern:   Über `PreviewPanelService` (register / update / toggle / clear).
 *
 * Features:
 *  - Gleitet von rechts ins Bild (CSS-Transition)
 *  - Tab "🎨 Stil" → eingebaute Mini-Storefront-Vorschau (Farben + Schrift)
 *  - Tab "🌐 Live" → Iframe mit Cache-Buster
 *  - FAB unten rechts, animiert (lila Gradient)
 *  - Overlay-Backdrop schließt Panel per Klick
 *  - Mobile: Panel full-width, FAB als Kreis
 */
@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.config()) {
      <!-- ─── FAB ──────────────────────────────────────── -->
      <button class="pp-fab"
              [class.pp-fab--active]="svc.isOpen()"
              (click)="svc.toggle()"
              [title]="svc.isOpen() ? 'Vorschau schließen' : 'Vorschau öffnen'">
        <span class="pp-fab__icon">{{ svc.isOpen() ? '✕' : '👁' }}</span>
        <span class="pp-fab__label">{{ svc.isOpen() ? 'Schließen' : 'Vorschau' }}</span>
      </button>

      <!-- ─── SIDE-PANEL ───────────────────────────── -->
      <div class="pp-panel" [class.pp-panel--open]="svc.isOpen()">

        <!-- Header -->
        <div class="pp-panel__header">
          <div class="pp-panel__title">
            <span>{{ svc.config()!.title }}</span>
            @if (svc.config()!.badge) {
              <span class="pp-panel__badge">{{ svc.config()!.badge }}</span>
            }
          </div>
          <div class="pp-panel__tabs">
            <button class="pp-tab" [class.pp-tab--active]="svc.mode() === 'mini'"
                    (click)="svc.setMode('mini')">🎨 Stil</button>
            <button class="pp-tab" [class.pp-tab--active]="svc.mode() === 'live'"
                    (click)="svc.setMode('live')">🌐 Live</button>
            @if (svc.mode() === 'live') {
              <button class="pp-tab" (click)="svc.reload()" title="Neu laden">↻</button>
            }
          </div>
          <button class="pp-panel__close" (click)="svc.close()">✕</button>
        </div>

        <!-- Body: Stil-Vorschau -->
        @if (svc.mode() === 'mini') {
          <div class="pp-panel__body">
            @if (miniData(); as md) {
              <div class="mini-preview"
                   [style.background]="md.colors.background"
                   [style.color]="md.colors.text"
                   [style.font-family]="md.typography.fontFamily">
                <!-- Fake Navbar -->
                <div class="mini-nav" [style.background]="md.colors.primary">
                  <span class="mini-nav__logo" style="color:#fff">🛍 Mein Shop</span>
                  <div class="mini-nav__links">
                    <span style="color:rgba(255,255,255,0.8)">Produkte</span>
                    <span style="color:rgba(255,255,255,0.8)">Über uns</span>
                  </div>
                </div>
                <!-- Hero -->
                <div class="mini-hero"
                     [style.background]="'linear-gradient(135deg,' + md.colors.primary + ',' + md.colors.secondary + ')'">
                  <h3 style="color:#fff;margin:0 0 .5rem">Willkommen! 🎉</h3>
                  <p style="color:rgba(255,255,255,0.9);margin:0 0 1rem;font-size:.85rem">Entdecke unsere Produkte</p>
                  <button class="mini-btn" [style.background]="md.colors.accent" style="color:#fff">
                    Jetzt shoppen
                  </button>
                </div>
                <!-- Produkt-Kacheln -->
                <div class="mini-products">
                  @for (p of [1,2,3]; track p) {
                    <div class="mini-product" [style.border]="'1px solid ' + (md.colors.border || '#e5e7eb')">
                      <div class="mini-product__img" [style.background]="md.colors.primary + '22'">🖼</div>
                      <div class="mini-product__info">
                        <div class="mini-product__name" [style.color]="md.colors.text">Produkt {{ p }}</div>
                        <div class="mini-product__price" [style.color]="md.colors.accent">€{{ 19 * p }}.99</div>
                        <button class="mini-btn mini-btn--sm"
                                [style.background]="md.colors.primary"
                                style="color:#fff">In den Warenkorb</button>
                      </div>
                    </div>
                  }
                </div>
                <!-- Footer -->
                <div class="mini-footer" [style.background]="md.colors.text" style="color:#fff">
                  <small>© 2026 Mein Shop · Alle Rechte vorbehalten</small>
                </div>
              </div>
            } @else {
              <div class="pp-empty">
                <p>👆 Wähle ein Theme oder passe Farben an,<br>um die Vorschau zu sehen.</p>
              </div>
            }
          </div>
        }

        <!-- Body: Live-Iframe -->
        @if (svc.mode() === 'live') {
          <div class="pp-panel__body pp-panel__body--iframe">
            <p class="live-hint">
              <strong class="live-hint__url">{{ svc.config()!.liveBaseUrl }}</strong>
              <a [href]="svc.config()!.liveBaseUrl" target="_blank" rel="noopener" class="live-hint__open">↗ Tab</a>
            </p>
            <iframe class="pp-iframe"
                    [src]="svc.config()!.liveUrl"
                    title="Live Storefront"
                    loading="lazy"
                    referrerpolicy="no-referrer">
            </iframe>
          </div>
        }
      </div>

      <!-- ─── OVERLAY-BACKDROP ──────────────────────── -->
      @if (svc.isOpen()) {
        <div class="pp-backdrop" (click)="svc.close()"></div>
      }
    }
  `,
  styles: [`
    /* ═══ FAB ══════════════════════════════════════════════ */
    .pp-fab {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1100;
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .75rem 1.25rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 50px;
      font-size: .95rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102,126,234,.5);
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
    }
    .pp-fab:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(102,126,234,.6);
    }
    .pp-fab.pp-fab--active {
      background: linear-gradient(135deg, #e53e3e, #c53030);
      box-shadow: 0 4px 20px rgba(229,62,62,.4);
    }
    .pp-fab__icon { font-size: 1.1rem; }
    .pp-fab__label { font-size: .875rem; }

    /* ═══ SIDE-PANEL ════════════════════════════════════════ */
    .pp-panel {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: 420px;
      max-width: 95vw;
      z-index: 1090;
      background: #fff;
      box-shadow: -8px 0 40px rgba(0,0,0,.18);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform .35s cubic-bezier(.4,0,.2,1);
      border-radius: 16px 0 0 16px;
      overflow: hidden;
    }
    .pp-panel--open { transform: translateX(0); }

    /* Header */
    .pp-panel__header {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      flex-shrink: 0;
    }
    .pp-panel__title {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-weight: 700;
      font-size: 1rem;
      flex: 1;
    }
    .pp-panel__badge {
      background: rgba(255,255,255,.25);
      padding: .15rem .5rem;
      border-radius: 10px;
      font-size: .7rem;
      font-weight: 500;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pp-panel__tabs { display: flex; gap: .25rem; }
    .pp-tab {
      background: rgba(255,255,255,.15);
      color: #fff;
      border: 1px solid rgba(255,255,255,.3);
      border-radius: 6px;
      padding: .3rem .65rem;
      font-size: .78rem;
      cursor: pointer;
      transition: background .2s;
    }
    .pp-tab:hover { background: rgba(255,255,255,.25); }
    .pp-tab--active {
      background: rgba(255,255,255,.35);
      border-color: rgba(255,255,255,.6);
      font-weight: 600;
    }
    .pp-panel__close {
      background: rgba(255,255,255,.15);
      color: #fff;
      border: none;
      width: 30px; height: 30px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s;
      flex-shrink: 0;
    }
    .pp-panel__close:hover { background: rgba(255,255,255,.3); }

    /* Body */
    .pp-panel__body {
      flex: 1;
      overflow-y: auto;
    }
    .pp-panel__body--iframe {
      display: flex;
      flex-direction: column;
      padding: .75rem;
      gap: .5rem;
    }

    /* Mini-Vorschau */
    .mini-preview { display: flex; flex-direction: column; min-height: 100%; }
    .mini-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .75rem 1rem;
    }
    .mini-nav__logo { font-weight: 700; font-size: .95rem; }
    .mini-nav__links { display: flex; gap: 1rem; font-size: .78rem; }
    .mini-hero { padding: 2rem 1.5rem; text-align: center; }
    .mini-btn {
      border: none; border-radius: 6px;
      padding: .5rem 1rem;
      font-size: .8rem; font-weight: 600; cursor: default;
    }
    .mini-btn--sm { padding: .35rem .75rem; font-size: .72rem; margin-top: .5rem; }
    .mini-products {
      display: grid;
      grid-template-columns: repeat(3,1fr);
      gap: .5rem;
      padding: 1rem;
    }
    .mini-product {
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .mini-product__img {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .mini-product__info { padding: .4rem; }
    .mini-product__name { font-size: .72rem; font-weight: 600; margin-bottom: .2rem; }
    .mini-product__price { font-size: .78rem; font-weight: 700; margin-bottom: .3rem; }
    .mini-footer { padding: .75rem 1rem; text-align: center; margin-top: auto; }

    /* Live-Iframe */
    .live-hint {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .4rem .6rem;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: .75rem;
    }
    .live-hint__url {
      flex: 1; color: #1d4ed8;
      font-family: monospace;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .live-hint__open { color: #2563eb; text-decoration: none; font-weight: 600; white-space: nowrap; }
    .pp-iframe {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      min-height: 0;
      height: calc(100vh - 120px);
    }

    /* Empty-State */
    .pp-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      text-align: center;
      color: #94a3b8;
      font-size: .9rem;
      line-height: 1.6;
      padding: 2rem;
    }

    /* Overlay */
    .pp-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1080;
      background: rgba(0,0,0,.3);
      backdrop-filter: blur(2px);
      animation: ppFadeIn .25s ease;
    }
    @keyframes ppFadeIn { from{opacity:0} to{opacity:1} }

    /* Mobile */
    @media (max-width: 480px) {
      .pp-panel { width: 100vw; border-radius: 0; }
      .pp-fab { padding: .75rem; border-radius: 50%; }
      .pp-fab__label { display: none; }
    }
  `]
})
export class PreviewPanelComponent {
  constructor(readonly svc: PreviewPanelService) {}

  miniData(): PreviewMiniData | null {
    return this.svc.config()?.miniData ?? null;
  }
}

