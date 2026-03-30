# 🧙‍♂️ Store Creation Wizard - Modern Step-by-Step Flow

## ✨ Feature-Übersicht

Ein moderner, benutzerfreundlicher Wizard für die Store-Erstellung mit 4 Schritten:

### 🎯 Features
- ✅ **Skip-Option**: Kann übersprungen werden (oben rechts)
- ✅ **Progress Tracking**: Visueller Fortschrittsbalken mit Schritt-Indikatoren
- ✅ **Step Navigation**: Zurück zu vorherigen Schritten möglich
- ✅ **Auto-Slug Generation**: URL wird automatisch aus Store-Namen generiert
- ✅ **Kategorie-Auswahl**: Multi-Select mit visuellen Karten
- ✅ **Optionale Felder**: Kontaktinfo kann übersprungen werden
- ✅ **Zusammenfassung**: Finale Übersicht vor Erstellung
- ✅ **Responsive Design**: Funktioniert auf Desktop & Mobile
- ✅ **Loading States**: Visuelle Feedback bei Aktionen
- ✅ **Error Handling**: Validierung mit hilfreichen Fehlermeldungen

## 🚀 Verwendung

### Automatischer Flow nach Login

Nach erfolgreichem Login wird automatisch geprüft:
- **Hat User Stores?** → Weiterleitung zu `/dashboard`
- **Kein Store?** → Weiterleitung zu `/store-wizard`

```typescript
// In login.component.ts
this.storeService.getStores().subscribe({
  next: (stores) => {
    if (stores && stores.length > 0) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/store-wizard']); // ← Neuer User
    }
  }
});
```

### Manuelle Navigation

```typescript
// Von überall im Code
this.router.navigate(['/store-wizard']);

// Oder mit Alias
this.router.navigate(['/create-store']); // Redirect zu /store-wizard
```

## 📋 Wizard-Schritte

### Schritt 1: Basis-Information 🏪

**Erforderlich:**
- Store-Name *
- Store-URL (Slug) *

**Optional:**
- Beschreibung

**Features:**
- Auto-Slug-Generation aus Name
- Validierung: Nur Kleinbuchstaben, Zahlen, Bindestriche
- Live-Vorschau: `mein-shop.markt.ma`

```typescript
// Auto-Generation
this.wizardForm.get('storeName')?.valueChanges.subscribe(name => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  this.wizardForm.get('storeSlug')?.setValue(slug);
});
```

### Schritt 2: Bereiche & Kategorien 🎯

**Auswahl-Kategorien:**
- 👗 Mode & Bekleidung
- 📱 Elektronik
- 🍔 Lebensmittel
- 💄 Beauty & Kosmetik
- 🏠 Haus & Garten
- ⚽ Sport & Freizeit
- 📚 Bücher & Medien
- 🧸 Spielzeug

**Features:**
- Multi-Select (mehrere Kategorien möglich)
- Visuelles Feedback (Checkmark bei Auswahl)
- Optional (kann übersprungen werden)
- Responsive Grid-Layout

### Schritt 3: Kontakt & Adresse 📞

**Felder (alle optional):**
- E-Mail
- Telefon
- Adresse
- Stadt
- PLZ

**Features:**
- Kann komplett übersprungen werden
- 2-Spalten-Layout auf Desktop
- Validierung nur bei Eingabe

### Schritt 4: Zusammenfassung ✅

**Anzeige:**
- Grundinformationen (Name, URL, Beschreibung)
- Ausgewählte Kategorien (als Chips)
- Kontaktinformationen (falls angegeben)

**Actions:**
- Zurück zu jedem Schritt (zur Bearbeitung)
- Store erstellen (mit Loading-Spinner)
- Error-Handling bei Fehlschlag

## 🎨 Design-Features

### Progress Steps
```html
┌────────────────────────────────────┐
│  ①──────②──────③──────④          │
│ Basis  Bereiche Kontakt Übersicht │
└────────────────────────────────────┘
```

**States:**
- **Default**: Grau, nicht geklickt
- **Active**: Weiß, vergrößert, Schatten
- **Completed**: Grün mit Checkmark

### Skip-Button
```
┌─────────────────────────────────┐
│                  [Überspringen →] │ ← Oben rechts
│                                   │
│     🏪 Store erstellen           │
└─────────────────────────────────┘
```

### Kategorie-Karten

```
┌─────────────┐  ┌─────────────┐
│    👗       │  │    📱       │
│   Mode      │  │ Elektronik  │
│  Kleidung   │  │  Computer   │
│     ✓       │  │             │ ← Checkmark nur wenn ausgewählt
└─────────────┘  └─────────────┘
```

### Footer Navigation
```
┌────────────────────────────────────┐
│ [← Zurück]          [Weiter →]     │ ← Schritt 1-3
│                [🚀 Store erstellen] │ ← Schritt 4
└────────────────────────────────────┘
```

## 🛠️ Technische Details

### Component
**Datei**: `src/app/features/stores/store-wizard.component.ts`
**Route**: `/store-wizard` (Alias: `/create-store`)
**Guard**: `authGuard` (nur für angemeldete User)

### Form-Struktur
```typescript
wizardForm = {
  storeName: string (required),
  storeSlug: string (required, pattern: /^[a-z0-9-]+$/),
  description: string (optional),
  email: string (optional),
  phone: string (optional),
  address: string (optional),
  city: string (optional),
  postalCode: string (optional)
}

selectedCategories: string[] // Separate Signal
```

### API-Call
```typescript
createStore(): Promise<void> {
  const storeData = {
    name: formValue.storeName,
    slug: formValue.storeSlug,
    description: formValue.description || null,
    categories: this.selectedCategories(),
    contactInfo: {
      email: formValue.email || null,
      phone: formValue.phone || null,
      address: formValue.address || null,
      city: formValue.city || null,
      postalCode: formValue.postalCode || null
    }
  };

  await this.storeService.createStore(storeData).toPromise();
  
  // Success → Navigate to dashboard
  this.router.navigate(['/dashboard'], {
    queryParams: { newStore: 'true', storeId: result.id }
  });
}
```

## 🌐 Übersetzungen

### Deutsche Keys (de.json)
```json
{
  "wizard": {
    "skip": "Überspringen",
    "createStore": "Store erstellen",
    "createStoreSubtitle": "Erstellen Sie in wenigen Schritten Ihren eigenen Online-Shop",
    "step1Title": "Basis-Info",
    "step2Title": "Bereiche",
    "step3Title": "Kontakt",
    "step4Title": "Übersicht",
    "storeName": "Store-Name",
    "storeSlug": "Store-URL",
    "description": "Beschreibung",
    // ... weitere Keys
  }
}
```

### Kategorien-Übersetzungen
Alle Kategorien sind mehrsprachig:
- `wizard.categoryFashion`, `wizard.categoryFashionDesc`
- `wizard.categoryElectronics`, `wizard.categoryElectronicsDesc`
- etc.

## 🎯 User Flow Beispiele

### Szenario 1: Neuer User (empfohlen)
1. User registriert sich
2. Login → System prüft: Keine Stores vorhanden
3. **Automatische Weiterleitung zu `/store-wizard`**
4. User durchläuft Wizard
5. Store wird erstellt
6. Weiterleitung zu Dashboard mit `newStore=true` Flag

### Szenario 2: User skippt Wizard
1. Wizard erscheint nach Login
2. User klickt "Überspringen" (oben rechts)
3. Direkte Weiterleitung zu `/dashboard`
4. User kann später manuell Store über `/create-store` erstellen

### Szenario 3: Bestehender User
1. User mit Stores loggt sich ein
2. System prüft: Stores vorhanden
3. **Direkt zu Dashboard** (kein Wizard)
4. Kann weitere Stores über Dashboard erstellen

### Szenario 4: Zurück-Navigation im Wizard
1. User ist bei Schritt 3 (Kontakt)
2. Möchte Store-Name ändern
3. Klickt auf Schritt 1 in Progress-Bar
4. Ändert Name → Slug wird auto-aktualisiert
5. "Weiter" bis Schritt 4
6. Store erstellen

## 📱 Responsive Verhalten

### Desktop (> 768px)
- 2-Spalten-Layout für Kontaktfelder
- 2-3 Kategorie-Karten pro Reihe
- Progress-Steps horizontal nebeneinander

### Mobile (< 768px)
- 1-Spalten-Layout
- Kategorie-Karten gestapelt
- Progress-Steps vertikal oder wrap
- Footer-Buttons gestapelt

## ⚙️ Anpassungen

### Neue Kategorie hinzufügen
```typescript
categories = [
  // Bestehende...
  {
    id: 'automotive',
    name: 'wizard.categoryAutomotive',
    description: 'wizard.categoryAutomotiveDesc',
    icon: '🚗'
  }
];
```

Dann in `de.json`:
```json
{
  "wizard": {
    "categoryAutomotive": "Auto & Motor",
    "categoryAutomotiveDesc": "Fahrzeuge, Teile, Zubehör"
  }
}
```

### Validation anpassen
```typescript
this.wizardForm = this.fb.group({
  storeName: ['', [
    Validators.required,
    Validators.minLength(3), // ← Min 3 Zeichen
    Validators.maxLength(50) // ← Max 50 Zeichen
  ]],
  // ...
});
```

### API-Endpoint ändern
```typescript
// In store.service.ts
createStore(data: any): Observable<any> {
  return this.http.post(`${this.API}/your-endpoint`, data);
}
```

## 🐛 Troubleshooting

### Wizard erscheint nicht nach Login
**Check:**
1. Ist `store-wizard` Route in `app.routes.ts`?
2. Ist StoreService in LoginComponent injiziert?
3. Console-Logs prüfen: "✨ Neuer User ohne Store"

### Auto-Slug funktioniert nicht
**Check:**
1. FormControl `storeSlug` vorhanden?
2. ValueChanges Subscription aktiv?
3. Pattern-Validierung korrekt?

### Kategorien werden nicht gespeichert
**Check:**
1. `selectedCategories` Signal wird befüllt?
2. API erwartet `categories` Array?
3. Backend akzeptiert category IDs?

### Skip-Button fehlt
**Check:**
1. `*ngIf="!hasStore()"` - prüft ob User bereits Store hat
2. CSS z-index: 100 für Sichtbarkeit
3. Position: absolute top-right

## 🚀 Deployment

### Build
```bash
npm run build
```

Wizard wird automatisch mit gebaut als Lazy-Loaded Route.

### Environment-Variablen
```typescript
// environment.ts
export const environment = {
  apiUrl: 'https://api.markt.ma',
  // Wizard kann verschiedene Endpoints nutzen
};
```

## 📊 Analytics & Tracking

Empfohlene Events:
```typescript
// Google Analytics / Matomo
trackEvent('wizard_started', { user_id });
trackEvent('wizard_step_completed', { step: 1 });
trackEvent('wizard_skipped', { reason: 'user_action' });
trackEvent('store_created', { store_id, categories });
```

## 🎉 Fertig!

Der Store Creation Wizard ist vollständig implementiert und einsatzbereit!

**Key Benefits:**
- ✅ Intuitive User Experience
- ✅ Kann übersprungen werden
- ✅ Modern & Responsive
- ✅ Mehrsprachig (DE/EN/AR)
- ✅ Validierung & Error Handling
- ✅ Auto-Navigation nach Login

---

**Erstellt**: 2026-03-30  
**Version**: 1.0  
**Status**: ✅ Production Ready

