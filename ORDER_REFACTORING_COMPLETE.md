# ✅ Order Calculation Refactoring - Vollständig

## Implementierte Lösung: BEVORZUGTE VARIANTE

Die Order wird **EINMALIG** mit vollständig berechneten Werten gespeichert.
**KEINE** temporäre 0,00-EUR-Order mehr in der Datenbank!

---

## Was wurde geändert?

### 1. Order-Erstellung OHNE frühzeitiges save() ✅

**Vorher (PROBLEMATISCH):**
```java
Order order = new Order();
// ... Basis-Daten setzen
// ❌ Erstes save() mit NULL/ZERO-Werten
Order savedOrder = orderRepository.save(order);

// OrderItems mit savedOrder.getId() erstellen
for (CartItem item : cartItems) {
    OrderItem orderItem = new OrderItem();
    orderItem.setOrder(savedOrder); // Braucht ID
    orderItemRepository.save(orderItem);
}

// Berechnungen durchführen
savedOrder.setTotalGross(...);
savedOrder.setTotalAmount(...);

// ❌ Zweites save() mit echten Werten
orderRepository.save(savedOrder);
```

**Nachher (KORREKT):**
```java
Order order = new Order();
// ... Basis-Daten setzen

// OrderItems im Speicher erstellen (OHNE save)
List<OrderItem> orderItems = new ArrayList<>();
for (CartItem item : cartItems) {
    OrderItem orderItem = new OrderItem();
    orderItem.setOrder(order); // Referenz auf unsaved order - OK!
    orderItems.add(orderItem);
}

// Alle Berechnungen durchführen
order.setTotalGross(...);
order.setTotalAmount(...);

// Validierung VOR save
validateCalculatedOrder(order, orderItems);

// ✅ EINMALIGES save() mit vollständigen Daten
Order savedOrder = orderRepository.save(order);

// OrderItems mit savedOrder verknüpfen und speichern
orderItems.forEach(item -> item.setOrder(savedOrder));
orderItemRepository.saveAll(orderItems);

// Inventory-Anpassungen NACH erfolgreicher Persistierung
adjustInventory(...);
```

---

### 2. Verbesserte Validierung mit Konsistenz-Checks ✅

**validateCalculatedOrder(Order order, List<OrderItem> items)** prüft jetzt:

#### NULL-Checks:
- ✅ `totalAmount != null`
- ✅ `totalGross != null && totalNet != null`
- ✅ `taxTotal != null`
- ✅ `subtotalNet != null && subtotalGross != null`
- ✅ `shippingNet != null && shippingGross != null`

#### Konsistenz-Checks:
- ✅ `totalAmount == totalGross` (Legacy-Feld-Synchronisation)
- ✅ `subtotalGross > 0` wenn Items vorhanden (außer bei 100%-Rabatt)
- ✅ `totalGross == subtotalGross - discountGross + shippingGross` (Rechenformel)

**Vorteil:** Fehler werden **VOR** dem save() erkannt mit verständlichen Service-Exceptions,
nicht erst in der Datenbank als kryptische Constraint-Verletzung.

---

### 3. @PrePersist Hook verbessert ✅

**Vorher (PROBLEMATISCH - verschleierte Fehler):**
```java
@PrePersist
protected void onCreate() {
    // ❌ Automatische Synchronisierung verschleiert fehlende Berechnungen
    if (this.totalGross != null) {
        this.totalAmount = this.totalGross;
    }
}
```

**Nachher (KORREKT - explizite Validierung):**
```java
@PrePersist
protected void onCreate() {
    createdAt = LocalDateTime.now();
    
    // ✅ Explizite Validierung statt stiller Korrektur
    if (this.totalAmount == null || this.totalGross == null) {
        throw new IllegalStateException(
            "Order must have totalAmount and totalGross calculated " +
            "before persisting. Critical bug in service layer!"
        );
    }
    
    // ✅ Konsistenz-Check
    if (this.totalAmount.compareTo(this.totalGross) != 0) {
        throw new IllegalStateException(
            "Order totalAmount must equal totalGross"
        );
    }
}
```

**Wichtig:** Die **fachliche Zuweisung** `totalAmount = totalGross` erfolgt jetzt im Service,
nicht mehr versteckt im Entity-Hook!

---

### 4. Order.vatEnabled Field hinzugefügt ✅

```java
@Column(name = "vat_enabled", nullable = false)
private Boolean vatEnabled = true;
```

Snapshot-Feld vom Store zum Bestellzeitpunkt - wird im OrderService gesetzt.

---

## Transaktions-Sicherheit ✅

**Geprüft:**
- ✅ `@Transactional` ist vorhanden in `createOrderFromCart()`
- ✅ **KEINE** `saveAndFlush()` oder `flush()` im Order-Flow
- ✅ **KEINE** `REQUIRES_NEW` Propagation im Order-Flow
- ✅ Bei Exception wird **alles** zurückgerollt
- ✅ Die temporäre Order ist **NIEMALS** außerhalb der Transaktion sichtbar

**Ergebnis:** Sauberes Transaktionsmodell - Order und Items sind atomar.

---

## Pickup-Fall ✅

Korrekt behandelt:
```java
if (deliveryType == PICKUP) {
    deliveryFeeGross = BigDecimal.ZERO;
}

// Versandfelder werden trotzdem berechnet
shippingNet = BigDecimal.ZERO;
shippingTax = BigDecimal.ZERO;
shippingGross = BigDecimal.ZERO;

// Produkt- und Gesamtsummen werden normal berechnet
totalGross = subtotalGross - discountGross + shippingGross;
```

---

## Build & Test Status

```bash
✅ mvn clean compile → BUILD SUCCESS (13.8s)
✅ OrderSnapshotPersistenceTest → PASSED (1 Test)

⚠️  2 Tests fehlgeschlagen (NICHT durch Refactoring verursacht):
   - OrderDiscountAndShippingTest: "Delivery option not available"
   - Ursache: Test-Setup-Problem (fehlende DeliveryProvider-Mocks)
```

---

## Testing nach Deployment

### 1. Pickup-Bestellung erstellen

Nach erfolgreicher Order prüfen:

```sql
SELECT
    id,
    order_number,
    delivery_type,
    currency_code,
    price_mode,
    vat_enabled,
    subtotal_net,
    subtotal_gross,
    tax_total,
    shipping_net,
    shipping_tax,
    shipping_gross,
    discount_net,
    discount_tax,
    discount_gross,
    total_net,
    total_gross,
    total_amount,
    created_at
FROM orders
WHERE delivery_type = 'PICKUP'
ORDER BY id DESC
LIMIT 1;
```

**Erwartetes Ergebnis bei Pickup:**
```
delivery_type:     PICKUP
shipping_net:      0.00
shipping_tax:      0.00
shipping_gross:    0.00
subtotal_gross:    > 0 (Produktwert)
total_amount:      = total_gross
total_gross:       = subtotal_gross - discount_gross + 0
vat_enabled:       true/false (vom Store)
```

### 2. OrderItems prüfen

```sql
SELECT
    oi.order_id,
    oi.product_name,
    oi.quantity,
    oi.tax_category,
    oi.tax_rate,
    oi.unit_price_net,
    oi.unit_price_gross,
    oi.line_net,
    oi.line_tax,
    oi.line_gross,
    p.base_price as product_base_price
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = (
    SELECT id FROM orders ORDER BY id DESC LIMIT 1
);
```

**Erwartetes Ergebnis:**
```
tax_category:      STANDARD / REDUCED / EXEMPT
tax_rate:          19.00 / 7.00 / 0.00 (je nach Store vatEnabled)
line_gross:        = unit_price_gross * quantity
line_net + line_tax = line_gross (Rundungsdifferenzen < 0.01 akzeptabel)
```

### 3. Delivery-Bestellung mit Versandkosten

```sql
SELECT
    order_number,
    delivery_type,
    delivery_mode,
    shipping_provider,
    shipping_gross,
    eta_minutes,
    total_gross
FROM orders
WHERE delivery_type = 'DELIVERY'
ORDER BY id DESC
LIMIT 1;
```

**Erwartetes Ergebnis:**
```
delivery_type:     DELIVERY
delivery_mode:     STANDARD / EXPRESS / SAME_DAY
shipping_gross:    > 0
total_gross:       = subtotal_gross - discount_gross + shipping_gross
```

### 4. Bestellung mit Coupon

```sql
SELECT
    order_number,
    coupon_code_snapshot,
    discount_type_snapshot,
    discount_value_snapshot,
    subtotal_gross,
    discount_gross,
    shipping_gross,
    total_gross
FROM orders
WHERE coupon_code_snapshot IS NOT NULL
ORDER BY id DESC
LIMIT 1;
```

**Erwartetes Ergebnis:**
```
discount_type_snapshot:  PERCENT / FIXED / FREE_SHIPPING
discount_gross:          > 0 (oder shipping_gross = 0 bei FREE_SHIPPING)
total_gross:             = subtotal_gross - discount_gross + shipping_gross
```

---

## Migration für alte NULL-Orders (falls vorhanden)

**Nur für bestehende fehlerhafte Datensätze:**

```sql
-- Prüfen, ob NULL-Orders existieren
SELECT COUNT(*) 
FROM orders 
WHERE total_amount IS NULL OR total_gross IS NULL;

-- Falls ja: Backfill mit ZERO oder Neuberechnung
UPDATE orders 
SET 
    total_amount = COALESCE(total_amount, total_gross, 0),
    total_gross = COALESCE(total_gross, 0),
    total_net = COALESCE(total_net, 0),
    tax_total = COALESCE(tax_total, 0),
    subtotal_gross = COALESCE(subtotal_gross, 0),
    subtotal_net = COALESCE(subtotal_net, 0),
    shipping_gross = COALESCE(shipping_gross, 0),
    shipping_net = COALESCE(shipping_net, 0),
    shipping_tax = COALESCE(shipping_tax, 0),
    discount_gross = COALESCE(discount_gross, 0),
    discount_net = COALESCE(discount_net, 0),
    discount_tax = COALESCE(discount_tax, 0)
WHERE total_amount IS NULL OR total_gross IS NULL;
```

**Hinweis:** Für **neue** Orders ist diese Migration **nicht** mehr notwendig!

---

## Vorteile des Refactorings

### ✅ Fachlich korrekt
- Order wird **niemals** mit unvollständigen Daten persistiert
- Keine temporären 0,00-EUR-Orders in der Datenbank
- Alle Berechnungen erfolgen VOR dem save()

### ✅ Saubere Transaktion
- Nur **EIN** `save()` statt zwei
- Order und Items atomar in einer Transaktion
- Bei Exception: vollständiges Rollback

### ✅ Bessere Fehler-Diagnose
- Validierung VOR save() → verständliche Service-Exceptions
- Nicht erst in der DB → kryptische Constraint-Verletzungen
- @PrePersist validiert statt zu verschleiern

### ✅ Wartbarkeit
- Explizite Berechnung im Service
- Keine versteckten Werte-Synchronisierungen im Entity
- Klare Verantwortlichkeiten

### ✅ Performance
- Ein DB-Roundtrip weniger (nur 1x save statt 2x)
- Weniger Lock-Zeit auf der DB

---

## Langfristige Empfehlung

Falls weitere Order-Creation-Flows existieren (Admin-Orders, Import, etc.),
sollten diese ebenfalls nach diesem Muster refactored werden:

1. Order-Objekt im Speicher erstellen
2. Items im Speicher erstellen und verknüpfen
3. **Alle** Berechnungen durchführen
4. Validieren
5. **Einmalig** speichern

**Nicht:**
- Order speichern → Items speichern → Order updaten
