import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Electronics Pro Layout — inspiriert von Start Bootstrap "Modern Business" (MIT-Lizenz).
 *
 * Wrapper mit Tech-Hero-Banner + breitem 4er-Produktraster.
 * Akzeptiert dieselben Slots wie {@link StoreLayoutComponent}:
 * - `[sidebar]` → Filter (links)
 * - `[top]`     → Hero/Promo
 * - `[main]`    → Produktraster
 *
 * Quelle/Inspiration: https://startbootstrap.com/  (MIT — keine Attribution-Pflicht)
 */
@Component({
  selector: 'app-electronics-pro-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="elec-hero" *ngIf="showHero">
      <div class="elec-hero__inner">
        <ng-content select="[top]"></ng-content>
      </div>
    </section>

    <div class="elec-container">
      <aside class="elec-sidebar">
        <ng-content select="[sidebar]"></ng-content>
      </aside>
      <main class="elec-main">
        <ng-content select="[main]"></ng-content>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .elec-hero {
      background: linear-gradient(135deg, var(--theme-primary, #0ea5e9), var(--theme-secondary, #0369a1));
      color: #ffffff;
      padding: 4rem 1rem;
      position: relative;
      overflow: hidden;
    }
    .elec-hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(255,255,255,0.06) 0, transparent 50%);
      pointer-events: none;
    }
    .elec-hero__inner {
      max-width: var(--theme-container-width, 1320px);
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .elec-container {
      max-width: var(--theme-container-width, 1320px);
      margin: 0 auto;
      padding: 2.5rem 1rem;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 2rem;
      align-items: start;
    }

    .elec-sidebar {
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border, #e2e8f0);
      border-radius: var(--theme-radius, 8px);
      padding: 1.25rem;
      position: sticky;
      top: 1rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .elec-main {
      min-width: 0;
    }

    @media (max-width: 992px) {
      .elec-container { grid-template-columns: 1fr; }
      .elec-sidebar { position: static; }
      .elec-hero { padding: 2.5rem 1rem; }
    }
  `]
})
export class ElectronicsProLayoutComponent {
  @Input() showHero = true;
}

