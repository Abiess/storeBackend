# Brand Kit Generator - Video Demo Anleitung

## 🎥 Cypress Video automatisch aufnehmen

### Schritt 1: Cypress starten und Test ausführen

```bash
cd storeFrontend

# Frontend starten (in einem Terminal)
npm start

# In einem ZWEITEN Terminal: Cypress öffnen
npx cypress open
```

### Schritt 2: Test im Cypress Runner auswählen

1. Klicken Sie auf **E2E Testing**
2. Wählen Sie Ihren Browser (Chrome empfohlen)
3. Wählen Sie den Test: `05-brand-kit-generator.cy.ts`
4. Der Test läuft automatisch durch

### Schritt 3: Video finden

Das Video wird automatisch gespeichert in:
```
storeFrontend/src/assets/videos/05-brand-kit-generator.cy.ts.mp4
```

## 📹 Alternativer Weg: Headless Mode (ohne UI)

Für ein professionelleres Video ohne Cypress UI:

```bash
cd storeFrontend
npx cypress run --spec "cypress/e2e/05-brand-kit-generator.cy.ts" --browser chrome
```

Das Video wird ebenfalls in `src/assets/videos/` gespeichert.

## 🎬 Was der Test zeigt

Der Cypress Test demonstriert folgende Features:

### 1. **Formular-Eingabe** (0:00 - 0:15)
- ✅ Shop Name eingeben: "TechStore Pro"
- ✅ Slogan eingeben: "Innovation at your fingertips"
- ✅ Industry eingeben: "Electronics"
- ✅ Style auswählen: "Geometric"

### 2. **Farb-Management** (0:15 - 0:25)
- ✅ Preferred Color hinzufügen: #3B82F6 (Blau)
- ✅ Forbidden Color hinzufügen: #FF0000 (Rot)
- ✅ Color Chips anzeigen

### 3. **Brand Kit Generierung** (0:25 - 0:35)
- ✅ Generate Button klicken
- ✅ Loading Spinner anzeigen
- ✅ Brand Preview erscheint

### 4. **Generierte Assets anzeigen** (0:35 - 0:50)
- ✅ Color Palette durchblättern (7 Farben)
- ✅ Brand Initials anzeigen: "TS"
- ✅ Asset-Liste zeigen (Logos, Icons, Hero, OG)

### 5. **Action Buttons** (0:50 - 0:55)
- ✅ Save Palette Button
- ✅ Download ZIP Button

### 6. **Regenerate Feature** (0:55 - 1:10)
- ✅ Regenerate Button klicken
- ✅ Neue Brand Preview mit neuem Salt

### 7. **Scroll zurück zum Anfang** (1:10 - 1:15)

**Gesamtdauer: ~75 Sekunden**

## 🔧 Mock-Backend

Der Test verwendet Mock-Daten (keine echte Backend-Verbindung nötig):
- Placeholder-Bilder von via.placeholder.com
- Simulierte 2-Sekunden Ladezeit
- Realistische Farbpalette

## 🎨 Video-Qualität verbessern

In `cypress.config.ts` können Sie die Video-Qualität anpassen:

```typescript
video: true,
videoCompression: 15,  // Niedriger = bessere Qualität (default: 32)
videosFolder: 'src/assets/videos',
viewportWidth: 1920,
viewportHeight: 1080,
```

## 📊 Video-Specs

- **Auflösung**: 1920x1080 (Full HD)
- **Format**: MP4
- **Codec**: H.264
- **Kompression**: Einstellbar (15-50)
- **FPS**: ~15-20 (Cypress Standard)

## 🚀 Video sofort ansehen

Nach dem Test-Durchlauf:

### Windows:
```bash
start storeFrontend\src\assets\videos\05-brand-kit-generator.cy.ts.mp4
```

### macOS/Linux:
```bash
open storeFrontend/src/assets/videos/05-brand-kit-generator.cy.ts.mp4
```

## 🎯 Tipps für bessere Videos

1. **Langsamere Animation**: Erhöhen Sie `cy.wait()` Zeiten im Test
2. **Bessere Kompression**: Setzen Sie `videoCompression: 15`
3. **Ohne Test-UI**: Nutzen Sie `cypress run` statt `cypress open`
4. **Custom Video Name**: Umbenennen nach Upload
5. **Untertitel**: Können später hinzugefügt werden

## 📝 Video in README einbinden

```markdown
## Brand Kit Generator Demo

![Brand Kit Generator](./src/assets/videos/05-brand-kit-generator.cy.ts.mp4)

Oder als Link:
[📹 Video ansehen](./src/assets/videos/05-brand-kit-generator.cy.ts.mp4)
```

## ✅ Fertig!

Das Video wird automatisch erstellt und ist sofort einsatzbereit für:
- Dokumentation
- Präsentationen
- GitHub README
- Marketing-Material

