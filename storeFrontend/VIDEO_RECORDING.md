# Video Recording Guide

## Übersicht
Dieses Projekt nutzt Cypress, um automatisch Demo-Videos und Tutorial-Videos aufzunehmen.

## Video-Aufnahme starten

### 1. Development Server starten
```bash
npm start
```

### 2. Videos aufnehmen
In einem neuen Terminal:
```bash
npm run record:videos
```

## Verfügbare Video-Tests

1. **01-landing-demo.cy.ts** - Landing Page Walkthrough
   - Zeigt alle Sektionen der Landing Page
   - Scrollt durch Features und Pricing
   - Dauer: ~30 Sekunden

2. **02-how-to-register.cy.ts** - Registrierungs-Tutorial
   - Zeigt den Registrierungsprozess
   - Füllt Formularfelder aus
   - Dauer: ~20 Sekunden

3. **03-how-to-create-product.cy.ts** - Produkt erstellen Tutorial
   - Zeigt wie man ein Produkt anlegt
   - Demonstriert alle Felder
   - Dauer: ~25 Sekunden

4. **04-how-to-customize-store.cy.ts** - Shop anpassen Tutorial
   - Zeigt Shop-Einstellungen
   - Demonstriert Anpassungsoptionen
   - Dauer: ~20 Sekunden

## Video-Speicherort
Alle Videos werden gespeichert in:
```
src/assets/videos/
```

## Video-Einstellungen
- Auflösung: 1920x1080
- Kompression: 32 (gute Balance zwischen Qualität und Dateigröße)
- Format: MP4

## Videos manuell aufnehmen
```bash
# Einzelnen Test ausführen
npx cypress run --spec "cypress/e2e/01-landing-demo.cy.ts"

# Cypress UI öffnen
npm run cypress:open
```

## Tipps
- Stelle sicher, dass der Dev-Server läuft bevor du Videos aufnimmst
- Die Videos werden automatisch überschrieben bei jedem Lauf
- Für beste Qualität: Schließe andere Programme während der Aufnahme

