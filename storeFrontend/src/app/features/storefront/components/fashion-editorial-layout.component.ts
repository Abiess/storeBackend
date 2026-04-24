import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Fashion Editorial Layout — inspiriert von HTML5UP "Editorial" (CC-BY 3.0).
 *
 * Wrapper mit zentrierter, redaktioneller Optik (Serifen-Typo, viel Weißraum,
 * dezente Sidebar rechts). Akzeptiert die Standard-Slots:
 * - `[sidebar]` → rechts (Editorial-üblich)
 * - `[top]`     → Headline/Cover-Bereich
 * - `[main]`    → Produktraster
 *
 * Lizenz-Hinweis: HTML5UP-Templates stehen unter CC-BY 3.0
 * (https://creativecommons.org/licenses/by/3.0/). Diese Komponente rendert
 * automatisch einen kleinen Credit im Footer-Slot (`.editorial-credit`),
 * sodass Stores, die dieses Layout nutzen, lizenzkonform sind.
 */
@Component({
  selector: 'app-fashion-editorial-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ed-cover" *ngIf="showHero">
      <div class="ed-cover__inner">
        <ng-content select="[top]"></ng-content>
      </div>
    </section>

    <div class="ed-container">
      <main class="ed-main">
        <ng-content select="[main]"></ng-content>
      </main>
      <aside class="ed-sidebar">
        <ng-content select="[sidebar]"></ng-content>
      </aside>
    </div>

    <!-- CC-BY 3.0 Pflicht-Attribution für HTML5UP "Editorial" -->
    <div class="editorial-credit">
      Layout design: <a href="https://html5up.net/" rel="noopener" target="_blank">HTML5UP</a>
      (CC&nbsp;BY&nbsp;3.0)
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ed-cover {
      background: var(--theme-surface, #ffffff);
      color: var(--theme-text, #1f2937);
      padding: 5rem 1rem 3rem;
      text-align: center;
      border-bottom: 1px solid var(--theme-border, #e7e5e4);
    }
    .ed-cover__inner {
      max-width: 900px;
      margin: 0 auto;
    }

    .ed-container {
      max-width: var(--theme-container-width, 1280px);
      margin: 0 auto;
      padding: 3rem 1.5rem;
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 2.5rem;
      align-items: start;
      font-family: var(--theme-font-family, 'Cormorant Garamond', Georgia, serif);
    }

    .ed-main { min-width: 0; }

    .ed-sidebar {
      background: transparent;
      border-left: 1px solid var(--theme-border, #e7e5e4);
      padding-left: 1.5rem;
      position: sticky;
      top: 1rem;
    }

    .editorial-credit {
      max-width: var(--theme-container-width, 1280px);
      margin: 0 auto;
      padding: 1rem 1.5rem 2rem;
      font-size: 0.75rem;
      color: var(--theme-text-secondary, #6b7280);
      text-align: center;
      letter-spacing: 0.02em;
    }
    .editorial-credit a {
      color: inherit;
      text-decoration: underline;
    }

    @media (max-width: 992px) {
      .ed-container {
        grid-template-columns: 1fr;
      }
      .ed-sidebar {
        border-left: none;
        border-top: 1px solid var(--theme-border, #e7e5e4);
        padding-left: 0;
        padding-top: 1.5rem;
        position: static;
      }
      .ed-cover { padding: 3rem 1rem 2rem; }
    }
  `]
})
export class FashionEditorialLayoutComponent {
  @Input() showHero = true;
}

