# Fix für 403 Fehler bei /api/subscriptions/plans

## Problem
Der Frontend-Aufruf zu `GET https://api.markt.ma/api/subscriptions/plans` gab 403 Forbidden zurück:
```
GET https://api.markt.ma/api/subscriptions/plans 403 (Forbidden)
Zugriff verweigert - fehlende Berechtigungen
```

## Ursache
Der Backend-Endpunkt `/api/subscriptions/plans` **existierte nicht** im SubscriptionController. Das Frontend versuchte, die verfügbaren Subscription-Pläne abzurufen, aber der Endpunkt war nicht implementiert.

## Lösung

### 1. PlanDetails DTO erstellt
**Datei**: `src/main/java/storebackend/dto/PlanDetails.java`

Neue DTO-Klasse für Subscription-Plan-Details:
```java
@Data
@Builder
public class PlanDetails {
    private String plan;           // "FREE", "PRO", "ENTERPRISE"
    private String name;            // Anzeigename
    private String description;     // Beschreibung
    private Double monthlyPrice;    // Monatspreis
    private Double yearlyPrice;     // Jahrespreis
    private Boolean popular;        // Ist es der beliebsteste Plan?
    private Map<String, Object> features; // Feature-Liste
}
```

### 2. GET /api/subscriptions/plans Endpunkt implementiert
**Datei**: `src/main/java/storebackend/controller/SubscriptionController.java`

Neuer Endpunkt hinzugefügt:
```java
@GetMapping("/plans")
public ResponseEntity<List<PlanDetails>> getAvailablePlans() {
    log.info("GET /api/subscriptions/plans");

    List<PlanDetails> plans = Arrays.asList(
        // FREE Plan
        PlanDetails.builder()
            .plan("FREE")
            .name("Free")
            .description("Perfekt für den Start")
            .monthlyPrice(0.0)
            .yearlyPrice(0.0)
            .features(...)
            .build(),
        
        // PRO Plan
        PlanDetails.builder()
            .plan("PRO")
            .name("Pro")
            .description("Für wachsende Unternehmen")
            .monthlyPrice(29.99)
            .yearlyPrice(299.99)
            .popular(true)
            .features(...)
            .build(),
        
        // ENTERPRISE Plan
        PlanDetails.builder()
            .plan("ENTERPRISE")
            .name("Enterprise")
            .description("Für große Unternehmen")
            .monthlyPrice(99.99)
            .yearlyPrice(999.99)
            .features(...)
            .build()
    );

    return ResponseEntity.ok(plans);
}
```

### 3. SecurityConfig aktualisiert
**Datei**: `src/main/java/storebackend/config/SecurityConfig.java`

Der Endpunkt wurde als **öffentlich** markiert:
```java
.authorizeHttpRequests(auth -> auth
    // ...
    .requestMatchers(HttpMethod.GET, "/api/subscriptions/plans").permitAll()
    // ...
)
```

Dies erlaubt den Zugriff auf die Subscription-Pläne **ohne Authentifizierung**, sodass Benutzer die Preise sehen können, bevor sie sich registrieren.

## Plan-Details

### FREE Plan
- **Preis**: 0 € / Monat
- **Features**:
  - 1 Store
  - 10 Produkte
  - 50 Bestellungen
  - ❌ Keine Custom Domain
  - ❌ Keine Analytics

### PRO Plan (Empfohlen)
- **Preis**: 29,99 € / Monat oder 299,99 € / Jahr
- **Features**:
  - 3 Stores
  - 1.000 Produkte
  - Unbegrenzte Bestellungen
  - ✅ Custom Domain
  - ✅ Analytics
  - ✅ Priority Support
  - ✅ API Access
  - ✅ Multi-Language

### ENTERPRISE Plan
- **Preis**: 99,99 € / Monat oder 999,99 € / Jahr
- **Features**:
  - Unbegrenzte Stores
  - Unbegrenzte Produkte
  - Unbegrenzte Bestellungen
  - ✅ Alle PRO Features
  - ✅ Custom Branding

## Backend neu starten

Nach den Änderungen muss das Backend neu kompiliert und gestartet werden:

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend

# Kompilieren
mvn clean package -DskipTests

# Starten
java -jar target/storebackend-0.0.1-SNAPSHOT.jar
```

**Oder mit systemd (auf dem Server):**
```bash
sudo systemctl restart storebackend
```

## Testen

### Test 1: Direkt mit curl
```bash
curl https://api.markt.ma/api/subscriptions/plans
```

Erwartete Antwort:
```json
[
  {
    "plan": "FREE",
    "name": "Free",
    "description": "Perfekt für den Start",
    "monthlyPrice": 0.0,
    "yearlyPrice": 0.0,
    "popular": false,
    "features": {
      "maxStores": 1,
      "maxProducts": 10,
      "maxOrders": 50,
      "customDomain": false,
      "analytics": false
    }
  },
  {
    "plan": "PRO",
    "name": "Pro",
    "description": "Für wachsende Unternehmen",
    "monthlyPrice": 29.99,
    "yearlyPrice": 299.99,
    "popular": true,
    "features": {
      "maxStores": 3,
      "maxProducts": 1000,
      "maxOrders": -1,
      "customDomain": true,
      "analytics": true
    }
  },
  {
    "plan": "ENTERPRISE",
    "name": "Enterprise",
    "description": "Für große Unternehmen",
    "monthlyPrice": 99.99,
    "yearlyPrice": 999.99,
    "popular": false,
    "features": {
      "maxStores": -1,
      "maxProducts": -1,
      "maxOrders": -1,
      "customDomain": true,
      "analytics": true,
      "customBranding": true
    }
  }
]
```

### Test 2: Im Browser
Öffnen Sie: `https://api.markt.ma/api/subscriptions/plans`

Sie sollten die JSON-Antwort mit allen Plänen sehen.

### Test 3: Frontend
Navigieren Sie zu: `https://markt.ma/subscription`

Die Subscription-Seite sollte jetzt die verfügbaren Pläne anzeigen, ohne 403-Fehler.

## Verifizierung

Nach dem Neustart des Backends:

1. ✅ Öffnen Sie die Browser-Konsole (F12)
2. ✅ Navigieren Sie zu `https://markt.ma/subscription`
3. ✅ Prüfen Sie den Network-Tab
4. ✅ Der Aufruf zu `/api/subscriptions/plans` sollte **200 OK** zurückgeben

## Weitere Endpunkte

Falls weitere Subscription-Endpunkte fehlen, können diese nach dem gleichen Muster hinzugefügt werden:

```java
// Hole Details zu einem einzelnen Plan
@GetMapping("/plans/{planName}")
public ResponseEntity<PlanDetails> getPlanDetails(@PathVariable String planName) {
    // Implementation
}

// Vergleiche Pläne
@GetMapping("/plans/compare")
public ResponseEntity<Map<String, Object>> comparePlans() {
    // Implementation
}
```

## Zusammenfassung

### Vorher:
- ❌ `GET /api/subscriptions/plans` → 403 Forbidden
- ❌ Endpunkt existierte nicht
- ❌ Frontend konnte keine Pläne laden

### Nachher:
- ✅ `GET /api/subscriptions/plans` → 200 OK
- ✅ Endpunkt implementiert mit 3 Plänen
- ✅ Öffentlich zugänglich (keine Auth erforderlich)
- ✅ Frontend kann Pläne anzeigen

## Nächste Schritte

1. **Backend neu starten** (wie oben beschrieben)
2. **Frontend neu laden** im Browser
3. **Zur Subscription-Seite navigieren**
4. **Pläne sollten angezeigt werden**

Falls weitere API-Endpunkte fehlen, können diese nach dem gleichen Muster hinzugefügt werden.

