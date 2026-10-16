import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/** First, intentionally read-only step of AntragPilot. No account data or API calls. */
@Component({
  selector: 'app-antragpilot',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="antragpilot-page">
      <div class="intro-label">Bayern · Pilotphase</div>
      <h1>AntragPilot</h1>
      <p class="lead">Behördengänge einfacher verstehen – Schritt für Schritt.</p>
      <p>Hier entsteht eine Orientierungshilfe für Verwaltungsleistungen in Bayern.
        Später sollen verständliche Checklisten und offizielle Antragswege folgen.</p>
      <section aria-label="Geplante Funktionen" class="panel">
        <h2>Das ist geplant</h2>
        <ul>
          <li>Passende Behörden und Anträge in Bayern finden</li>
          <li>Benötigte Unterlagen als Checkliste anzeigen</li>
          <li>Auf die offiziellen Onlineverfahren weiterleiten</li>
        </ul>
      </section>
      <p class="notice">Noch kein Antragsassistent: Diese Testseite verarbeitet und speichert keine persönlichen Daten.
        Es findet keine Antragstellung statt. Keine amtliche oder rechtliche Beratung.</p>
      <a href="https://www.bayernportal.de/" target="_blank" rel="noopener noreferrer">BayernPortal – offizielle Verwaltungsleistungen ↗</a>
    </main>
  `,
  styles: [`
    .antragpilot-page { max-width: 780px; margin: 2rem auto; padding: 1.5rem; color: var(--text-primary, #202938); }
    .intro-label { color: #365db7; font-weight: 600; margin-bottom: .4rem; }
    h1 { font-size: 2rem; margin: 0 0 .5rem; }
    .lead { font-size: 1.2rem; font-weight: 500; }
    p, li { line-height: 1.65; }
    .panel { border: 1px solid #d8dce4; border-radius: 12px; padding: 1rem 1.5rem; margin: 1.5rem 0; }
    .panel h2 { margin-top: .25rem; font-size: 1.25rem; }
    .notice { color: #526072; font-size: .9rem; }
    a { display: inline-block; margin-top: 1rem; }
  `]
})
export class AntragPilotComponent {}
