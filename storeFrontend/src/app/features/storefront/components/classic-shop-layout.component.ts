import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Classic Shop Layout — inspiriert von Start Bootstrap "Shop Homepage" (MIT-Lizenz).
 *
 * Akzeptiert dieselben Content-Slots wie {@link StoreLayoutComponent}:
 * - `[sidebar]`  → Kategorien-Filter (links)
 * - `[top]`      → Hero-/Banner-Bereich (oben)
 * - `[main]`     → Produktraster (rechts)
 *
 * Damit kann der Storefront ohne Logikänderung zwischen Layouts switchen.
 */
@Component({
  selector: 'app-classic-shop-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Optionaler Hero-/Top-Bereich (z.B. Slider) -->
    <section class="classic-hero" *ngIf="showHero">
      <div class="classic-hero__inner">
        <ng-content select="[top]"></ng-content>
      </div>
    </section>

    <!-- Container mit Sidebar links + Produkt-Grid rechts -->
    <div class="classic-container">
      <aside class="classic-sidebar">
        <ng-content select="[sidebar]"></ng-content>
      </aside>

      <main class="classic-main">
        <ng-content select="[main]"></ng-content>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .classic-hero {
      background: var(--theme-primary, #198754);
      color: #ffffff;
      padding: 3rem 1rem;
    }
    .classic-hero__inner {
      max-width: var(--theme-container-width, 1200px);
      margin: 0 auto;
    }

    .classic-container {
      max-width: var(--theme-container-width, 1200px);
      margin: 0 auto;
      padding: 2rem 1rem;
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 2rem;
      align-items: start;
    }

    .classic-sidebar {
      background: var(--theme-surface, #f8f9fa);
      border: 1px solid var(--theme-border, #dee2e6);
      border-radius: var(--theme-radius, 6px);
      padding: 1rem;
      position: sticky;
      top: 1rem;
    }

    .classic-main {
      min-width: 0;
    }

    @media (max-width: 992px) {
      .classic-container {
        grid-template-columns: 1fr;
      }
      .classic-sidebar {
        position: static;
      }
    }
  `]
})
export class ClassicShopLayoutComponent {
  /** Hero-Bereich nur rendern, wenn ein top-Slot übergeben wird. */
  @Input() showHero = true;
}

