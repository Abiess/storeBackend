# 🧪 Testing Guide - markt.ma Multi-Tenant SaaS

Dieses Dokument beschreibt alle verfügbaren Tests und wie du das Multi-Tenant Domain-Handling testen kannst.

## 🏗 Test-Setup

### 1. Voraussetzungen
- Anwendung läuft auf `http://localhost:8080`
- PostgreSQL Database ist verfügbar
- Pläne sind automatisch initialisiert (FREE, PRO, ENTERPRISE)

### 2. Test-Umgebung
```bash
# Anwendung starten
mvn spring-boot:run

# In separatem Terminal: Tests ausführen
mvn test
```

## 📋 Test-Szenarien

### 🔐 Authentication Flow
1. **User Registration** → Automatisch FREE Plan zugewiesen
2. **Login** → JWT Token generiert
3. **Auth Validation** → Alle geschützten Endpoints testen

### 🏪 Store & Domain Management
1. **Store Creation** → Automatisch `{slug}.markt.ma` Subdomain erstellt
2. **Domain Listing** → Zeigt automatisch erstellte Subdomain
3. **Custom Domain** → Hinzufügen und DNS-Verifikation
4. **Primary Domain** → Domain-Priorisierung
5. **Plan Limits** → Testen von Domain-Limits pro Plan

### 🌐 Public Store Resolution
1. **Host Resolution** → Store über `coolshop.markt.ma` auflösen
2. **Slug Resolution** → Store über Slug auflösen
3. **Host Header** → Browser-ähnliche Requests testen
4. **Domain Availability** → Verfügbarkeit prüfen

## 📁 Test-Dateien

### `api-test.http`
Vollständige HTTP-Request-Sammlung für manuelle Tests:
- ✅ Authentication (Register, Login, Me)
- ✅ Store Management (Create, List)
- ✅ Domain Management (List, Create, Verify, Set Primary)
- ✅ Public Resolution (Host, Slug, Availability)
- ✅ Product Management (CRUD)
- ✅ Error Cases (Unauthorized, Invalid Data)

### `domain-testing.http`
Spezialisierte Domain-Tests:
- Multi-Tenant Szenarien
- DNS-Verifikation Workflow
- Custom Domain Setup

### Automatisierte Tests
```bash
# Alle Tests ausführen
mvn test

# Nur Integration Tests
mvn test -Dtest="*IT"

# Nur Unit Tests
mvn test -Dtest="*Test"
```

## 🎯 Kritische Test-Szenarien

### 1. Multi-Tenant Isolation
```http
# User A erstellt Store "shop-a"
POST /api/me/stores {"name": "Shop A", "slug": "shop-a"}

# User B kann nicht auf Shop A zugreifen
GET /api/stores/1/domains
# → Sollte 403 Forbidden zurückgeben
```

### 2. Plan-Limits Enforcement
```http
# FREE User versucht 2. Custom Domain zu erstellen
POST /api/stores/1/domains/custom {"host": "second.com"}
# → Sollte Fehler wegen Plan-Limit zurückgeben
```

### 3. DNS-Verifikation Workflow
```http
# 1. Custom Domain hinzufügen
POST /api/stores/1/domains/custom {"host": "shop.example.com"}

# 2. Verifikations-Anweisungen abrufen
GET /api/stores/1/domains/2/verification-instructions
# → TXT Record Details

# 3. Domain verifizieren
POST /api/stores/1/domains/2/verify
# → Verifikation erfolgreich (simuliert)
```

### 4. Public Store Resolution
```http
# Store über verschiedene Domains auflösen
GET /api/public/store/resolve?host=shop-a.markt.ma
GET /api/public/store/resolve?host=shop.example.com
# → Beide sollten denselben Store zurückgeben
```

## 🚨 Error Testing

### Security Tests
- ❌ Zugriff ohne JWT Token
- ❌ Zugriff auf fremde Stores/Domains
- ❌ Manipulation von Domain-IDs

### Validation Tests
- ❌ Ungültige Slug-Formate
- ❌ Bereits existierende Domains
- ❌ Plan-Limit Überschreitungen

### Business Logic Tests
- ❌ Primary Domain löschen
- ❌ Unverifizierte Domain als Primary setzen
- ❌ Platform-Subdomain als Custom Domain

## 📊 Test-Metriken

### Coverage Goals
- **Unit Tests**: > 80% Code Coverage
- **Integration Tests**: Alle API Endpoints
- **End-to-End**: Kritische User Journeys

### Performance Tests
- **Domain Resolution**: < 100ms
- **Store Creation**: < 500ms
- **Authentication**: < 200ms

## 🔧 Test-Konfiguration

### Test-Profile
```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
  jpa:
    hibernate:
      ddl-auto: create-drop

saas:
  baseDomain: test.local
  domainVerification:
    tokenLength: 16
```

### Test-Daten
Automatische Test-Daten werden bei Bedarf erstellt:
- Test Users mit verschiedenen Plänen
- Test Stores mit verschiedenen Domain-Setups
- Mock DNS-Verifikation für reproduzierbare Tests

## 🎪 Demo-Szenarien

### Szenario 1: Startup (FREE Plan)
1. User registriert sich → FREE Plan
2. Erstellt ersten Store "coolshop" → `coolshop.markt.ma`
3. Kann keine Custom Domain hinzufügen (Plan-Limit)
4. Store ist öffentlich über Subdomain erreichbar

### Szenario 2: Upgrade zu PRO
1. User upgradet zu PRO Plan
2. Kann jetzt Custom Domains hinzufügen
3. Fügt `shop.customer.com` hinzu
4. Verifiziert Domain über DNS
5. Setzt Custom Domain als Primary

### Szenario 3: Multi-Store Business
1. PRO User erstellt mehrere Stores
2. Jeder Store bekommt eigene Subdomain
3. Verschiedene Custom Domains pro Store
4. Alle Stores unabhängig verwaltbar

## 🔍 Debug & Troubleshooting

### Logging
```yaml
logging:
  level:
    storebackend.service.DomainService: DEBUG
    storebackend.controller: DEBUG
```

### Common Issues
- **DNS Caching**: DNS-Änderungen brauchen Zeit
- **SSL Certificates**: Wildcard-Zertifikate für Subdomains
- **Load Balancer**: Multi-Tenant Routing konfigurieren

## 📈 Continuous Testing

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    mvn test
    mvn verify
    mvn jacoco:report
```

### Test-Automatisierung
- **Pre-commit**: Unit Tests
- **Pull Request**: Integration Tests
- **Deployment**: End-to-End Tests

---

**Happy Testing!** 🚀 Bei Fragen oder Problemen, siehe README.md oder erstelle ein Issue.
