# 🏪 markt.ma - Multi-Tenant E-Commerce SaaS

Ein leistungsstarkes Multi-Tenant E-Commerce System ähnlich Shopify, entwickelt mit Spring Boot 3 und PostgreSQL.

## 🌐 Production

**Status**: 🟢 **LIVE**  
**Backend API**: https://api.markt.ma  
**Swagger UI**: https://api.markt.ma/swagger-ui.html  
**Health Check**: https://api.markt.ma/actuator/health

### Technologie-Stack (Production)
- **Backend**: Spring Boot 3.5.7 + Java 17
- **Datenbank**: PostgreSQL 14
- **Server**: Ubuntu VPS (212.227.58.56)
- **Deployment**: GitHub Actions CI/CD
- **Proxy**: Nginx mit SSL/TLS
- **Schema-Management**: SQL-basierte Initialisierung

---

## 🚀 Features

### Phase 1: E-Commerce Essentials ✅

#### 🏷️ Produkt-Kategorien
- Hierarchische Kategorie-Struktur (Haupt- und Unterkategorien)
- Flexible Sortierung mit `sortOrder`
- SEO-freundliche Slugs
- Store-spezifische Kategorien

#### 🎨 Produkt-Varianten & Optionen
- Flexible Produktoptionen (Farbe, Größe, Material, etc.)
- Multi-Option Support (z.B. Farbe + Größe gleichzeitig)
- Dynamische Variantengenerierung
- SKU-Management pro Variante

#### 🖼️ Produkt-Galerie
- Mehrere Bilder pro Produkt
- Primary Image Support
- Sortierbare Bildergalerie
- MinIO/S3-Integration für Medien-Storage

#### 📦 Inventory Management
- Real-time Bestandsverfolgung
- Inventory Logs (RESTOCK, SALE, RETURN, ADJUSTMENT, DAMAGED)
- Historische Bestandsänderungen
- Low-Stock Alerts (geplant)

#### 🛒 Shopping Cart
- Session-basierte Carts für Gäste
- User-basierte Carts für angemeldete Kunden
- Automatische Cart-Expiration (7 Tage)
- Price Snapshots zum Zeitpunkt des Hinzufügens

#### 📋 Order Management
- Vollständiges Bestellsystem mit Status-Tracking
- Order Status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
- Separate Billing & Shipping Addresses
- Order History mit Statusänderungs-Tracking
- Product Snapshots (Produktdaten zum Bestellzeitpunkt)

### Multi-Tenant Domain-Handling
- **Subdomain-Support**: Automatische `{slug}.markt.ma` Subdomains für jeden Store
- **Custom Domains**: Vollständige Custom Domain-Unterstützung mit DNS-Verifikation
- **Domain-Verifikation**: Sichere TXT-Record basierte Verifikation
- **Public Store Resolution**: Auflösung von Stores über Host-Header oder Parameter

### Pläne & Limits
- **FREE Plan**: 1 Store, 1 Subdomain, 0 Custom Domains, 100MB Storage, 50 Products
- **PRO Plan**: 10 Stores, 10 Subdomains, 5 Custom Domains, 10GB Storage, 1000 Products
- **ENTERPRISE Plan**: 100 Stores, 100 Subdomains, 50 Custom Domains, 100GB Storage, Unlimited Products

### Store Management
- Vollständiges Store-Management mit Owner-basierten Berechtigungen
- Automatische Subdomain-Erstellung bei Store-Erstellung
- Plan-basierte Limits für Stores und Domains

### Produkt-Management
- Produkte mit Varianten und Attributen
- Produktkategorien mit Hierarchie
- Mehrfache Produktbilder (Galerie)
- Lagerbestandsverfolgung mit Logs
- Status-Management (DRAFT, ACTIVE, ARCHIVED)
- Product Options (flexible Variantenattribute)

### MinIO Object Storage
- S3-kompatible Medien-Speicherung
- Quota-basierte Storage-Limits
- Automatische Storage-Usage Tracking
- Media-Upload mit Validierung

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
PUT /api/stores/{storeId}
DELETE /api/stores/{storeId}
```

### Product Categories
```http
GET /api/stores/{storeId}/categories
GET /api/stores/{storeId}/categories/root
GET /api/stores/{storeId}/categories/{categoryId}/subcategories
POST /api/stores/{storeId}/categories
PUT /api/stores/{storeId}/categories/{categoryId}
DELETE /api/stores/{storeId}/categories/{categoryId}
```

### Product Management
```http
GET /api/stores/{storeId}/products
GET /api/stores/{storeId}/products/{productId}
POST /api/stores/{storeId}/products
PUT /api/stores/{storeId}/products/{productId}
DELETE /api/stores/{storeId}/products/{productId}

# Product Options (Varianten)
GET /api/stores/{storeId}/products/{productId}/options
POST /api/stores/{storeId}/products/{productId}/options
PUT /api/stores/{storeId}/products/{productId}/options/{optionId}
DELETE /api/stores/{storeId}/products/{productId}/options/{optionId}

# Product Media (Galerie)
GET /api/stores/{storeId}/products/{productId}/media
POST /api/stores/{storeId}/products/{productId}/media
PUT /api/stores/{storeId}/products/{productId}/media/{mediaId}
DELETE /api/stores/{storeId}/products/{productId}/media/{mediaId}
POST /api/stores/{storeId}/products/{productId}/media/{mediaId}/set-primary
```

### Inventory Management
```http
GET /api/stores/{storeId}/inventory/logs
GET /api/stores/{storeId}/products/{productId}/variants/{variantId}/inventory/logs
POST /api/stores/{storeId}/products/{productId}/variants/{variantId}/inventory/adjust
```

### Shopping Cart
```http
# Öffentliche Cart-Endpunkte (Session-basiert)
GET /api/public/cart?sessionId={sessionId}
POST /api/public/cart/items
PUT /api/public/cart/items/{itemId}
DELETE /api/public/cart/items/{itemId}
DELETE /api/public/cart/clear?sessionId={sessionId}

# Authenticated Cart (User-basiert)
GET /api/me/cart
POST /api/me/cart/items
PUT /api/me/cart/items/{itemId}
DELETE /api/me/cart/items/{itemId}
DELETE /api/me/cart/clear
```

### Order Management
```http
# Store Owner Endpoints
GET /api/stores/{storeId}/orders
GET /api/stores/{storeId}/orders/{orderId}
PUT /api/stores/{storeId}/orders/{orderId}/status
GET /api/stores/{storeId}/orders/{orderId}/history

# Customer Endpoints
GET /api/me/orders
GET /api/me/orders/{orderId}
POST /api/public/orders/checkout

# Public Endpoints
POST /api/public/orders (Guest Checkout)
GET /api/public/orders/{orderNumber}?email={email}
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

### Media Management
```http
POST /api/stores/{storeId}/media/upload
GET /api/stores/{storeId}/media
GET /api/stores/{storeId}/media/{mediaId}
DELETE /api/stores/{storeId}/media/{mediaId}
GET /api/stores/{storeId}/media/usage
```

### Public Store Resolution
```http
# Für Frontend/Storefront Integration
GET /api/public/store/resolve?host={host}
GET /api/public/store/by-slug/{slug}
GET /api/public/domain/check-availability?host={host}
```

## 📊 Datenmodell

### Core Entities

#### User
- Authentication & Authorization
- Plan-Zuordnung
- Store Ownership

#### Plan
- Limits: maxStores, maxCustomDomains, maxSubdomains
- Storage: maxStorageMb
- Products: maxProducts, maxImageCount

#### Store
- Owner (User)
- Name, Slug
- Status: ACTIVE, SUSPENDED, PENDING_DOMAIN_VERIFICATION

#### Domain
- Store-Zuordnung
- Type: SUBDOMAIN, CUSTOM
- Verification: isVerified, verificationToken

### E-Commerce Entities

#### Category
- Hierarchische Struktur (parent/child)
- Store-spezifisch
- SEO-Slugs

#### Product
- Store-Zuordnung
- Title, Description, Base Price
- Status: DRAFT, ACTIVE, ARCHIVED

#### ProductVariant
- Product-Zuordnung
- SKU, Price, Stock Quantity
- Attributes JSON

#### ProductOption
- Product-Zuordnung
- Name (z.B. "Farbe")
- Values (z.B. ["Rot", "Blau", "Grün"])

#### ProductMedia
- Product-Zuordnung
- Media-Referenz
- Sort Order, isPrimary

#### InventoryLog
- Variant-Zuordnung
- Quantity Change (+/-)
- Reason: RESTOCK, SALE, RETURN, ADJUSTMENT, DAMAGED
- Timestamp & User

#### Cart & CartItem
- Session-basiert (Gäste) oder User-basiert
- Variant-Referenzen
- Price Snapshots
- Auto-Expiration

#### Order & OrderItem
- Store-Zuordnung
- Customer (optional)
- Order Number (unique)
- Status: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
- Billing & Shipping Addresses
- Subtotal, Tax, Shipping, Total

#### OrderStatusHistory
- Order-Zuordnung
- Status Changes
- Timestamps
- Updated By (User)

#### Media
- MinIO Object-Referenz
- Type: PRODUCT_IMAGE, LOGO, BANNER
- Size Tracking

#### StoreUsage
- Storage Bytes
- Image Count
- Product Count

## 🔐 Security

### JWT Authentication
- Access Tokens mit 24h Gültigkeit
- BCrypt Password Hashing
- Role-based Access Control (ROLE_STORE_OWNER, ROLE_PLATFORM_ADMIN)

### Authorization
- Store Owner kann nur eigene Stores verwalten
- Domain-Verification erforderlich für Custom Domains
- Plan-basierte Feature-Limits

## 🚦 Status & Roadmap

### ✅ Phase 1: E-Commerce Essentials (COMPLETED)
- [x] Product Categories (Hierarchie)
- [x] Product Variants (Options)
- [x] Product Gallery (Media)
- [x] Inventory Management (Logs)
- [x] Shopping Cart (Session + User)
- [x] Order Management (Full Lifecycle)

### 📋 Phase 2: Advanced Features (PLANNED)
- [ ] Customer Management (Accounts, Addresses)
- [ ] Payment Integration (Stripe, PayPal)
- [ ] Shipping Methods & Zones
- [ ] Tax Calculation (by Region)
- [ ] Discount Codes & Promotions
- [ ] Reviews & Ratings
- [ ] Wishlist

### 📋 Phase 3: Store Customization (PLANNED)
- [ ] Theme System (Templates)
- [ ] Custom Pages & Menus
- [ ] SEO Settings per Store
- [ ] Custom CSS/JS Injection
- [ ] Email Templates

### 📋 Phase 4: Analytics & Marketing (PLANNED)
- [ ] Sales Reports & Analytics
- [ ] Email Marketing Integration
- [ ] Abandoned Cart Recovery
- [ ] Product Recommendations
- [ ] Google Analytics Integration

### 📋 Phase 5: Advanced Operations (PLANNED)
- [ ] Multi-Currency Support
- [ ] Multi-Language Support
- [ ] Advanced Inventory (Warehouses)
- [ ] Dropshipping Integration
- [ ] Webhook System

## 📖 Beispiel Workflows

### 1. Store erstellen und Produkte anlegen

```bash
# 1. Benutzer registrieren
POST /api/auth/register
{
  "email": "shop@example.com",
  "password": "secure123"
}

# 2. Store erstellen
POST /api/me/stores
{
  "name": "Cool Shop",
  "slug": "coolshop"
}
# → Automatisch: coolshop.markt.ma Domain erstellt

# 3. Kategorie erstellen
POST /api/stores/1/categories
{
  "name": "T-Shirts",
  "slug": "t-shirts",
  "sortOrder": 1
}

# 4. Produkt erstellen
POST /api/stores/1/products
{
  "title": "Basic T-Shirt",
  "description": "Comfortable cotton t-shirt",
  "basePrice": 19.99,
  "status": "ACTIVE"
}

# 5. Produktoptionen hinzufügen
POST /api/stores/1/products/1/options
{
  "name": "Farbe",
  "values": ["Rot", "Blau", "Grün"],
  "sortOrder": 1
}

POST /api/stores/1/products/1/options
{
  "name": "Größe",
  "values": ["S", "M", "L", "XL"],
  "sortOrder": 2
}

# 6. Produktbilder hochladen
POST /api/stores/1/media/upload
Content-Type: multipart/form-data
file: [image.jpg]

POST /api/stores/1/products/1/media
{
  "mediaId": 1,
  "isPrimary": true,
  "sortOrder": 1
}
```

### 2. Shopping & Checkout Flow

```bash
# 1. Produkte zum Warenkorb hinzufügen (Gast)
POST /api/public/cart/items
{
  "sessionId": "guest-session-123",
  "variantId": 5,
  "quantity": 2
}

# 2. Warenkorb abrufen
GET /api/public/cart?sessionId=guest-session-123

# 3. Checkout
POST /api/public/orders/checkout
{
  "sessionId": "guest-session-123",
  "customerEmail": "customer@example.com",
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "billingAddress": { ... }
}
```

### 3. Bestellverwaltung

```bash
# 1. Bestellungen eines Stores abrufen
GET /api/stores/1/orders

# 2. Bestellstatus aktualisieren
PUT /api/stores/1/orders/123/status
{
  "status": "SHIPPED",
  "note": "Versandt mit DHL, Tracking: 123456789"
}

# 3. Bestellhistorie abrufen
GET /api/stores/1/orders/123/history
```

### 4. Inventory Management

```bash
# 1. Lagerbestand auffüllen
POST /api/stores/1/products/1/variants/5/inventory/adjust
{
  "quantityChange": 100,
  "reason": "RESTOCK",
  "notes": "Neue Lieferung vom Lieferanten"
}

# 2. Inventory Logs abrufen
GET /api/stores/1/products/1/variants/5/inventory/logs
```

## 🧪 Testing

### API Testing mit HTTP Files
Im Projekt befinden sich `.http` Dateien für Tests:
- `api-test.http` - Allgemeine API Tests
- `domain-testing.http` - Domain Management Tests
- `media-test.http` - Media Upload Tests

### Beispiel Test
```http
### Register User
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123",
  "planId": 1
}
```

## 🚀 Deployment

Siehe separate Dokumentation:
- `DEPLOYMENT.md` - Allgemeine Deployment-Anleitung
- `VPS_DEPLOYMENT_GUIDE.md` - VPS Setup & Konfiguration
- `DNS_SETUP_GUIDE.md` - DNS & Domain Setup
- `MINIO_SETUP.md` - MinIO Object Storage Setup

## 📝 License

MIT License - siehe LICENSE Datei

## 🤝 Support

Bei Fragen oder Problemen:
- GitHub Issues erstellen
- Dokumentation durchlesen
- API-Tests ausführen
