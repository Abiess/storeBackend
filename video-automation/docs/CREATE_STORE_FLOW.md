# 🏪 Create Store Flow - Anleitung

## Flow-Übersicht

Der **Create Store Flow** demonstriert:
1. ✅ Login mit bestehendem Account
2. ✅ Navigation zur Store-Erstellung
3. ✅ Ausfüllen des Store-Formulars
4. ✅ Absenden und Erfolgsbestätigung

## 🎬 Video aufnehmen

```bash
# Einzeln
npm run record create-store

# Oder mit shortcut
npm run record:create-store
```

## 📋 Was der Flow macht

### Schritt 1: Anmelden
- Navigiert zur Login-Seite
- Nutzt DEMO_EMAIL und DEMO_PASSWORD aus .env
- Meldet sich an

### Schritt 2: Store erstellen aufrufen
- Sucht nach "Store erstellen" / "Neuer Store" Button
- Falls nicht gefunden: Direkte Navigation zu `/store/create`, `/stores/new`, etc.

### Schritt 3: Formular ausfüllen
Der Flow füllt automatisch (falls vorhanden):
- **Store Name** - "Demo Store [Timestamp]"
- **Beschreibung** - Demo-Text
- **Subdomain/URL** - "demo-store-[Timestamp]"
- **Kategorie** - Erste verfügbare Option
- **Adresse** - "Musterstraße 123"
- **Stadt** - "Berlin"
- **PLZ** - "10115"
- **Telefon** - "+49 30 12345678"

**Hinweis:** Timestamp wird verwendet für eindeutige Store-Namen

### Schritt 4: Absenden
- Klickt auf "Store erstellen" / "Erstellen" Button
- Wartet auf Erfolgsbestätigung

### Schritt 5: Erfolg verifizieren
- Wartet auf "Erfolgreich" / "Store erstellt" Nachricht
- Oder Store-Dashboard

## ⚙️ Anpassungen

### Demo-Credentials ändern

In `.env`:
```env
DEMO_EMAIL=dein-test-user@example.com
DEMO_PASSWORD=DeinTestPasswort123!
```

### Store-Daten anpassen

Bearbeite `tests/flows/create-store.spec.js`:

```javascript
// Zeile 144: Store Name
await storeNameInput.fill('Mein Custom Store');

// Zeile 150: Beschreibung
await descriptionInput.fill('Deine eigene Beschreibung');

// Zeile 156: Subdomain
await urlInput.fill('mein-store');
```

### URLs anpassen

Falls deine Store-Erstellung andere URLs hat, bearbeite Zeile 109-114:

```javascript
await page.goto('/deine/url/hier').catch(() =>
  page.goto('/alternative/url')
);
```

## 🔍 Troubleshooting

### "Login button not found"
**Lösung:** Navigiere direkt zur Login-URL in `.env`:
```javascript
// Zeile 33: Ersetze mit deiner exakten Login-URL
await page.goto('/auth/login');
```

### "Create store button not found"
**Lösung:** Füge die exakte URL hinzu:
```javascript
// Zeile 109: Füge deine URL hinzu
await page.goto('/deine-exakte-url-hier');
```

### Formularfelder werden nicht gefunden
**Lösung:** 
1. Führe den Flow einmal aus
2. Schaue ins Screenshot (in `test-results/`)
3. Identifiziere die tatsächlichen `name` oder `id` Attribute
4. Passe die Selektoren an

Beispiel:
```javascript
// Wenn dein Store-Name Input ist: <input name="shopTitle">
const storeNameInput = page.locator('input[name="shopTitle"]');
```

## 🎯 Verwendung

### Einzelnes Video erstellen
```bash
npm run record create-store
npm run process create-store
npm run howto create-store
```

### In Batch-Verarbeitung
```bash
npm run record:all
npm run process:all
npm run howto create-store
```

## 📝 Hinweise

- ✅ **Eindeutige Store-Namen**: Der Flow verwendet Timestamps für eindeutige Namen
- ✅ **Flexible Selektoren**: Funktioniert mit verschiedenen Formular-Layouts
- ✅ **Fehlertoleranz**: Optionale Felder werden übersprungen
- ✅ **Multi-Strategie**: Versucht mehrere Wege zur Store-Erstellung

## 🔗 Related Flows

- **login.spec.js** - Registrierung & Login
- **checkout.spec.js** - Checkout-Prozess
- **products.spec.js** - Produkte durchsuchen

