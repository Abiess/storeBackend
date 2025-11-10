# 🏪 markt.ma - Multi-Tenant E-Commerce SaaS

Ein leistungsstarkes Multi-Tenant E-Commerce System ähnlich Shopify, entwickelt mit Spring Boot 3 und PostgreSQL.

## 🚀 Features

### Multi-Tenant Domain-Handling
- **Subdomain-Support**: Automatische `{slug}.markt.ma` Subdomains für jeden Store
- **Custom Domains**: Vollständige Custom Domain-Unterstützung mit DNS-Verifikation
- **Domain-Verifikation**: Sichere TXT-Record basierte Verifikation
- **Public Store Resolution**: Auflösung von Stores über Host-Header oder Parameter

### Pläne & Limits
- **FREE Plan**: 1 Store, 1 Subdomain, 0 Custom Domains, 100MB Storage
- **PRO Plan**: 10 Stores, 10 Subdomains, 5 Custom Domains, 10GB Storage  
- **ENTERPRISE Plan**: 100 Stores, 100 Subdomains, 50 Custom Domains, 100GB Storage

### Store Management
- Vollständiges Store-Management mit Owner-basierten Berechtigungen
- Automatische Subdomain-Erstellung bei Store-Erstellung
- Plan-basierte Limits für Stores und Domains

### Produkt-Management
- Produkte mit Varianten und Attributen
- Lagerbestandsverfolgung
- Status-Management (DRAFT, ACTIVE, ARCHIVED)

## 🛠 Tech Stack

- **Backend**: Spring Boot 3.5.7
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT
- **Build Tool**: Maven
- **Java Version**: 17

## 📦 Installation & Setup

### Voraussetzungen
- Java 17+
- PostgreSQL 12+
- Maven 3.6+

### 1. Database Setup
```sql
CREATE DATABASE storedb;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE storedb TO postgres;
```

### 2. Konfiguration
Die Anwendung ist vorkonfiguriert für `markt.ma` als Base-Domain. Anpassungen in `application.yml`:

```yaml
saas:
  baseDomain: markt.ma
  platformDomain: app.markt.ma
  subdomainPattern: "{slug}.markt.ma"
```

### 3. Anwendung starten
```bash
mvn spring-boot:run
```

Die Anwendung läuft auf `http://localhost:8080`

## 📚 API Documentation

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### Store Management
```http
GET /api/me/stores
POST /api/me/stores
GET /api/stores/{storeId}
```

### Domain Management
```http
# Store Domains verwalten
GET /api/stores/{storeId}/domains
POST /api/stores/{storeId}/domains/subdomain
POST /api/stores/{storeId}/domains/custom
GET /api/stores/{storeId}/domains/{domainId}/verification-instructions
POST /api/stores/{storeId}/domains/{domainId}/verify
POST /api/stores/{storeId}/domains/{domainId}/set-primary
DELETE /api/stores/{storeId}/domains/{domainId}
```

### Public Store Resolution
```http
# Für Frontend/Storefront Integration
GET /api/public/store/resolve?host={host}
GET /api/public/store/by-slug/{slug}
GET /api/public/domain/check-availability?host={host}
```

### Product Management
```http
GET /api/stores/{storeId}/products
POST /api/stores/{storeId}/products
GET /api/stores/{storeId}/products/{productId}
PUT /api/stores/{storeId}/products/{productId}
DELETE /api/stores/{storeId}/products/{productId}
```

## 🔧 Domain-Setup für Production

### Subdomain-Setup
1. DNS Wildcard Record erstellen: `*.markt.ma → Server IP`
2. SSL-Zertifikat für `*.markt.ma` einrichten
3. Load Balancer/Reverse Proxy für Multi-Tenant Routing

### Custom Domain-Setup
1. Kunde erstellt Custom Domain im Dashboard
2. System generiert Verifikations-Token
3. Kunde fügt TXT-Record hinzu: `_marktma-verification.example.com`
4. System verifiziert DNS-Record
5. Kunde richtet CNAME auf `custom.markt.ma` ein

## 🧪 Testing

### Test-Dateien
- `domain-testing.http` - HTTP-Requests für Domain-Management
- `api-test.http` - Vollständige API-Tests
- Automatisierte Tests in `src/test/`

### Beispiel Workflow
1. **User registrieren**: Automatisch FREE Plan
2. **Store erstellen**: Automatisch `coolshop.markt.ma` Subdomain
3. **Custom Domain hinzufügen**: DNS-Verifikation erforderlich
4. **Store über Domain aufrufen**: Public Resolution API

## 📁 Projektstruktur

```
src/main/java/storebackend/
├── config/
│   ├── SaasProperties.java       # Multi-Tenant Konfiguration
│   ├── DataInitializer.java      # Plan-Initialisierung
│   └── SecurityConfig.java       # Security & JWT
├── controller/
│   ├── AuthController.java       # Authentication
│   ├── StoreController.java      # Store Management
│   ├── DomainController.java     # Domain Management (NEU)
│   ├── ProductController.java    # Produkt Management
│   └── PublicStoreController.java # Public Store Resolution (NEU)
├── entity/
│   ├── User.java                 # Benutzer mit Plan-Zuordnung
│   ├── Plan.java                 # Erweitert um Subdomain-Limits
│   ├── Store.java                # Store-Entity
│   ├── Domain.java               # Erweitert um Verifikation
│   ├── Product.java              # Produkt-Entity
│   └── ProductVariant.java       # Produkt-Varianten
├── service/
│   ├── DomainService.java        # Domain-Handling Logic (NEU)
│   ├── StoreService.java         # Erweitert um Auto-Subdomain
│   └── ProductService.java       # Produkt-Logic
├── repository/
│   ├── DomainRepository.java     # Erweiterte Domain-Queries
│   └── ...                       # Weitere Repositories
└── dto/
    ├── DomainDTO.java            # Domain Transfer Object
    ├── PublicStoreDTO.java       # Public Store Transfer Object
    └── ...                       # Weitere DTOs
```

## 🔐 Security Features

- **JWT Authentication**: Sichere Token-basierte Authentication
- **Owner-based Authorization**: Nur Store-Owner können Domains verwalten
- **Plan-based Limits**: Automatische Durchsetzung von Plan-Limits
- **DNS-Verifikation**: Sichere Custom Domain-Verifikation

## 🚀 Deployment

### VPS/Cloud Deployment
1. **Database**: PostgreSQL auf separatem Server/Service
2. **Application**: JAR-Deployment mit Docker/systemd
3. **Reverse Proxy**: Nginx für Multi-Tenant Routing
4. **SSL**: Let's Encrypt Wildcard-Zertifikate
5. **DNS**: Wildcard-Records für Subdomains

### CI/CD Pipeline
- GitHub Actions für automatische Builds
- Docker Images für einfaches Deployment
- Database Migrations mit Flyway/Liquibase

## 📈 Skalierung

- **Database**: Read-Replicas für bessere Performance
- **Caching**: Redis für Session/Domain-Caching
- **CDN**: CloudFlare für globale Performance
- **Monitoring**: Prometheus + Grafana für Metriken

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request erstellen

## 📄 License

Dieses Projekt ist under der MIT License - siehe [LICENSE](LICENSE) für Details.

## 📞 Support

Bei Fragen oder Problemen erstelle ein Issue im Repository oder kontaktiere das Entwicklerteam.

---

**markt.ma** - Deine All-in-One E-Commerce SaaS Lösung 🚀
