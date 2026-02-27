# 📦 DROPSHIPPING SYSTEM - PHASE 1 ANALYSIS

**Datum:** 27.02.2026  
**Ziel:** MVP Dropshipping für ROLE_RESELLER

---

## 🔍 REPOSITORY-ANALYSE

### ✅ **Vorhandene Struktur:**

#### **Rollen & Rechte:**
- ✅ `Role.ROLE_RESELLER` existiert
- ✅ `Role.ROLE_SUPPLIER` existiert
- ✅ User hat `Set<Role> roles`
- ✅ Commission System vorhanden (Platform, Reseller, Supplier)

#### **Produkte & Varianten:**
- ✅ `Product` Entity mit `store_id`, `supplier_id`, `wholesalePrice`
- ✅ `ProductVariant` mit SKU, Price, Stock
- ✅ `product_options` und `product_option_values` Tabellen
- ✅ `product_variants` Tabelle

#### **Orders & Items:**
- ✅ `Order` Entity mit Store-Zuordnung
- ✅ `OrderItem` mit `variant_id`, `supplierId`, `wholesalePrice`
- ✅ `order_items` Tabelle bereits mit Supplier-Feldern!

#### **Bestehende Marketplace-Features:**
- ✅ `Product.supplier` - Supplier Zuordnung
- ✅ `Product.isSupplierCatalog` - Flag für Supplier Products
- ✅ `Product.wholesalePrice` - Einkaufspreis
- ✅ `OrderItem.supplierId` - Snapshot bei Order
- ✅ `OrderItem.wholesalePrice` - Snapshot bei Order
- ✅ Commission-Tracking System

---

## 🎯 PHASE 1 - WAS FEHLT?

### ❌ **Dropshipping-spezifische Felder:**

#### 1. **Supplier Link & Info (pro Variant)**
Aktuell: `Product` hat `wholesalePrice`, aber keine Supplier-URL  
Neu: Pro **Variant** einen Supplier-Link speichern

#### 2. **Fulfillment Status (pro OrderItem)**
Aktuell: Order hat `status`, aber kein Item-Level Fulfillment  
Neu: OrderItem braucht `fulfillmentStatus`, `supplierOrderId`, `trackingInfo`

#### 3. **Reseller-spezifische UI**
Aktuell: Standard Product/Order Management  
Neu: Supplier-Link Input, Margin Calculator, Fulfillment Tracking

---

## 📊 DATENBANK-ÄNDERUNGEN (PHASE 1)

### **Neue Tabelle: `dropshipping_sources`**
```sql
CREATE TABLE dropshipping_sources (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    supplier_url VARCHAR(1000) NOT NULL,
    supplier_name VARCHAR(255),
    purchase_price DECIMAL(10, 2) NOT NULL,
    estimated_shipping_days INTEGER,
    supplier_sku VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    
    CONSTRAINT fk_dropshipping_sources_variant 
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dropshipping_sources_creator
        FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT uk_dropshipping_sources_variant 
        UNIQUE (variant_id)
);

CREATE INDEX idx_dropshipping_sources_variant ON dropshipping_sources(variant_id);
CREATE INDEX idx_dropshipping_sources_creator ON dropshipping_sources(created_by);
```

**Rationale:**
- 1:1 Relation zu ProductVariant (jede Variant hat max. 1 Dropshipping Source)
- Speichert URL, Einkaufspreis, Notizen
- `created_by` trackt welcher Reseller das hinzugefügt hat

### **Erweitere Tabelle: `order_items`**
```sql
ALTER TABLE order_items 
    ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS supplier_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS supplier_tracking_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS supplier_carrier VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ordered_from_supplier_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status 
    ON order_items(fulfillment_status);
```

**Fulfillment Status Werte:**
- `PENDING` - Noch nicht beim Supplier bestellt
- `ORDERED` - Bei Supplier bestellt
- `SHIPPED` - Supplier hat versendet
- `DELIVERED` - Kunde hat erhalten
- `CANCELLED` - Storniert

---

## 🔧 BACKEND-ÄNDERUNGEN (PHASE 1)

### **Neue Dateien:**

#### 1. `DropshippingSource.java` (Entity)
```java
@Entity
@Table(name = "dropshipping_sources")
class DropshippingSource {
    Long id;
    ProductVariant variant;
    String supplierUrl;
    String supplierName;
    BigDecimal purchasePrice;
    Integer estimatedShippingDays;
    String supplierSku;
    String notes;
    User createdBy;
    LocalDateTime createdAt, updatedAt;
}
```

#### 2. `DropshippingSourceDTO.java`
```java
record DropshippingSourceDTO(
    Long id, Long variantId, String supplierUrl, 
    String supplierName, BigDecimal purchasePrice,
    Integer estimatedShippingDays, String supplierSku, String notes
) {}
```

#### 3. `FulfillmentStatus.java` (Enum)
```java
enum FulfillmentStatus {
    PENDING, ORDERED, SHIPPED, DELIVERED, CANCELLED
}
```

#### 4. `DropshippingService.java`
- `saveSupplierLink(variantId, dto, user)` - Link speichern
- `getSupplierLink(variantId, user)` - Link laden
- `deleteSupplierLink(variantId, user)` - Link löschen
- `calculateMargin(purchasePrice, salePrice, shippingCost)` - Margin berechnen

#### 5. `DropshippingController.java`
```
POST   /api/dropshipping/variants/{variantId}/source
GET    /api/dropshipping/variants/{variantId}/source
PUT    /api/dropshipping/variants/{variantId}/source
DELETE /api/dropshipping/variants/{variantId}/source
GET    /api/dropshipping/orders/{orderId}/items (Fulfillment-Info)
PUT    /api/dropshipping/order-items/{itemId}/fulfillment
```

### **Erweiterte Dateien:**

#### 1. `OrderItem.java`
```java
// Neue Felder hinzufügen:
@Enumerated(EnumType.STRING)
private FulfillmentStatus fulfillmentStatus = FulfillmentStatus.PENDING;
private String supplierOrderId;
private String supplierTrackingNumber;
private String supplierCarrier;
private LocalDateTime orderedFromSupplierAt;
private LocalDateTime fulfilledAt;
private String fulfillmentNotes;
```

#### 2. `OrderItemDTO.java`
```java
// Erweitere um Fulfillment-Felder
```

---

## 🎨 FRONTEND-ÄNDERUNGEN (PHASE 1)

### **Neue Komponenten:**

#### 1. **`supplier-link-form.component.ts`**
- Input: Supplier URL (Alibaba, AliExpress, etc.)
- Input: Supplier Name (optional)
- Input: Einkaufspreis
- Input: Geschätzte Lieferzeit (Tage)
- Input: Supplier SKU (optional)
- Textarea: Notizen
- Button: Speichern
- **Platzierung:** Im Product Variant Manager (nur für ROLE_RESELLER)

#### 2. **`fulfillment-tracker.component.ts`**
- Anzeige: Order Items mit Dropshipping Source
- Pro Item:
  - Supplier Link (Button → öffnet URL)
  - Einkaufspreis vs. Verkaufspreis (Margin%)
  - Status Dropdown (PENDING → ORDERED → SHIPPED → DELIVERED)
  - Input: Supplier Order ID
  - Input: Tracking Nummer
  - Input: Carrier
  - Textarea: Notizen
- **Platzierung:** In Order Detail View (nur für ROLE_RESELLER)

### **Erweiterte Komponenten:**

#### 1. **`product-variants-manager.component.ts`**
```typescript
// Pro Variant-Row:
- [Existierende Felder: SKU, Price, Stock]
- [NEU] Button: "🔗 Supplier Link" → öffnet Modal/Inline Form
- [NEU] Badge: "Dropshipping" wenn Link vorhanden
- [NEU] Margin: "Marge: +45%" wenn Link vorhanden
```

#### 2. **`order-detail.component.ts` (Reseller View)**
```typescript
// Pro OrderItem:
- [Existierende Felder: Name, Quantity, Price]
- [NEU] Wenn Dropshipping:
  - "🚚 Beim Supplier bestellen" Button
  - Supplier Link anzeigen
  - Fulfillment Status
  - Tracking Info Input
```

---

## 🔐 SICHERHEIT & VALIDIERUNG

### **Access Control:**
- Nur `ROLE_RESELLER` kann Dropshipping-Links setzen
- Nur Store Owner kann seine eigenen Supplier-Links sehen/bearbeiten
- Public Storefront sieht KEINE Supplier-Info

### **Validierung:**
- URL Format validieren (http/https)
- Purchase Price > 0
- Purchase Price < Sale Price (Warnung, kein Error)
- Tracking Number Format (optional)

---

## 📈 WORKFLOW (PHASE 1)

### **1. Product Setup (Reseller Admin):**
```
1. Reseller erstellt Product + Variants
2. Klickt bei Variant auf "Supplier Link hinzufügen"
3. Gibt ein:
   - Supplier URL: https://alibaba.com/product/12345
   - Einkaufspreis: 8.50 €
   - Geschätzte Lieferzeit: 14 Tage
   - Notizen: "Mindestbestellmenge: 10 Stück"
4. System speichert in `dropshipping_sources`
5. Berechnet Margin: (19.99 - 8.50) / 19.99 = 57% Marge
```

### **2. Order Fulfillment (Reseller Admin):**
```
1. Kunde bestellt im Storefront (normal)
2. Order erscheint in Reseller Order-Liste
3. Reseller öffnet Order Details
4. System zeigt:
   ⚠️ "2 Items benötigen Dropshipping"
   
   Item 1: T-Shirt Rot-M
   🔗 Supplier: https://alibaba.com/...
   💰 Einkaufspreis: 8.50 € (Marge: 57%)
   📦 Status: [PENDING ▼]
   
5. Reseller:
   - Klickt Link → bestellt bei Alibaba
   - Setzt Status auf "ORDERED"
   - Gibt Tracking ein (später)
   
6. Kunde sieht normalen Order Status (PENDING → SHIPPED)
```

---

## 📁 BETROFFENE DATEIEN

### **Backend (Neu):**
```
src/main/java/storebackend/
  ├── entity/
  │   ├── DropshippingSource.java          ← NEU
  │   └── OrderItem.java                    ← ERWEITERN
  ├── enums/
  │   └── FulfillmentStatus.java            ← NEU
  ├── dto/
  │   ├── DropshippingSourceDTO.java        ← NEU
  │   ├── OrderItemDTO.java                 ← ERWEITERN
  │   └── FulfillmentUpdateRequest.java     ← NEU
  ├── repository/
  │   └── DropshippingSourceRepository.java ← NEU
  ├── service/
  │   └── DropshippingService.java          ← NEU
  └── controller/
      └── DropshippingController.java       ← NEU
```

### **Frontend (Neu/Erweitert):**
```
storeFrontend/src/app/
  ├── core/
  │   ├── models/
  │   │   └── dropshipping.model.ts         ← NEU
  │   └── services/
  │       └── dropshipping.service.ts       ← NEU
  └── features/
      ├── products/
      │   ├── product-variants-manager.component.ts  ← ERWEITERN
      │   └── supplier-link-form.component.ts        ← NEU
      └── orders/
          ├── order-detail.component.ts              ← ERWEITERN
          └── fulfillment-tracker.component.ts       ← NEU
```

### **Database:**
```
scripts/db/
  ├── schema.sql                            ← ERWEITERN
  └── migrations/
      └── V10__dropshipping_phase1.sql      ← NEU
```

---

## 🚀 IMPLEMENTIERUNGS-REIHENFOLGE

### **Step 1: Database Schema** (10 Min)
- Erstelle Migration `V10__dropshipping_phase1.sql`
- Update `scripts/db/schema.sql`
- Update `src/main/resources/schema.sql` (H2)

### **Step 2: Backend Entities & Enums** (15 Min)
- `FulfillmentStatus.java`
- `DropshippingSource.java`
- Erweitere `OrderItem.java`

### **Step 3: Backend DTOs** (10 Min)
- `DropshippingSourceDTO.java`
- `FulfillmentUpdateRequest.java`
- Erweitere `OrderItemDTO.java`

### **Step 4: Backend Service & Repository** (20 Min)
- `DropshippingSourceRepository.java`
- `DropshippingService.java` (Validierung, Margin-Calc)

### **Step 5: Backend Controller** (15 Min)
- `DropshippingController.java`
- Security: Nur ROLE_RESELLER

### **Step 6: Frontend Models & Service** (10 Min)
- `dropshipping.model.ts`
- `dropshipping.service.ts`

### **Step 7: Frontend UI - Supplier Link** (30 Min)
- `supplier-link-form.component.ts` (Modal/Dialog)
- Integration in `product-variants-manager.component.ts`

### **Step 8: Frontend UI - Fulfillment** (30 Min)
- `fulfillment-tracker.component.ts`
- Integration in `order-detail.component.ts`

### **Step 9: Testing** (20 Min)
- Unit Tests (falls Test-Setup existiert)
- Manual Testing Flow

**Gesamt:** ~2.5 Stunden

---

## 💡 DESIGN-ENTSCHEIDUNGEN

### **Warum Variant-Level statt Product-Level?**
- Verschiedene Varianten können von unterschiedlichen Suppliern kommen
- Flexibler für Multi-Sourcing
- Realistisch: "Rot-S" von Supplier A, "Blau-M" von Supplier B

### **Warum keine automatische API Integration?**
- Phase 1 = MVP = manueller Workflow
- Supplier-APIs sind komplex (OAuth, Rate Limits, verschiedene Formate)
- Manuell = funktioniert sofort, keine Abhängigkeiten

### **Warum separate Tabelle statt Product erweitern?**
- Cleaner: Nicht jedes Produkt ist Dropshipping
- Normalisiert: Supplier-Info nur wo nötig
- Erweiterbar: Später mehrere Sources pro Variant

---

## 🎯 ACCEPTANCE CRITERIA (PHASE 1)

### **Als Reseller kann ich:**
- ✅ Bei einer Variant einen Supplier-Link hinzufügen
- ✅ Einkaufspreis und Verkaufspreis sehen (Margin%)
- ✅ Notizen zum Supplier hinterlegen
- ✅ In Order-Details den Supplier-Link sehen
- ✅ Fulfillment Status pro Item setzen
- ✅ Tracking-Nummer erfassen

### **Als Kunde:**
- ✅ Sehe keinen Unterschied (normaler Shop)
- ✅ Bestellung funktioniert normal
- ✅ Tracking funktioniert (wenn Reseller es eingibt)

### **Als System:**
- ✅ Supplier-Info wird NICHT im Storefront gezeigt
- ✅ Nur Store-Owner sieht Dropshipping-Details
- ✅ Commission-System funktioniert weiterhin

---

## 📋 NÄCHSTER SCHRITT

**JETZT:** Starte mit Step 1 - Database Migration erstellen

