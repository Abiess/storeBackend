import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ApkDownload {
  name: string;
  description: string;
  fileName: string;
  releaseTag: string;
}

@Component({
  selector: 'app-apk-downloads',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="downloads">
      <a href="/">← Zurück zu markt.ma</a>
      <h1>Android-Apps herunterladen</h1>
      <p>Hier findest du die zuletzt erfolgreich veröffentlichten Android-Testversionen von markt.ma. Bei einem erfolgreichen Build auf <strong>master</strong> werden die Downloads automatisch aktualisiert.</p>
      <p class="warning"><strong>Hinweis:</strong> Dies sind Debug-/Test-APKs, keine Play-Store-Releases. Installiere sie nur auf einem Testgerät. Nicht jede markt.ma-Anwendung besitzt bereits eine eigene APK.</p>
      <div class="cards">
        <article *ngFor="let app of apps">
          <h2>{{ app.name }}</h2>
          <p>{{ app.description }}</p>
          <a [href]="downloadUrl(app)" target="_blank" rel="noopener noreferrer" [attr.aria-label]="app.name + ' APK herunterladen'">APK herunterladen</a>
          <small>Automatisch aktualisierte Testversion · {{ app.fileName }}</small>
        </article>
      </div>
      <p>Ein Download ist erst verfügbar, nachdem der zugehörige GitHub-Workflow erfolgreich auf <code>master</code> gelaufen ist. Falls ein Link noch nicht funktioniert, wurde dieser Release noch nicht veröffentlicht.</p>
      <a href="https://github.com/Abiess/storeBackend/releases" target="_blank" rel="noopener noreferrer">Alle veröffentlichten Versionen auf GitHub ansehen</a>
    </main>
  `,
  styles: [`
    .downloads { max-width: 1000px; margin: 2rem auto; padding: 1.5rem; color: var(--text-primary, #202938); }
    h1 { font-size: 2rem; }
    p { line-height: 1.65; }
    .warning { padding: 1rem; border: 1px solid #b6a576; border-radius: 8px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 1rem; margin: 1.5rem 0; }
    article { display: flex; flex-direction: column; gap: .75rem; border: 1px solid #d8dce4; border-radius: 12px; padding: 1.25rem; }
    article h2 { margin: 0; font-size: 1.25rem; }
    article p { flex: 1; margin: 0; }
    a { color: #365db7; }
    article a { font-weight: 700; }
    small { color: #526072; }
    a:focus-visible { outline: 2px solid #365db7; outline-offset: 3px; }
  `]
})
export class ApkDownloadsComponent {
  readonly apps: readonly ApkDownload[] = [
    { name: 'Documents', description: 'Persönlicher Dokumententresor', releaseTag: 'apk-flutter-latest', fileName: 'documents-debug.apk' },
    { name: 'Shop (Flutter)', description: 'Vorschau der Kunden-Shop-App', releaseTag: 'apk-flutter-latest', fileName: 'shop-preview-debug.apk' },
    { name: 'Shop Marrakesch', description: 'Kunden-Shop-App mit Marrakesch als Startshop', releaseTag: 'apk-flutter-latest', fileName: 'shop-marrakesch-debug.apk' },
    { name: 'markt.ma (Capacitor)', description: 'Android-Testversion der markt.ma-Webplattform', releaseTag: 'apk-capacitor-latest', fileName: 'markt-ma-debug.apk' }
  ];

  downloadUrl(app: ApkDownload): string {
    return `https://github.com/Abiess/storeBackend/releases/download/${app.releaseTag}/${app.fileName}`;
  }
}
