import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BayernApplication {
  title: string;
  description: string;
  url: string;
  guidance: readonly string[];
  exampleDocuments: readonly string[];
}

@Component({
  selector: 'app-antragpilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="antragpilot-page">
      <div class="intro-label">Bayern · Pilotphase</div>
      <h1>AntragPilot</h1>
      <p class="lead">Behördengänge einfacher verstehen – Schritt für Schritt.</p>
      <p>Wähle ein Thema und öffne die offiziellen Informationen im BayernPortal.
        Dort kannst du deinen Wohnort auswählen und die zuständige Behörde finden.</p>

      <div class="search-field">
        <label for="antragpilot-search">Antrag suchen</label>
        <input id="antragpilot-search" type="search" name="applicationSearch"
          [(ngModel)]="searchTerm" placeholder="z. B. Einbürgerung" autocomplete="off" />
      </div>
      <section class="application-grid" aria-label="Verwaltungsleistungen in Bayern">
        <article class="application-card" *ngFor="let application of filteredApplications">
          <h2>{{ application.title }}</h2>
          <p>{{ application.description }}</p>
          <details class="guidance">
            <summary>So gehst du vor</summary>
            <ol>
              <li *ngFor="let step of application.guidance; let i = index">
                <label class="step-checkbox">
                  <input type="checkbox" [checked]="isDone(application.title, i)"
                    (change)="toggleDone(application.title, i)" />
                  <span [class.done]="isDone(application.title, i)">{{ step }}</span>
                </label>
              </li>
            </ol>
          </details>
          <details class="documents">
            <summary>Häufig benötigte Unterlagen (Beispiele)</summary>
            <p>Die konkrete Liste legt die zuständige Behörde fest. Je nach Fall kann sie abweichen.</p>
            <ul><li *ngFor="let document of application.exampleDocuments">{{ document }}</li></ul>
          </details>
          <a [href]="application.url" target="_blank" rel="noopener noreferrer">
            Offizielle Informationen öffnen ↗
            <span class="sr-only">(öffnet ein neues Fenster)</span>
          </a>
        </article>
      </section>
      <p *ngIf="filteredApplications.length === 0" role="status">Keine passenden Anträge gefunden.</p>

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
    .search-field { margin-top: 1.5rem; max-width: 420px; display: grid; gap: .5rem; }
    .search-field label { font-weight: 600; }
    .search-field input { padding: .75rem; border: 1px solid #aab2c0; border-radius: 8px; font: inherit; }
    .search-field input:focus-visible { outline: 2px solid #365db7; outline-offset: 2px; }
    .application-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .application-card { border: 1px solid #d8dce4; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; }
    .application-card h2 { margin: 0; font-size: 1.2rem; }
    .application-card p { flex: 1; }
    .documents { margin-top: .7rem; padding: .7rem 0; border-top: 1px solid #d8dce4; }
    .documents summary { cursor: pointer; font-weight: 600; }
    .documents ul { padding-left: 1.4rem; }
    .documents li { margin: .4rem 0; line-height: 1.5; }
    .guidance { margin-top: .8rem; padding: .7rem 0; border-top: 1px solid #d8dce4; }
    .guidance summary { cursor: pointer; font-weight: 600; }
    .guidance ol { padding-left: 1.4rem; margin-bottom: 0; }
    .step-checkbox { display: flex; align-items: flex-start; gap: .6rem; cursor: pointer; }
    .step-checkbox input { margin-top: .25rem; accent-color: #365db7; }
    .step-checkbox .done { text-decoration: line-through; color: #526072; }
    .guidance li { margin: .5rem 0; line-height: 1.5; }
    .application-card a { margin-top: 1rem; color: #365db7; font-weight: 600; }
    .notice { color: #526072; font-size: .9rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `]
})
export class AntragPilotComponent {
  searchTerm = '';
  // UI-only state: nothing is persisted or sent to a server.
  private readonly checkedSteps = new Set<string>();

  private stepKey(title: string, index: number): string { return `${title}:${index}`; }

  isDone(title: string, index: number): boolean {
    return this.checkedSteps.has(this.stepKey(title, index));
  }

  toggleDone(title: string, index: number): void {
    const key = this.stepKey(title, index);
    if (this.checkedSteps.has(key)) this.checkedSteps.delete(key);
    else this.checkedSteps.add(key);
  }

  get filteredApplications(): readonly BayernApplication[] {
    const term = this.searchTerm.trim().toLocaleLowerCase('de-DE');
    if (!term) return this.applications;
    return this.applications.filter(application =>
      `${application.title} ${application.description}`.toLocaleLowerCase('de-DE').includes(term)
    );
  }

  readonly applications: readonly BayernApplication[] = [
    {
      title: 'Aufenthaltstitel verlängern',
      description: 'Informationen zur Aufenthaltserlaubnis und zur zuständigen Ausländerbehörde.',
      url: 'https://www.bayernportal.de/dokumente/leistung/736199102498',
      guidance: [
        'Öffne die Informationen zur Aufenthaltserlaubnis im BayernPortal.',
        'Prüfe dort, welches Verfahren für deinen Aufenthaltstitel gilt.',
        'Informiere dich über die für deinen Wohnort zuständige Ausländerbehörde und deren Hinweise.'
      ],
      exampleDocuments: ['Gültiger Reisepass', 'Aktuelles biometrisches Lichtbild', 'Nachweis über Lebensunterhalt und Krankenversicherung', 'Nachweis zum Aufenthaltszweck (z. B. Arbeitsvertrag)']
    },
    {
      title: 'Einbürgerung',
      description: 'Informationen zum Onlineverfahren und zur zuständigen Einbürgerungsbehörde.',
      url: 'https://www.bayernportal.de/dokumente/onlineservice/77443319242',
      guidance: [
        'Öffne die offiziellen Informationen zur Einbürgerung.',
        'Prüfe dort die aktuellen Voraussetzungen und gegebenenfalls verfügbare Onlineverfahren.',
        'Informiere dich bei der zuständigen Behörde über die erforderlichen Nachweise.'
      ],
      exampleDocuments: ['Reisepass oder anderes anerkanntes Identitätsdokument', 'Nachweise über Deutschkenntnisse', 'Nachweis über Einbürgerungstest oder anerkannten Schulabschluss', 'Nachweise über Einkommen und Versicherungsschutz']
    },
    {
      title: 'Gewerbe anmelden',
      description: 'Hinweise zur Gewerbeanzeige und zur zuständigen Stelle.',
      url: 'https://www.bayernportal.de/dokumente/leistung/5777574439',
      guidance: [
        'Öffne die offiziellen Informationen zur Gewerbeanzeige.',
        'Prüfe, ob deine Tätigkeit eine Gewerbeanmeldung erfordert.',
        'Informiere dich über die zuständige Stelle, Unterlagen und mögliche Onlineverfahren.'
      ],
      exampleDocuments: ['Personalausweis oder Reisepass', 'Bei juristischen Personen: Handelsregisterauszug oder entsprechende Unterlagen', 'Bei erlaubnis- oder überwachungsbedürftigen Tätigkeiten: gegebenenfalls zusätzliche Nachweise']
    }
  ];
}
