import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BayernApplication {
  title: string;
  description: string;
  url: string;
  guidance: readonly string[];
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
      <div class="search-feedback" role="status" aria-live="polite">
        <span>{{ filteredApplications.length }} von {{ applications.length }} Antragsarten angezeigt</span>
        <button *ngIf="searchTerm" type="button" (click)="searchTerm = ''">Suche zurücksetzen</button>
      </div>
      <button class="print-button" type="button" (click)="printOverview()">Übersicht drucken / als PDF speichern</button>
      <section class="application-grid" aria-label="Verwaltungsleistungen in Bayern">
        <article class="application-card" *ngFor="let application of filteredApplications">
          <h2>{{ application.title }}</h2>
          <p>{{ application.description }}</p>
          <details class="guidance">
            <summary>So gehst du vor</summary>
            <ol>
              <li *ngFor="let step of application.guidance">{{ step }}</li>
            </ol>
          </details>
          <a [href]="application.url" target="_blank" rel="noopener noreferrer">
            Offizielle Informationen öffnen ↗
            <span class="sr-only">(öffnet ein neues Fenster)</span>
          </a>
        </article>
      </section>
      <p *ngIf="filteredApplications.length === 0" role="status">Keine passenden Anträge gefunden.</p>

      <section class="faq" aria-labelledby="antragpilot-faq-title">
        <h2 id="antragpilot-faq-title">Häufige Fragen</h2>
        <details>
          <summary>Kann ich hier einen Antrag stellen?</summary>
          <p>Nein. AntragPilot bietet Orientierung. Anträge werden ausschließlich über die zuständigen offiziellen Stellen eingereicht.</p>
        </details>
        <details>
          <summary>Wie finde ich meine zuständige Behörde?</summary>
          <p>Öffne die offizielle Leistungsseite und wähle dort den passenden Ort beziehungsweise die zuständige Stelle aus.</p>
        </details>
        <details>
          <summary>Werden meine Angaben gespeichert?</summary>
          <p>Die Suche und die Anzeige der Informationen funktionieren ohne Übermittlung von Antragsdaten an AntragPilot. Externe Behördenseiten haben eigene Datenschutzhinweise.</p>
        </details>
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
    .search-field { margin-top: 1.5rem; max-width: 420px; display: grid; gap: .5rem; }
    .search-field label { font-weight: 600; }
    .search-field input { padding: .75rem; border: 1px solid #aab2c0; border-radius: 8px; font: inherit; }
    .search-field input:focus-visible { outline: 2px solid #365db7; outline-offset: 2px; }
    .search-feedback { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-top: .75rem; font-size: .9rem; color: #526072; }
    .search-feedback button { color: #365db7; background: transparent; border: 0; padding: .25rem; font: inherit; font-weight: 600; cursor: pointer; }
    .search-feedback button:focus-visible { outline: 2px solid #365db7; outline-offset: 2px; }
    .print-button { margin-top: 1rem; padding: .65rem 1rem; border: 1px solid #365db7; border-radius: 8px; background: transparent; color: #365db7; font: inherit; font-weight: 600; cursor: pointer; }
    .print-button:focus-visible { outline: 2px solid #365db7; outline-offset: 2px; }
    @media print {
      .antragpilot-page { max-width: none; margin: 0; padding: 0; color: #000; }
      .search-field, .search-feedback, .print-button { display: none !important; }
      .application-grid { display: block; }
      .application-card { break-inside: avoid; margin-bottom: 1rem; border-color: #aaa; }
      .guidance { display: block; }
      a { overflow-wrap: anywhere; }
    }
    .application-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .application-card { border: 1px solid #d8dce4; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; }
    .application-card h2 { margin: 0; font-size: 1.2rem; }
    .application-card p { flex: 1; }
    .guidance { margin-top: .8rem; padding: .7rem 0; border-top: 1px solid #d8dce4; }
    .guidance summary { cursor: pointer; font-weight: 600; }
    .guidance ol { padding-left: 1.4rem; margin-bottom: 0; }
    .guidance li { margin: .5rem 0; line-height: 1.5; }
    .application-card a { margin-top: 1rem; color: #365db7; font-weight: 600; }
    .faq { margin: 2rem 0; border-top: 1px solid #d8dce4; padding-top: 1rem; }
    .faq h2 { font-size: 1.3rem; }
    .faq details { border-bottom: 1px solid #d8dce4; padding: .8rem 0; }
    .faq summary { cursor: pointer; font-weight: 600; }
    .faq summary:focus-visible { outline: 2px solid #365db7; outline-offset: 2px; }
    .faq details p { margin-bottom: 0; }
    .notice { color: #526072; font-size: .9rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `]
})
export class AntragPilotComponent {
  printOverview(): void {
    window.print();
  }

  searchTerm = '';

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
      ]
    },
    {
      title: 'Einbürgerung',
      description: 'Informationen zum Onlineverfahren und zur zuständigen Einbürgerungsbehörde.',
      url: 'https://www.bayernportal.de/dokumente/onlineservice/77443319242',
      guidance: [
        'Öffne die offiziellen Informationen zur Einbürgerung.',
        'Prüfe dort die aktuellen Voraussetzungen und gegebenenfalls verfügbare Onlineverfahren.',
        'Informiere dich bei der zuständigen Behörde über die erforderlichen Nachweise.'
      ]
    },
    {
      title: 'Gewerbe anmelden',
      description: 'Hinweise zur Gewerbeanzeige und zur zuständigen Stelle.',
      url: 'https://www.bayernportal.de/dokumente/leistung/5777574439',
      guidance: [
        'Öffne die offiziellen Informationen zur Gewerbeanzeige.',
        'Prüfe, ob deine Tätigkeit eine Gewerbeanmeldung erfordert.',
        'Informiere dich über die zuständige Stelle, Unterlagen und mögliche Onlineverfahren.'
      ]
    }
  ];
}
