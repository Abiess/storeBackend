import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FabService, SpeedDialItem } from '../../core/services/fab.service';

@Component({
  selector: 'app-fab-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (fab()) {
      <!-- Speed-Dial Overlay -->
      @if (speedDialOpen() && fab()!.speedDial?.length) {
        <div class="fab-backdrop" (click)="speedDialOpen.set(false)"></div>
        <div class="fab-speed-dial">
          @for (item of fab()!.speedDial!; track item.label) {
            <button class="fab-speed-item"
                    (click)="runSpeedItem(item)"
                    [style.background]="item.color || 'var(--fab-color)'">
              <span class="fab-speed-item__icon">{{ item.icon }}</span>
              <span class="fab-speed-item__label">{{ item.label }}</span>
            </button>
          }
        </div>
      }

      <!-- Haupt-FAB -->
      <button class="fab"
              [class]="'fab fab--' + (fab()!.color || 'primary')"
              [class.fab--open]="speedDialOpen()"
              (click)="onFabClick()"
              [title]="fab()!.label">
        <span class="fab__icon">{{ speedDialOpen() ? '✕' : fab()!.icon }}</span>
        <span class="fab__label">{{ speedDialOpen() ? 'Schließen' : fab()!.label }}</span>
      </button>
    }
  `,
  styles: [`
    /* ═══════════════════════════════════════════
       GLOBALER FAB HOST
       ═══════════════════════════════════════════ */
    .fab {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1200;
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .8rem 1.3rem;
      border: none;
      border-radius: 50px;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,.25);
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
      white-space: nowrap;
    }
    .fab:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(0,0,0,.3);
    }
    .fab--open { transform: rotate(45deg) scale(1.05); }
    .fab--open:hover { transform: rotate(45deg) scale(1.08); }

    /* Farb-Varianten */
    .fab--primary  { background: linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
    .fab--green    { background: linear-gradient(135deg,#48bb78,#38a169); color:#fff; }
    .fab--orange   { background: linear-gradient(135deg,#ed8936,#dd6b20); color:#fff; }
    .fab--red      { background: linear-gradient(135deg,#f56565,#e53e3e); color:#fff; }
    .fab--teal     { background: linear-gradient(135deg,#4fd1c5,#2c7a7b); color:#fff; }

    .fab__icon { font-size: 1.1rem; }
    .fab__label { font-size: .82rem; }

    /* Speed-Dial */
    .fab-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1190;
      background: rgba(0,0,0,.2);
      backdrop-filter: blur(2px);
      animation: fadeIn .2s ease;
    }
    .fab-speed-dial {
      position: fixed;
      bottom: 5.5rem;
      right: 2rem;
      z-index: 1195;
      display: flex;
      flex-direction: column;
      gap: .6rem;
      align-items: flex-end;
      animation: slideUp .25s cubic-bezier(.34,1.56,.64,1);
    }
    .fab-speed-item {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .55rem 1rem;
      border: none;
      border-radius: 50px;
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      box-shadow: 0 3px 12px rgba(0,0,0,.2);
      transition: all .2s ease;
      white-space: nowrap;
    }
    .fab-speed-item:hover {
      transform: translateX(-4px) scale(1.04);
      box-shadow: 0 5px 18px rgba(0,0,0,.25);
    }
    .fab-speed-item__icon { font-size: 1rem; }
    .fab-speed-item__label { font-size: .8rem; }

    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

    /* Mobile */
    @media (max-width: 480px) {
      .fab { padding:.8rem; border-radius:50%; }
      .fab__label { display:none; }
      .fab-speed-dial { right:1rem; bottom:5rem; }
    }
  `]
})
export class FabHostComponent {
  readonly fab = this.fabService.config;
  readonly speedDialOpen = signal(false);

  constructor(private fabService: FabService) {}

  onFabClick(): void {
    const cfg = this.fab();
    if (!cfg) return;
    if (cfg.speedDial?.length) {
      this.speedDialOpen.update(v => !v);
    } else {
      cfg.action();
    }
  }

  runSpeedItem(item: SpeedDialItem): void {
    this.speedDialOpen.set(false);
    item.action();
  }
}

