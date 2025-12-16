# 🌐 Personalisierte Storefront für Subdomains

## Übersicht

Wenn ein User einen Store mit dem Slug "abc" erstellt, kann er seine personalisierte Storefront unter `abc.markt.ma` aufrufen.

## Was wurde implementiert

### ✅ 1. Subdomain-Erkennungs-Service

**Datei:** `src/app/core/services/subdomain.service.ts`

Dieser Service:
- Erkennt automatisch ob die aktuelle URL eine Subdomain ist (z.B. `abc.markt.ma`)
- Lädt Store-Informationen vom Backend via `/api/public/store/resolve?host=abc.markt.ma`
- Cached die Store-Daten für Performance

### ✅ 2. Subdomain-Redirect-Guard

**Datei:** `src/app/core/guards/subdomain-redirect.guard.ts`

Dieser Guard:
- Prüft bei jedem Seitenaufruf ob es eine Subdomain ist
- Leitet automatisch zur Storefront-Landing-Page weiter
- Lässt normale `markt.ma` Aufrufe unverändert

### ✅ 3. Personalisierte Storefront-Landing-Page

**Dateien:**
- `src/app/features/storefront/storefront-landing.component.ts`
- `src/app/features/storefront/storefront-landing.component.html`
- `src/app/features/storefront/storefront-landing.component.scss`

Diese Komponente zeigt:
- **Hero-Section** mit Store-Name
- **Produkt-Grid** mit allen aktiven Produkten
- **Kategorien-Übersicht**
- **Warenkorb-Funktionalität**
- **Custom Theme** (falls konfiguriert)
- **Footer** mit Store-Name

### ✅ 4. Routing-Anpassung

**Datei:** `src/app/app.routes.ts`

Neue Route für Subdomain-Landing:
```typescript
{
  path: 'storefront-landing',
  loadComponent: () => import('./features/storefront/storefront-landing.component')
}
```

Hauptroute mit Guard:
```typescript
{
  path: '',
  loadComponent: () => import('./features/landing/landing.component'),
  canActivate: [SubdomainRedirectGuard] // Prüft Subdomain
}
```

## Wie es funktioniert

### Schritt 1: User erstellt Store
1. User registriert sich auf `markt.ma`
2. Erstellt einen Store mit Slug "meinshop"
3. Backend erstellt automatisch Domain-Eintrag für `meinshop.markt.ma`

### Schritt 2: User ruft Subdomain auf
```
User öffnet: https://meinshop.markt.ma
```

### Schritt 3: Automatische Erkennung
```
1. Angular App lädt
2. SubdomainRedirectGuard wird aktiviert
3. SubdomainService.detectSubdomain() erkennt "meinshop"
4. Guard leitet zu /storefront-landing weiter
```

### Schritt 4: Store-Daten laden
```
1. StorefrontLandingComponent initialisiert
2. SubdomainService.resolveStore() ruft Backend auf:
   GET /api/public/store/resolve?host=meinshop.markt.ma
3. Backend gibt zurück:
   {
     storeId: 1,
     name: "Mein Shop",
     slug: "meinshop",
     status: "ACTIVE"
   }
4. Komponente lädt Produkte und Kategorien
```

### Schritt 5: Personalisierte Storefront
```
✅ Hero mit "Willkommen bei Mein Shop"
✅ Alle Produkte des Stores
✅ Kategorien-Navigation
✅ Custom Theme (falls vorhanden)
✅ Warenkorb-Funktionalität
```

## Entwicklung & Testing

### Lokale Entwicklung

Da `localhost` keine echte Subdomain unterstützt, können Sie testen mit:

#### Option 1: hosts-Datei (Windows)
```
# C:\Windows\System32\drivers\etc\hosts
127.0.0.1 testshop.markt.ma
127.0.0.1 abc.markt.ma
```

Dann: `http://testshop.markt.ma:4200`

#### Option 2: Environment Variable
```typescript
// environment.development.ts
export const environment = {
  production: false,
  useMockData: true, // Aktiviert Mock-Daten
  // ...
};
```

### Production Testing

Nach Deployment:
1. DNS Wildcard einrichten (siehe `WILDCARD_SUBDOMAIN_SETUP.md`)
2. Nginx Wildcard-Config aktivieren
3. Store erstellen mit Slug "test123"
4. Aufrufen: `https://test123.markt.ma`

## Features der personalisierten Storefront

### 🎨 Design
- **Hero-Section** mit Gradient-Hintergrund
- **Responsive Grid** für Produkte
- **Animationen** (fadeInUp) für smooth UX
- **Custom Theme-Support** via ThemeService

### 🛒 Funktionen
- **Produkt-Katalog** - Alle aktiven Produkte
- **Kategorien-Filter** - Schnelle Navigation
- **Warenkorb** - Session-basiert (kein Login nötig)
- **Checkout** - Integration vorhanden
- **SEO-optimiert** - Meta-Tags, Structured Data

### 📱 Mobile-First
- Responsive Grid (280px - 1fr)
- Touch-optimierte Buttons
- Smooth Scrolling

## API-Integration

### Backend-Endpoint (bereits vorhanden)
```java
// PublicStoreController.java
@GetMapping("/public/store/resolve")
public ResponseEntity<PublicStoreDTO> resolveStore(
    @RequestParam String host,
    HttpServletRequest request
)
```

Dieser Endpoint:
- ✅ Ist bereits implementiert
- ✅ Ist öffentlich (keine Auth nötig)
- ✅ Gibt Store-Daten zurück
- ✅ Funktioniert mit Subdomains

### Zusätzlich benötigt

**Nginx Wildcard-Konfiguration:**
Siehe `WILDCARD_SUBDOMAIN_SETUP.md` für Details.

**DNS Wildcard-Eintrag:**
```
Type: A
Name: *
Content: [VPS IP]
```

## User Journey Beispiel

### Szenario: Shop-Besitzer "Max"

1. **Store erstellen**
   ```
   Max geht zu: https://markt.ma
   Erstellt Store: "max-electronics"
   ```

2. **Subdomain automatisch erstellt**
   ```
   Backend erstellt: max-electronics.markt.ma
   Status: Aktiv & Verifiziert
   ```

3. **Produkte hinzufügen**
   ```
   Max fügt 10 Produkte hinzu
   Erstellt 3 Kategorien
   ```

4. **Theme anpassen**
   ```
   Max wählt ein modernes Theme
   Passt Farben an
   ```

5. **Storefront teilen**
   ```
   Max teilt den Link: https://max-electronics.markt.ma
   ```

### Szenario: Kunde "Lisa"

1. **Store besuchen**
   ```
   Lisa öffnet: https://max-electronics.markt.ma
   ```

2. **Personalisierte Landing Page**
   ```
   ✅ Hero: "Willkommen bei Max Electronics"
   ✅ 10 Produkte im Grid
   ✅ 3 Kategorien zur Navigation
   ✅ Custom Theme von Max
   ```

3. **Produkt kaufen**
   ```
   Lisa klickt auf Produkt
   Legt es in Warenkorb
   Geht zum Checkout
   ```

4. **Keine Verwechslung**
   ```
   Lisa ist die ganze Zeit auf max-electronics.markt.ma
   Kein anderer Store wird angezeigt
   Komplett isolierte Experience
   ```

## Vorteile für Store-Besitzer

✅ **Eigene Brand-URL** - `meinshop.markt.ma` statt `/store/123`
✅ **Professionelles Auftreten** - Subdomain wirkt seriöser
✅ **SEO-Vorteile** - Eigene URL für Google-Indexierung
✅ **Einfaches Teilen** - Kurze, merkbare URL
✅ **Kein Setup** - Automatisch beim Store-Erstellen

## Vorteile für Kunden

✅ **Klare Navigation** - Wissen immer, in welchem Shop sie sind
✅ **Vertrauen** - Subdomain zeigt echten Store
✅ **Bookmarken** - Können Favoriten-Shop speichern
✅ **Schneller Zugriff** - Direkter Link zum Store

## Technische Details

### Performance
- **Lazy Loading** - Komponente nur geladen wenn nötig
- **Caching** - Store-Info wird gecached
- **CDN-Ready** - Static Assets können gecached werden

### Security
- **CORS** - Korrekt konfiguriert für Subdomains
- **JWT-Optional** - Storefront funktioniert ohne Login
- **Input-Validation** - Slug wird validiert

### Skalierbarkeit
- **Unbegrenzte Stores** - Jeder bekommt eigene Subdomain
- **Nginx Wildcard** - Alle Subdomains auf einmal konfiguriert
- **Database-Lookup** - Schnelle Store-Auflösung

## Troubleshooting

### Problem: "Store nicht gefunden"
- ✅ Prüfe ob Store mit Slug existiert
- ✅ Prüfe ob Domain-Eintrag erstellt wurde
- ✅ Backend-Logs prüfen: `sudo journalctl -u storebackend -f`

### Problem: Weiterleitung funktioniert nicht
- ✅ SubdomainRedirectGuard in Route aktiviert?
- ✅ Browser-Cache leeren
- ✅ Konsole öffnen: "Subdomain erkannt" sollte geloggt werden

### Problem: Theme wird nicht angewendet
- ✅ Store hat aktives Theme?
- ✅ ThemeService lädt korrekt?
- ✅ CSS wird im DOM angewendet?

## Nächste Schritte

### Nach Frontend-Build:
1. ✅ Frontend deployen
2. ✅ DNS Wildcard einrichten
3. ✅ Nginx Wildcard-Config aktivieren
4. ✅ SSL-Zertifikat für Wildcard beantragen

### Nach Deployment:
1. ✅ Test-Store erstellen
2. ✅ Subdomain aufrufen
3. ✅ Funktionalität testen
4. ✅ Performance messen

---

**Status:** ✅ Vollständig implementiert
**Bereit für:** Build & Deployment
**Dokumentiert:** 2025-12-16

