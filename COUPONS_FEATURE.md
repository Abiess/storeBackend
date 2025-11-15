# Coupons & Discounts Feature - Dokumentation

## Übersicht

Vollständiges Gutschein- und Rabattsystem für Multi-Tenant-SaaS mit Spring Boot Backend und Angular Frontend.

## Backend-Architektur

### Entitäten

#### Coupon
- **Felder**: code, type (PERCENT/FIXED/FREE_SHIPPING), discount values, validity period, conditions
- **Multi-Tenancy**: `storeId` für Store-Isolation
- **Code-Normalisierung**: Automatische Normalisierung (O→0, I/L→1, S→5) für eindeutige Codes
- **Domain-Scope**: Gutscheine können auf spezifische Domains beschränkt werden
- **Stacking-Regeln**: NONE, STACK_WITH_DIFFERENT_TYPES, STACK_ALL

#### CouponRedemption
- Protokolliert jede Gutschein-Verwendung
- Verknüpft mit Order-ID (idempotent)
- Speichert angewendeten Rabattbetrag

### REST APIs

#### Admin-Endpunkte

```
GET    /api/stores/{storeId}/coupons              - Liste aller Gutscheine (mit Filter)
GET    /api/stores/{storeId}/coupons/{id}         - Einzelner Gutschein
POST   /api/stores/{storeId}/coupons              - Neuen Gutschein erstellen
PUT    /api/stores/{storeId}/coupons/{id}         - Gutschein aktualisieren
POST   /api/stores/{storeId}/coupons/{id}/pause   - Gutschein pausieren
POST   /api/stores/{storeId}/coupons/{id}/resume  - Gutschein aktivieren
POST   /api/stores/{storeId}/coupons/{id}/archive - Gutschein archivieren
GET    /api/stores/{storeId}/coupons/{id}/usage   - Nutzungsstatistik
POST   /api/stores/{storeId}/coupons/import       - CSV-Import (TODO)
GET    /api/stores/{storeId}/coupons/export       - CSV-Export (TODO)
```

#### Public-Endpunkte (Checkout)

```
POST   /public/stores/{storeId}/cart/validate-coupons
       - Validiert Gutscheine und berechnet Rabatte
       - Request: { domainHost, cart, appliedCodes[] }
       - Response: { validCoupons[], invalidCoupons[], cartTotals }

POST   /public/stores/{storeId}/orders/{orderId}/finalize-coupons
       - Finalisiert Gutscheine nach Bestellabschluss
       - Idempotent (basierend auf orderId)
```

### Service-Logik (CouponService)

#### Validierungsregeln

1. **Status**: Nur ACTIVE Gutscheine sind gültig
2. **Zeitfenster**: startsAt ≤ now ≤ endsAt
3. **Währung**: Muss mit Warenkorb-Währung übereinstimmen
4. **Mindestbestellwert**: cart.subtotal >= minSubtotalCents
5. **Produkt-Filter**: Bei PRODUCTS/CATEGORIES/COLLECTIONS nur für passende Artikel
6. **Kunden-Filter**: Bei customerEmails[] nur für gelistete E-Mails
7. **Domain-Scope**: Bei SELECTED nur für ausgewählte Domains
8. **Nutzungslimits**: 
   - usageLimitTotal (global)
   - usageLimitPerCustomer (pro Kunde)

#### Stacking-Logik

- **NONE**: Nur der beste Gutschein wird angewendet
- **STACK_WITH_DIFFERENT_TYPES**: PERCENT + FIXED kombinierbar
- **STACK_ALL**: Alle Gutscheine werden gestapelt

#### Auto-Apply

Gutscheine mit `autoApply=true` werden automatisch beim Checkout angewendet.

## Frontend-Architektur

### Admin-Komponenten

#### CouponsListComponent
**Pfad**: `/dashboard/{storeId}/coupons`

**Features**:
- Tabelle mit allen Gutscheinen
- Filter nach Status (ACTIVE, PAUSED, ARCHIVED)
- Aktionen: Bearbeiten, Pausieren, Aktivieren, Archivieren
- Import/Export-Buttons (Vorbereitet)

**Spalten**: Code, Typ, Rabatt, Status, Verwendungen, Gültigkeitszeitraum, Aktionen

#### CouponEditorComponent
**Pfad**: `/dashboard/{storeId}/coupons/{id}` oder `/dashboard/{storeId}/coupons/new`

**Formular-Sektionen**:
1. **Grundeinstellungen**: Code, Typ, Rabatt-Wert, Währung, Status
2. **Gültigkeitszeitraum**: Start-/Enddatum (optional)
3. **Bedingungen**: Mindestbestellwert, Produktfilter
4. **Domain-Bereich**: Alle oder ausgewählte Domains
5. **Nutzungslimits**: Gesamt und pro Kunde
6. **Kombinierbarkeit**: Stacking-Regeln, Auto-Apply

### Storefront-Komponente

#### CouponInputComponent
**Verwendung**: In Cart/Checkout einbinden

```typescript
<app-coupon-input 
  [storeId]="storeId"
  [cart]="cart"
  [domainHost]="domainHost"
  (couponsApplied)="onCouponsApplied($event)">
</app-coupon-input>
```

**Features**:
- Eingabefeld für Gutscheincode
- Auto-Validierung beim Laden (für Auto-Apply)
- Anzeige angewendeter Gutscheine als Chips
- Entfernen-Funktion für Gutscheine
- Fehler-Nachrichten für ungültige Codes
- Gesamtrabatt-Anzeige

### Service (CouponService)

**Wichtige Methoden**:
- `listCoupons()` - Admin-Liste
- `createCoupon()` / `updateCoupon()` - CRUD
- `validateCoupons()` - Public Validierung
- `finalizeCoupons()` - Order-Finalisierung

## Integration in Checkout

### Schritt 1: Gutschein validieren

```typescript
validateCouponsRequest: ValidateCouponsRequest = {
  domainHost: window.location.hostname,
  cart: {
    currency: 'EUR',
    subtotalCents: 10000,
    customerEmail: 'kunde@example.com',
    items: [
      {
        productId: 1,
        productName: 'Produkt A',
        priceCents: 5000,
        quantity: 2,
        categoryIds: [1, 2],
        collectionIds: []
      }
    ]
  },
  appliedCodes: ['SAVE20']
};

couponService.validateCoupons(storeId, validateCouponsRequest).subscribe(response => {
  console.log('Valid:', response.validCoupons);
  console.log('Invalid:', response.invalidCoupons);
  console.log('Total:', response.cartTotals.totalCents);
});
```

### Schritt 2: Order abschließen und Gutscheine finalisieren

```typescript
// Nach erfolgreicher Bestellung
couponService.finalizeCoupons(storeId, orderId, validateCouponsRequest).subscribe(() => {
  console.log('Coupons finalized');
});
```

## Datenbank-Migration

```sql
-- Coupons Tabelle
CREATE TABLE coupons (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    code VARCHAR(100) NOT NULL,
    code_normalized VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    percent_discount INTEGER,
    value_cents BIGINT,
    currency VARCHAR(3),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    min_subtotal_cents BIGINT,
    applies_to VARCHAR(20) NOT NULL,
    domain_scope VARCHAR(20) NOT NULL,
    usage_limit_total INTEGER,
    usage_limit_per_customer INTEGER,
    times_used_total INTEGER NOT NULL DEFAULT 0,
    combinable VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupon_store ON coupons(store_id);
CREATE INDEX idx_coupon_code ON coupons(store_id, code_normalized);

-- Product/Category/Collection IDs
CREATE TABLE coupon_product_ids (
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL
);

CREATE TABLE coupon_category_ids (
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL
);

CREATE TABLE coupon_collection_ids (
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    collection_id BIGINT NOT NULL
);

CREATE TABLE coupon_customer_emails (
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL
);

CREATE TABLE coupon_domain_ids (
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    domain_id BIGINT NOT NULL
);

-- Redemptions Tabelle
CREATE TABLE coupon_redemptions (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    coupon_id BIGINT NOT NULL,
    customer_id BIGINT,
    customer_email VARCHAR(255),
    order_id BIGINT NOT NULL,
    applied_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    domain_host VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_redemption_store ON coupon_redemptions(store_id);
CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_redemption_customer ON coupon_redemptions(customer_id);
CREATE UNIQUE INDEX idx_redemption_order ON coupon_redemptions(order_id);
```

## Unit Tests

### Backend Tests

Siehe `CouponServiceTest.java` für:
- ✅ Prozentuale Gutscheine
- ✅ Abgelaufene Gutscheine
- ✅ Mindestbestellwert-Validierung
- ✅ Nutzungslimits (gesamt und pro Kunde)
- ✅ Feste Rabattbeträge
- ✅ Produktspezifische Filter
- ✅ Duplizierte Codes
- ✅ Idempotente Finalisierung

## Best Practices

1. **Code-Normalisierung**: Alle Codes werden automatisch normalisiert (5AVE20 = SAVE20)
2. **Idempotenz**: `finalizeCoupons()` kann mehrfach aufgerufen werden
3. **Validierung**: Immer vor Orderabschluss re-validieren
4. **Multi-Tenancy**: Alle Queries filtern nach storeId
5. **Sicherheit**: Admin-APIs mit Auth-Guard schützen
6. **Performance**: Indizes auf store_id und code_normalized

## Zukünftige Erweiterungen

- [ ] CSV Import/Export vollständig implementieren
- [ ] Gutschein-Templates (automatische Code-Generierung)
- [ ] A/B-Testing für Rabatte
- [ ] Affiliate-Tracking pro Gutschein
- [ ] Erweiterte Analytics (Conversion-Rate, AOV)
- [ ] Scheduled Auto-Pause (bei Ablauf)
- [ ] Webhook-Benachrichtigungen

## API-Beispiele

### Gutschein erstellen

```bash
POST /api/stores/1/coupons
Content-Type: application/json

{
  "code": "SUMMER2024",
  "type": "PERCENT",
  "percentDiscount": 20,
  "currency": "EUR",
  "startsAt": "2024-06-01T00:00:00",
  "endsAt": "2024-08-31T23:59:59",
  "minSubtotalCents": 5000,
  "appliesTo": "ALL",
  "domainScope": "ALL",
  "usageLimitTotal": 1000,
  "usageLimitPerCustomer": 1,
  "combinable": "NONE",
  "status": "ACTIVE",
  "autoApply": false,
  "description": "Sommer-Rabatt 2024"
}
```

### Gutscheine validieren

```bash
POST /public/stores/1/cart/validate-coupons
Content-Type: application/json

{
  "domainHost": "mystore.example.com",
  "cart": {
    "currency": "EUR",
    "subtotalCents": 10000,
    "customerEmail": "kunde@example.com",
    "items": [
      {
        "productId": 1,
        "productName": "T-Shirt",
        "priceCents": 2500,
        "quantity": 4
      }
    ]
  },
  "appliedCodes": ["SUMMER2024"]
}
```

**Response:**
```json
{
  "validCoupons": [
    {
      "couponId": 1,
      "code": "SUMMER2024",
      "type": "PERCENT",
      "discountCents": 2000,
      "message": "PERCENT discount"
    }
  ],
  "invalidCoupons": [],
  "cartTotals": {
    "subtotalCents": 10000,
    "discountCents": 2000,
    "shippingCents": 0,
    "taxCents": 0,
    "totalCents": 8000,
    "currency": "EUR"
  }
}
```

## Support

Bei Fragen oder Problemen öffnen Sie ein Issue oder kontaktieren Sie das Entwicklerteam.

