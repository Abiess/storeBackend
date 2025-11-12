# Mock-Daten Modus für markt.ma Frontend

## 🎯 Zweck

Dieser Mock-Modus ermöglicht es Ihnen, **ohne laufendes Backend** am UI zu arbeiten. Alle API-Aufrufe werden durch lokale Mock-Services mit realistischen Testdaten beantwortet.

## 🚀 Schnellstart

### Mock-Modus aktivieren (Standard)

In `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  useMockData: true,  // 👈 true = Mock-Daten
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public'
};
```

### Echtes Backend verwenden

Einfach den Flag auf `false` setzen:

```typescript
export const environment = {
  production: false,
  useMockData: false,  // 👈 false = Echtes Backend
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public'
};
```

## 📊 Verfügbare Mock-Daten

### 1. **Benutzer**
```
Email: demo@markt.ma
Passwort: beliebig (wird nicht geprüft)
```

### 2. **Stores** (3 Demo-Stores)
- **TechShop Demo** (techshop.markt.ma) - Status: ACTIVE
- **Fashion Store** (fashion.markt.ma) - Status: ACTIVE
- **Food & Drinks** (fooddrinks.markt.ma) - Status: PENDING_DOMAIN_VERIFICATION

### 3. **Produkte** (4 Produkte im TechShop)
- **Premium Laptop** - €1,299.99
  - 2 Varianten: Silver, Black
  - Status: ACTIVE
  - Stock: 23 Einheiten

- **Wireless Mouse** - €29.99
  - 1 Variante: Black
  - Status: ACTIVE
  - Stock: 50 Einheiten

- **USB-C Kabel** - €14.99
  - Status: DRAFT
  - Keine Varianten

- **Bluetooth Kopfhörer** - €199.99
  - 2 Varianten: White, Black
  - Status: ACTIVE
  - Stock: 45 Einheiten

### 4. **Bestellungen** (3 Demo-Bestellungen)
- **ORD-2024-0001** - €1,329.98 (Confirmed)
- **ORD-2024-0002** - €199.99 (Shipped)
- **ORD-2024-0003** - €59.98 (Pending)

### 5. **Domains** (2 Domains)
- **techshop.markt.ma** (Subdomain, Verified, Primary)
- **shop.techexample.com** (Custom, Not Verified)

### 6. **Kategorien**
- Elektronik (Root)
  - Computer & Zubehör
  - Audio

## 🎨 UI-Entwicklung Workflow

### Schritt 1: Frontend starten (ohne Backend!)

```bash
cd storeFrontend
npm install
npm start
```

Das Frontend läuft auf **http://localhost:4200**

### Schritt 2: Anmelden

Gehen Sie zu http://localhost:4200/login

```
Email: demo@markt.ma
Passwort: test123
```

(Im Mock-Modus wird **jede** E-Mail/Passwort-Kombination akzeptiert!)

### Schritt 3: UI erkunden

Nach dem Login sehen Sie:
- ✅ **Dashboard** mit 3 Demo-Stores
- ✅ **Store-Details** mit Tabs für Produkte, Bestellungen & Domains
- ✅ **Produkt-Liste** mit 4 Produkten
- ✅ **Bestellungen** mit verschiedenen Status
- ✅ **Domain-Verwaltung**

### Schritt 4: Daten manipulieren

Alle CRUD-Operationen funktionieren **lokal im Browser**:
- ✅ Produkte hinzufügen/bearbeiten/löschen
- ✅ Bestellstatus ändern
- ✅ Domains hinzufügen/löschen
- ✅ Stores erstellen

**Die Daten bleiben erhalten, solange Sie die Seite nicht neu laden!**

## 🔄 Zwischen Mock und Backend wechseln

### Option 1: Environment-Datei ändern

`src/environments/environment.ts`:
```typescript
useMockData: true   // Mock-Daten
useMockData: false  // Echtes Backend
```

Nach der Änderung: **Seite neu laden** (Angular dev server erkennt Änderungen automatisch)

### Option 2: Zur Produktion bauen

Bei `npm run build:prod` wird automatisch `environment.prod.ts` verwendet, wo `useMockData: false` ist.

## 📝 Mock-Service Details

### Realistische Verzögerungen

Alle Mock-Services simulieren Netzwerk-Latenz:
- **GET Requests**: 300-500ms Verzögerung
- **POST/PUT/DELETE**: 500-1000ms Verzögerung

Dies macht das UI-Verhalten realistischer.

### Datenpersistenz

Mock-Daten werden **nur im Speicher** gehalten:
- ✅ Änderungen funktionieren während der Session
- ❌ Nach Seiten-Reload sind alle Änderungen weg
- ✅ Gut für UI-Testing ohne Datenverschmutzung

## 🛠️ Eigene Mock-Daten hinzufügen

### Beispiel: Mehr Produkte hinzufügen

Öffnen Sie `src/app/core/mocks/mock-data.ts`:

```typescript
export const MOCK_PRODUCTS: Product[] = [
  // ...bestehende Produkte...
  {
    id: 5,
    title: 'Neues Produkt',
    description: 'Beschreibung',
    basePrice: 99.99,
    status: ProductStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: []
  }
];
```

### Beispiel: Mehr Stores hinzufügen

```typescript
export const MOCK_STORES: Store[] = [
  // ...bestehende Stores...
  {
    id: 4,
    name: 'Mein neuer Store',
    slug: 'meinstore',
    status: StoreStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
```

## 🧪 Vorteile des Mock-Modus

✅ **Kein Backend nötig** - Arbeiten Sie offline am UI  
✅ **Schnellerer Entwicklungszyklus** - Keine Backend-Starts/Restarts  
✅ **Unabhängige UI-Entwicklung** - Backend-Team kann parallel arbeiten  
✅ **Einfaches Testing** - Verschiedene Szenarien durchspielen  
✅ **Präsentationen** - Demo ohne komplette Infrastruktur  
✅ **UI-Screenshots** - Mit konsistenten Daten

## 🔍 Welche Services sind gemockt?

Alle wichtigen Services haben Mock-Implementierungen:

- ✅ **AuthService** - Login, Register, JWT
- ✅ **StoreService** - Store CRUD
- ✅ **ProductService** - Produkte & Varianten
- ✅ **OrderService** - Bestellungen & Status
- ✅ **DomainService** - Domain-Verwaltung
- ✅ **CategoryService** - Kategorie-Management
- ✅ **MediaService** - Bild-Uploads (simuliert)

## 🚨 Einschränkungen

❌ **Keine echte Authentifizierung** - Jedes Passwort wird akzeptiert  
❌ **Keine Datenpersistenz** - Reload verliert alle Änderungen  
❌ **Keine Backend-Validierung** - Validierung nur clientseitig  
❌ **Keine echten Datei-Uploads** - Bilder werden als Blob-URLs gespeichert  
❌ **Keine echte Domain-Verifizierung** - Wird sofort als "verified" markiert

## 📋 Checkliste für Produktions-Wechsel

Bevor Sie auf echtes Backend wechseln:

- [ ] `useMockData: false` in `environment.ts` setzen
- [ ] Backend läuft unter `http://localhost:8080`
- [ ] CORS im Backend korrekt konfiguriert
- [ ] Datenbank ist initialisiert
- [ ] Test-Login mit echtem Benutzer funktioniert

## 💡 Tipps

### Tipp 1: Schnell zwischen Modi wechseln

Erstellen Sie ein Script in `package.json`:

```json
{
  "scripts": {
    "start": "ng serve",
    "start:mock": "ng serve",
    "start:real": "ng serve --configuration=production"
  }
}
```

### Tipp 2: Mock-Daten exportieren

Sie können die Mock-Daten auch als JSON exportieren und später ins echte Backend importieren.

### Tipp 3: Verschiedene Szenarien testen

Ändern Sie die Mock-Daten für verschiedene Test-Szenarien:
- Leere Stores (keine Produkte)
- Viele Bestellungen (Performance-Test)
- Fehlerhafte Daten (Error-Handling)

## 🎬 Zusammenfassung

**Für UI-Entwicklung:**
```typescript
useMockData: true  // ✅ Einfach loslegen!
```

**Für Integration mit Backend:**
```typescript
useMockData: false  // ✅ Echte API-Calls
```

**Happy Coding! 🚀**

