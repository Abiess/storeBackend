# 🎥 Video-Setup-Anleitung für Landing Page

## Übersicht
Die Landing-Page enthält eine vollständige Video-Demo-Sektion mit:
- 1 Haupt-Demo-Video (Landing Page Walkthrough)
- 3 Tutorial-Videos (Registrierung, Produkt erstellen, Shop anpassen)

## ✅ Was bereits implementiert ist

### 1. Video-Sektion in der Landing-Page
- **Haupt-Demo-Video**: Große Video-Präsentation mit Titel und Beschreibung
- **Tutorial-Grid**: 3 kleinere Video-Karten mit Thumbnails und Beschreibungen
- **Responsive Design**: Funktioniert auf Desktop, Tablet und Mobile
- **Professionelles Styling**: Moderne Animationen und Hover-Effekte

### 2. Cypress Video-Aufnahme-Tests
Alle 4 Tests sind fertig konfiguriert:
- `01-landing-demo.cy.ts` - Vollständiger Landing Page Walkthrough
- `02-how-to-register.cy.ts` - Registrierungs-Tutorial
- `03-how-to-create-product.cy.ts` - Produkt erstellen Tutorial
- `04-how-to-customize-store.cy.ts` - Shop anpassen Tutorial

## 📹 Videos aufnehmen - Schritt für Schritt

### Schritt 1: Development Server starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\storeFrontend
npm start
```
Warten Sie, bis der Server läuft (http://localhost:4200)

### Schritt 2: Videos aufnehmen

**Option A - Alle Videos auf einmal aufnehmen:**
```bash
# In einem NEUEN Terminal-Fenster
npx cypress run
```

**Option B - Einzelne Videos aufnehmen:**
```bash
# Nur Landing Demo
npx cypress run --spec "cypress/e2e/01-landing-demo.cy.ts"

# Nur Registrierung
npx cypress run --spec "cypress/e2e/02-how-to-register.cy.ts"

# Nur Produkt erstellen
npx cypress run --spec "cypress/e2e/03-how-to-create-product.cy.ts"

# Nur Shop anpassen
npx cypress run --spec "cypress/e2e/04-how-to-customize-store.cy.ts"
```

**Option C - Cypress UI öffnen (zum Testen):**
```bash
npx cypress open
```

### Schritt 3: Videos werden automatisch gespeichert
Die Videos werden automatisch gespeichert in:
```
src/assets/videos/
```

Die Dateinamen entsprechen den Cypress-Test-Namen:
- `01-landing-demo.cy.ts.mp4`
- `02-how-to-register.cy.ts.mp4`
- `03-how-to-create-product.cy.ts.mp4`
- `04-how-to-customize-store.cy.ts.mp4`

## 🎬 Video-Einstellungen

Die Videos werden automatisch mit diesen Einstellungen aufgenommen:
- **Auflösung**: 1920x1080 (Full HD)
- **Kompression**: 32 (gute Balance zwischen Qualität und Dateigröße)
- **Format**: MP4
- **Speicherort**: `src/assets/videos/`

## 🔄 Alternative: Platzhalter-Videos verwenden

Falls Sie die Videos nicht sofort aufnehmen möchten, können Sie Platzhalter verwenden:

### Option 1: Video-Sektion temporär ausblenden
Kommentieren Sie in `landing.component.html` die Video-Sektion aus:
```html
<!-- Video Demo Section -->
<!-- <section id="demo" class="video-demo-section">
  ...
</section> -->
```

### Option 2: Platzhalter-Nachricht anzeigen
Ersetzen Sie die `<video>`-Tags mit einer Nachricht:
```html
<div class="video-placeholder">
  <p>📹 Demo-Video wird in Kürze verfügbar sein</p>
</div>
```

## 🎯 Was die Videos zeigen

### 1. Landing Demo (01-landing-demo.cy.ts)
- Hero-Sektion mit Statistiken
- Features-Übersicht
- Pricing-Pläne
- CTA-Sektion
- **Dauer**: ~30 Sekunden

### 2. Registrierungs-Tutorial (02-how-to-register.cy.ts)
- Navigiert zur Registrierungsseite
- Füllt das Formular aus
- Zeigt erfolgreiche Registrierung
- **Dauer**: ~20 Sekunden

### 3. Produkt erstellen Tutorial (03-how-to-create-product.cy.ts)
- Login-Prozess
- Navigation zu Produkten
- Produkt-Formular ausfüllen
- **Dauer**: ~25 Sekunden

### 4. Shop anpassen Tutorial (04-how-to-customize-store.cy.ts)
- Shop-Einstellungen öffnen
- Theme-Anpassungen
- Speichern der Änderungen
- **Dauer**: ~20 Sekunden

## 📱 Mobile Ansicht

Die Video-Sektion ist vollständig responsive:
- **Desktop**: 3 Tutorial-Videos nebeneinander
- **Tablet**: Tutorial-Videos untereinander
- **Mobile**: Optimierte Ansicht mit Touch-Controls

## 🎨 Video-Sektion Features

- ✅ Professionelles Design mit Schatten und Animationen
- ✅ Video-Player mit nativen Browser-Controls
- ✅ Dauer-Badge auf Tutorial-Videos
- ✅ Hover-Effekte auf Tutorial-Karten
- ✅ Smooth Scrolling zum Video-Bereich
- ✅ CTA-Button nach den Videos

## 🚀 Videos in Produktion

Für die Produktion sollten Sie:
1. Videos mit echten Daten und Inhalten aufnehmen
2. Videos eventuell mit einem professionellen Tool nachbearbeiten
3. Videos für Web optimieren (Kompression, Größe)
4. Videos auf CDN hochladen (optional, für bessere Performance)

## 💡 Tipps für bessere Videos

1. **Backend muss laufen**: Stellen Sie sicher, dass das Backend für die Tutorial-Videos läuft
2. **Testdaten vorbereiten**: Verwenden Sie ansprechende Testdaten für die Demos
3. **Langsame Geschwindigkeit**: Passen Sie die `cy.wait()` Zeiten in den Tests an
4. **Mehrere Takes**: Führen Sie die Tests mehrmals aus, um das beste Video zu wählen

## ⚠️ Troubleshooting

**Problem**: Videos werden nicht erstellt
- Lösung: Prüfen Sie, ob der Dev-Server läuft
- Lösung: Prüfen Sie, ob der Ordner `src/assets/videos` existiert

**Problem**: Videos sind zu groß
- Lösung: Erhöhen Sie die Kompression in `cypress.config.ts`:
  ```typescript
  videoCompression: 40 // Höhere Zahl = kleinere Datei
  ```

**Problem**: Videos sind zu schnell/langsam
- Lösung: Passen Sie die `cy.wait()` Zeiten in den Cypress-Tests an

## 📞 Support

Bei Fragen zur Video-Implementierung:
- Prüfen Sie die Cypress-Dokumentation
- Testen Sie die Tests einzeln mit `npx cypress open`
- Prüfen Sie die Browser-Konsole auf Fehler

