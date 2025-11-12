# Feature Roadmap & Ideen für MarktMA Store-Projekt

## 🎯 Aktueller Stand (✅ Implementiert)

- ✅ **Multi-Tenant Architektur** (User, Store, Domain)
- ✅ **Authentication & Authorization** (JWT, Roles)
- ✅ **Plan-basierte Limits** (FREE, PRO, ENTERPRISE)
- ✅ **MinIO Object Storage** (Produkt-Bilder, Store-Logos)
- ✅ **Storage Quota Management** (100 MB - 100 GB)
- ✅ **Domain Management** (Subdomains + Custom Domains)
- ✅ **Basic Products** (Title, Description, Price, Status)
- ✅ **Public Store Resolution** (für Frontend)

---

## 🚀 Phase 1: E-Commerce Essentials (Nächste Schritte)

### 1.1 **Erweiterte Produkt-Funktionen**

#### **Produkt-Kategorien**
```java
@Entity
public class Category {
    private Long id;
    private Store store;
    private String name;
    private String slug;
    private Category parent;  // Für Hierarchie
    private Integer sortOrder;
}
```

**Endpoints:**
- `POST /stores/{storeId}/categories` - Kategorie erstellen
- `GET /stores/{storeId}/categories` - Kategorien abrufen (mit Hierarchie)
- `PUT /products/{id}/category` - Produkt kategorisieren

#### **Produkt-Varianten erweitern**
```java
@Entity
public class ProductOption {
    private Long id;
    private Product product;
    private String name;        // z.B. "Farbe", "Größe"
    private List<String> values; // ["Rot", "Blau", "Grün"]
}

@Entity
public class ProductVariant {
    // ...existing fields...
    private Map<String, String> options; // {"Farbe": "Rot", "Größe": "L"}
    private String sku;
    private Integer stockQuantity;
    private BigDecimal price;
    private Media image;  // Varianten-spezifisches Bild
}
```

**Endpoints:**
- `POST /products/{id}/options` - Option hinzufügen (Farbe, Größe)
- `POST /products/{id}/variants` - Variante erstellen
- `GET /products/{id}/variants` - Alle Varianten

#### **Produkt-Galerie (mehrere Bilder pro Produkt)**
```java
@Entity
public class ProductMedia {
    private Long id;
    private Product product;
    private Media media;
    private Integer sortOrder;
    private Boolean isPrimary;
}
```

**Endpoints:**
- `POST /products/{id}/media/{mediaId}` - Bild zu Produkt hinzufügen
- `PUT /products/{id}/media/reorder` - Reihenfolge ändern

---

### 1.2 **Inventory Management (Lagerverwaltung)**

```java
@Entity
public class InventoryLog {
    private Long id;
    private ProductVariant variant;
    private Integer quantityChange;  // +10, -5
    private String reason;           // "Restock", "Sale", "Return"
    private User user;
    private LocalDateTime timestamp;
}

@Service
public class InventoryService {
    public void adjustStock(Long variantId, int change, String reason);
    public boolean checkAvailability(Long variantId, int quantity);
    public List<ProductVariant> getLowStockProducts(Store store);
}
```

**Endpoints:**
- `GET /stores/{storeId}/inventory/low-stock` - Produkte mit wenig Bestand
- `POST /products/{id}/variants/{variantId}/stock` - Bestand anpassen
- `GET /inventory/logs` - Bestandsverlauf

---

### 1.3 **Shopping Cart & Checkout (Warenkorb)**

```java
@Entity
public class Cart {
    private Long id;
    private String sessionId;  // Für nicht-angemeldete User
    private User user;          // Optional
    private Store store;
    private LocalDateTime expiresAt;
}

@Entity
public class CartItem {
    private Long id;
    private Cart cart;
    private ProductVariant variant;
    private Integer quantity;
    private BigDecimal priceSnapshot; // Preis zum Zeitpunkt des Hinzufügens
}
```

**Endpoints:**
- `POST /cart/items` - Artikel zum Warenkorb hinzufügen
- `GET /cart` - Warenkorb abrufen
- `PUT /cart/items/{id}` - Menge aktualisieren
- `DELETE /cart/items/{id}` - Artikel entfernen
- `POST /cart/checkout` - Checkout starten

---

### 1.4 **Order Management (Bestellungen)**

```java
@Entity
public class Order {
    private Long id;
    private Store store;
    private User customer;
    private String orderNumber;
    private OrderStatus status;  // PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal shipping;
    private BigDecimal total;
    private ShippingAddress shippingAddress;
    private BillingAddress billingAddress;
    private LocalDateTime createdAt;
}

@Entity
public class OrderItem {
    private Long id;
    private Order order;
    private ProductVariant variant;
    private Integer quantity;
    private BigDecimal price;
    private String productSnapshot; // JSON: Name, Image, etc.
}

@Entity
public class OrderStatusHistory {
    private Long id;
    private Order order;
    private OrderStatus status;
    private String note;
    private User updatedBy;
    private LocalDateTime timestamp;
}
```

**Endpoints:**
- `POST /orders` - Bestellung erstellen
- `GET /stores/{storeId}/orders` - Bestellungen abrufen
- `GET /orders/{id}` - Bestelldetails
- `PUT /orders/{id}/status` - Status ändern
- `GET /me/orders` - Meine Bestellungen (für Kunden)

---

## 🎨 Phase 2: Store Customization

### 2.1 **Theme & Design System**

```java
@Entity
public class StoreTheme {
    private Long id;
    private Store store;
    private String primaryColor;
    private String secondaryColor;
    private String fontFamily;
    private String logoUrl;
    private String faviconUrl;
    private String customCSS;
    private ThemePreset preset; // MODERN, CLASSIC, MINIMAL
}
```

**Endpoints:**
- `PUT /stores/{storeId}/theme` - Theme anpassen
- `GET /public/store/{slug}/theme` - Theme für Frontend

### 2.2 **Store Pages (CMS-Light)**

```java
@Entity
public class Page {
    private Long id;
    private Store store;
    private String title;
    private String slug;
    private String content;  // Rich Text (HTML/Markdown)
    private Boolean isPublished;
    private PageType type;   // ABOUT, TERMS, PRIVACY, CUSTOM
}
```

**Endpoints:**
- `POST /stores/{storeId}/pages` - Seite erstellen
- `GET /public/store/{slug}/pages/{pageSlug}` - Seite abrufen

### 2.3 **Navigation & Menus**

```java
@Entity
public class Menu {
    private Long id;
    private Store store;
    private String name;
    private MenuPosition position; // HEADER, FOOTER, SIDEBAR
}

@Entity
public class MenuItem {
    private Long id;
    private Menu menu;
    private String title;
    private String url;
    private MenuItem parent;
    private Integer sortOrder;
}
```

---

## 💳 Phase 3: Payment Integration

### 3.1 **Payment Gateway Integration**

```java
@Entity
public class PaymentMethod {
    private Long id;
    private Store store;
    private PaymentProvider provider; // STRIPE, PAYPAL, KLARNA
    private String apiKey;
    private String secretKey;
    private Boolean isActive;
}

@Entity
public class Payment {
    private Long id;
    private Order order;
    private PaymentMethod paymentMethod;
    private BigDecimal amount;
    private String transactionId;
    private PaymentStatus status;
    private LocalDateTime paidAt;
}
```

**Provider:**
- **Stripe** - Kreditkarten, SEPA
- **PayPal** - PayPal, Lastschrift
- **Klarna** - Kauf auf Rechnung
- **Mollie** - Multi-Provider (Europa)

**Endpoints:**
- `POST /stores/{storeId}/payment-methods` - Payment-Methode aktivieren
- `POST /orders/{id}/payment` - Zahlung initiieren
- `POST /webhooks/stripe` - Stripe Webhook

### 3.2 **Subscription/Recurring Payments**

```java
@Entity
public class Subscription {
    private Long id;
    private User user;
    private Plan plan;
    private SubscriptionStatus status;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private String stripeSubscriptionId;
}
```

---

## 📊 Phase 4: Analytics & Reports

### 4.1 **Store Analytics**

```java
@Entity
public class AnalyticsEvent {
    private Long id;
    private Store store;
    private EventType type; // PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART, PURCHASE
    private String sessionId;
    private String productId;
    private String referrer;
    private LocalDateTime timestamp;
}

@Service
public class AnalyticsService {
    public Map<String, Object> getDashboardStats(Store store, DateRange range);
    public List<Product> getBestSellers(Store store);
    public BigDecimal getRevenue(Store store, DateRange range);
}
```

**Dashboard-Metriken:**
- 📈 Umsatz (heute, diese Woche, dieser Monat)
- 🛒 Bestellungen (Anzahl, durchschnittlicher Wert)
- 👀 Produkt-Views
- 📦 Lagerbestand-Warnungen
- 💰 Top-Produkte

**Endpoints:**
- `GET /stores/{storeId}/analytics/dashboard`
- `GET /stores/{storeId}/analytics/revenue`
- `GET /stores/{storeId}/analytics/best-sellers`

### 4.2 **Reports**

```java
public enum ReportType {
    SALES_REPORT,
    INVENTORY_REPORT,
    CUSTOMER_REPORT,
    TAX_REPORT
}

@Service
public class ReportService {
    public byte[] generateSalesReport(Store store, DateRange range, ReportFormat format);
}
```

**Export-Formate:**
- PDF
- Excel (XLSX)
- CSV

---

## 👥 Phase 5: Customer Management (CRM)

### 5.1 **Customer Profiles**

```java
@Entity
public class Customer {
    private Long id;
    private User user;          // Optional (kann Guest sein)
    private Store store;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private List<Address> addresses;
    private CustomerTier tier;  // BRONZE, SILVER, GOLD
    private BigDecimal lifetimeValue;
}
```

### 5.2 **Customer Reviews & Ratings**

```java
@Entity
public class Review {
    private Long id;
    private Product product;
    private Customer customer;
    private Integer rating;      // 1-5 Sterne
    private String title;
    private String comment;
    private Boolean isVerifiedPurchase;
    private ReviewStatus status; // PENDING, APPROVED, REJECTED
    private LocalDateTime createdAt;
}
```

**Endpoints:**
- `POST /products/{id}/reviews` - Review erstellen
- `GET /products/{id}/reviews` - Reviews abrufen
- `PUT /reviews/{id}/approve` - Review freigeben (Store Owner)

### 5.3 **Wishlist**

```java
@Entity
public class Wishlist {
    private Long id;
    private Customer customer;
    private List<Product> products;
}
```

---

## 📧 Phase 6: Marketing & Communication

### 6.1 **Email Marketing**

```java
@Entity
public class EmailCampaign {
    private Long id;
    private Store store;
    private String subject;
    private String htmlContent;
    private List<Customer> recipients;
    private CampaignStatus status;
    private LocalDateTime scheduledAt;
}

@Service
public class EmailService {
    public void sendOrderConfirmation(Order order);
    public void sendShippingNotification(Order order, String trackingNumber);
    public void sendNewsletter(EmailCampaign campaign);
}
```

**Provider-Integration:**
- SendGrid
- Mailgun
- Amazon SES

### 6.2 **Discount Codes & Promotions**

```java
@Entity
public class Discount {
    private Long id;
    private Store store;
    private String code;
    private DiscountType type;      // PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING
    private BigDecimal value;
    private Integer usageLimit;
    private Integer usageCount;
    private LocalDateTime validFrom;
    private LocalDateTime validTo;
    private BigDecimal minimumOrderValue;
}
```

**Endpoints:**
- `POST /stores/{storeId}/discounts` - Rabattcode erstellen
- `POST /cart/apply-discount` - Code anwenden
- `GET /discounts/{code}/validate` - Code validieren

### 6.3 **Abandoned Cart Recovery**

```java
@Service
public class AbandonedCartService {
    @Scheduled(fixedRate = 3600000) // Jede Stunde
    public void checkAbandonedCarts() {
        // Finde Warenkörbe > 24h ohne Checkout
        // Sende Erinnerungs-Email
    }
}
```

---

## 🚚 Phase 7: Shipping & Fulfillment

### 7.1 **Shipping Methods**

```java
@Entity
public class ShippingMethod {
    private Long id;
    private Store store;
    private String name;
    private BigDecimal price;
    private ShippingProvider provider; // DHL, UPS, FEDEX, CUSTOM
    private String trackingUrlTemplate;
    private Integer estimatedDays;
}

@Entity
public class Shipment {
    private Long id;
    private Order order;
    private ShippingMethod method;
    private String trackingNumber;
    private ShipmentStatus status;
    private LocalDateTime shippedAt;
}
```

**Provider-Integration:**
- DHL API
- UPS API
- DPD API
- Sendcloud (Multi-Carrier)

### 7.2 **Tax Calculation**

```java
@Entity
public class TaxRule {
    private Long id;
    private Store store;
    private String countryCode;
    private String region;       // Bundesland/State
    private BigDecimal rate;     // 19% = 0.19
}

@Service
public class TaxService {
    public BigDecimal calculateTax(Order order);
}
```

---

## 🔐 Phase 8: Security & Compliance

### 8.1 **GDPR Compliance**

```java
@Entity
public class DataExportRequest {
    private Long id;
    private User user;
    private RequestStatus status;
    private String downloadUrl;
    private LocalDateTime expiresAt;
}

@Service
public class GDPRService {
    public void exportUserData(User user);
    public void anonymizeUser(User user);
    public void deleteUserData(User user);
}
```

**Endpoints:**
- `POST /me/data-export` - Daten anfordern
- `DELETE /me/account` - Account löschen

### 8.2 **Two-Factor Authentication (2FA)**

```java
@Entity
public class TwoFactorAuth {
    private Long id;
    private User user;
    private String secret;
    private Boolean isEnabled;
    private List<String> backupCodes;
}
```

### 8.3 **Audit Logs**

```java
@Entity
public class AuditLog {
    private Long id;
    private User user;
    private Store store;
    private String action;      // "ORDER_CREATED", "PRODUCT_DELETED"
    private String entityType;
    private Long entityId;
    private String changes;     // JSON
    private LocalDateTime timestamp;
}
```

---

## 📱 Phase 9: Mobile & PWA

### 9.1 **Push Notifications**

```java
@Entity
public class PushSubscription {
    private Long id;
    private User user;
    private String endpoint;
    private String p256dh;
    private String auth;
}

@Service
public class PushNotificationService {
    public void sendOrderUpdate(User user, Order order);
    public void sendPromotion(List<User> users, String message);
}
```

### 9.2 **Mobile API Optimizations**

- GraphQL API (statt REST)
- Offline-First Sync
- Image Optimization (WebP, verschiedene Größen)

---

## 🤖 Phase 10: AI & Automation

### 10.1 **Product Recommendations**

```java
@Service
public class RecommendationService {
    public List<Product> getRecommendedProducts(User user);
    public List<Product> getSimilarProducts(Product product);
    public List<Product> getFrequentlyBoughtTogether(Product product);
}
```

**Algorithmen:**
- Collaborative Filtering
- Content-Based Filtering
- Häufig zusammen gekauft

### 10.2 **Chatbot / Support**

```java
@Entity
public class ChatMessage {
    private Long id;
    private Store store;
    private Customer customer;
    private String message;
    private MessageSender sender; // CUSTOMER, STORE_OWNER, BOT
    private LocalDateTime timestamp;
}
```

**Integration:**
- Crisp Chat
- Intercom
- Zendesk

### 10.3 **Automated Product Tagging**

```java
@Service
public class ProductAIService {
    public List<String> generateTags(Product product);
    public String optimizeDescription(String description);
    public List<String> suggestCategories(Product product);
}
```

---

## 🌍 Phase 11: Internationalization

### 11.1 **Multi-Currency**

```java
@Entity
public class Currency {
    private Long id;
    private String code;    // USD, EUR, GBP
    private String symbol;  // $, €, £
    private BigDecimal exchangeRate;
}

@Entity
public class StoreSettings {
    private Long id;
    private Store store;
    private Currency defaultCurrency;
    private List<Currency> supportedCurrencies;
}
```

### 11.2 **Multi-Language**

```java
@Entity
public class Translation {
    private Long id;
    private Store store;
    private String entityType;
    private Long entityId;
    private String field;
    private String language;
    private String value;
}

// Beispiel:
// entityType="Product", entityId=123, field="title", language="de", value="Rotes T-Shirt"
// entityType="Product", entityId=123, field="title", language="en", value="Red T-Shirt"
```

---

## 🎯 Phase 12: Advanced Features

### 12.1 **Dropshipping Integration**

```java
@Entity
public class Supplier {
    private Long id;
    private Store store;
    private String name;
    private String apiEndpoint;
    private String apiKey;
}

@Service
public class DropshippingService {
    public void forwardOrder(Order order, Supplier supplier);
    public void syncInventory(Supplier supplier);
}
```

### 12.2 **Affiliate Program**

```java
@Entity
public class Affiliate {
    private Long id;
    private Store store;
    private User user;
    private String referralCode;
    private BigDecimal commissionRate;
    private BigDecimal totalEarnings;
}

@Entity
public class Referral {
    private Long id;
    private Affiliate affiliate;
    private Order order;
    private BigDecimal commission;
}
```

### 12.3 **Gift Cards**

```java
@Entity
public class GiftCard {
    private Long id;
    private Store store;
    private String code;
    private BigDecimal initialValue;
    private BigDecimal currentBalance;
    private LocalDateTime expiresAt;
}
```

---

## 📈 Recommended Priority Order

### **Jetzt sofort (Phase 1):**
1. ✅ Produkt-Kategorien
2. ✅ Produkt-Galerie (mehrere Bilder)
3. ✅ Erweiterte Varianten (Farbe, Größe)
4. ✅ Inventory Management
5. ✅ Shopping Cart
6. ✅ Order Management

### **Kurzfristig (Phase 2-3):**
7. ✅ Store Theme Customization
8. ✅ Payment Integration (Stripe)
9. ✅ Basic Analytics

### **Mittelfristig (Phase 4-7):**
10. ✅ Customer Reviews
11. ✅ Discount Codes
12. ✅ Email Notifications
13. ✅ Shipping Integration

### **Langfristig (Phase 8-12):**
14. ✅ GDPR Compliance
15. ✅ AI Recommendations
16. ✅ Multi-Language/Currency
17. ✅ Affiliate Program

---

## 🛠️ Technical Improvements

### **Performance:**
- Redis Caching (Products, Categories)
- Database Indexing
- Lazy Loading optimieren
- CDN für Images (CloudFlare)

### **DevOps:**
- Docker Compose (Development)
- Kubernetes (Production)
- CI/CD Pipeline erweitern
- Monitoring (Prometheus + Grafana)

### **Testing:**
- Unit Tests (JUnit)
- Integration Tests
- E2E Tests (Selenium)
- Load Testing (JMeter)

---

**Möchten Sie, dass ich eines dieser Features für Sie implementiere? Ich kann mit den wichtigsten E-Commerce-Essentials beginnen!** 🚀

