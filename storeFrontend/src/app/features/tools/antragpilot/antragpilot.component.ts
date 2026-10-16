import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BayernApplication {
  title: string;
  description: string;
  url: string;
}

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
      <p>Wähle ein Thema und öffne die offiziellen Informationen im BayernPortal.
        Dort kannst du deinen Wohnort auswählen und die zuständige Behörde finden.</p>

      <section class="application-grid" aria-label="Verwaltungsleistungen in Bayern">
        <article class="application-card" *ngFor="let application of applications">
          <h2>{{ application.title }}</h2>
          <p>{{ application.description }}</p>
          <a [href]="application.url" target="_blank" rel="noopener noreferrer">
            Offizielle Informationen öffnen ↗
            <span class="sr-only">(öffnet ein neues Fenster)</span>
          </a>
        </article>
      </section>

      <p class="notice">Die Informationen und Antragswege können je nach Wohnort und persönlicher Situation variieren.
        AntragPilot ist keine Behörde und bietet keine Rechtsberatung. Hier werden keine persönlichen Daten
        erhoben oder gespeichert; es findet keine Antragstellung statt.</p>
    </main>
  `,
  styles: [`
    .antragpilot-page { max-width: 920px; margin: 2rem auto; padding: 1.5rem; color: var(--text-primary, #202938); }
    .intro-label { color: #365db7; font-weight: 600; margin-bottom: .4rem; }
    h1 { font-size: 2rem; margin: 0 0 .5rem; }
    .lead { font-size: 1.2rem; font-weight: 500; }
    p { line-height: 1.65; }
    .application-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .application-card { border: 1px solid #d8dce4; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; }
    .application-card h2 { margin: 0; font-size: 1.2rem; }
    .application-card p { flex: 1; }
    .application-card a { margin-top: 1rem; color: #365db7; font-weight: 600; }
    .notice { color: #526072; font-size: .9rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `]
})
export class AntragPilotComponent {
  readonly applications: readonly BayernApplication[] = [
    {
      title: 'Aufenthaltstitel verlängern',
      description: 'Informationen zur Aufenthaltserlaubnis und zur zuständigen Ausländerbehörde.',
      url: 'https://www.bayernportal.de/dokumente/leistung/736199102498'
    },
    {
      title: 'Einbürgerung',
      description: 'Informationen zum Onlineverfahren und zur zuständigen Einbürgerungsbehörde.',
      url: 'https://www.bayernportal.de/dokumente/onlineservice/77443319242'
    },
    {
      title: 'Gewerbe anmelden',
      description: 'Hinweise zur Gewerbeanzeige und zur zuständigen Stelle.',
      url: 'https://www.bayernportal.de/dokumente/leistung/5777574439'
    }
  ];
}
