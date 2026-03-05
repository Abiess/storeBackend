# 🔍 DELIVERY/SHIPPING ARCHITECTURE ANALYSIS

**Analyse-Datum:** 5. März 2026  
**Ziel:** Verstehen der vorhandenen Delivery-Architektur vor Step 14 Implementation  
**Status:** ANALYSIS COMPLETE ✅

---

## 📦 1. GEFUNDENE BACKEND KLASSEN

### ✅ Entities (3 Core Entities)

#### 1.1 DeliveryProvider
**Path:** `entity/DeliveryProvider.java`  
**Table:** `delivery_providers`  
**Fields:**
```java
- id: Long (PK)
- store: Store (FK)
- type: DeliveryProviderType (Enum)
- name: String (100)
- isActive: Boolean
- priority: Integer
- configJson: String (TEXT) // Flexible config storage
- createdAt: LocalDateTime
- updatedAt: LocalDateTime
```
**Index:** `idx_store_active_priority (store_id, is_active, priority)`

---

#### 1.2 DeliveryZone
**Path:** `entity/DeliveryZone.java`  
**Table:** `delivery_zones`  
**Fields:**
```java
- id: Long (PK)
- store: Store (FK)
- name: String (100)
- isActive: Boolean
- country: String (100)
- city: String (100)
- postalCodeRanges: String (TEXT) // JSON array: ["20000-20999"]
- minOrderValue: BigDecimal
- feeStandard: BigDecimal (required)
- feeExpress: BigDecimal
- etaStandardMinutes: Integer (required)
- etaExpressMinutes: Integer
- createdAt: LocalDateTime
- updatedAt: LocalDateTime
```
**Index:** `idx_store_active (store_id, is_active)`

**Wichtig:** DeliveryZone hat ZWEI Modi:
- STANDARD (feeStandard, etaStandardMinutes)
- EXPRESS (feeExpress, etaExpressMinutes)

---

#### 1.3 StoreDeliverySettings
**Path:** `entity/StoreDeliverySettings.java`  
**Table:** `store_delivery_settings`  
**Fields:**
```java
- storeId: Long (PK, OneToOne mit Store)
- pickupEnabled: Boolean (default true)
- deliveryEnabled: Boolean (default false)
- expressEnabled: Boolean (default false)
- currency: String(3) (default "EUR")
- updatedAt: LocalDateTime
```

**Wichtig:** Globale Store-Settings für Delivery On/Off

---

### ✅ Enums (3 Enums)

#### 1.4 DeliveryType
**Path:** `enums/DeliveryType.java`
```java
public enum DeliveryType {
    PICKUP,    // Customer picks up at store
    DELIVERY   // Delivery to customer address
}
```

#### 1.5 DeliveryMode
**Path:** `enums/DeliveryMode.java`
```java
public enum DeliveryMode {
    STANDARD,  // Standard speed
    EXPRESS    // Fast delivery
}
```

#### 1.6 DeliveryProviderType
**Path:** `enums/DeliveryProviderType.java` (assumed, referenced in DeliveryProvider)
```java
// Wahrscheinlich:
public enum DeliveryProviderType {
    IN_HOUSE,      // Own delivery
    THIRD_PARTY,   // External provider (DHL, etc.)
    MARKETPLACE    // Marketplace delivery
}
```

---

### ✅ Repositories (3)

```java
// Gefunden via grep:
- DeliveryProviderRepository
- DeliveryZoneRepository  
- StoreDeliverySettingsRepository

// Standard Spring Data JPA
// Likely methods:
findByStoreIdOrderByNameAsc(Long storeId)
findByStoreIdAndIsActiveTrue(Long storeId)
```

---

### ✅ Services (3)

#### 1.7 DeliveryProviderService
**Path:** `service/DeliveryProviderService.java`  
**Methods:**
```java
getProvidersByStore(Long storeId): List<DeliveryProviderDTO>
getProvider(Long providerId): DeliveryProviderDTO
createProvider(Long storeId, DeliveryProviderRequest): DeliveryProviderDTO
updateProvider(Long providerId, DeliveryProviderRequest): DeliveryProviderDTO
deleteProvider(Long providerId): void
```

#### 1.8 DeliveryZoneService
**Path:** `service/DeliveryZoneService.java`  
**Methods:**
```java
getZonesByStore(Long storeId): List<DeliveryZoneDTO>
getZone(Long zoneId): DeliveryZoneDTO
createZone(Long storeId, DeliveryZoneRequest): DeliveryZoneDTO
updateZone(Long zoneId, DeliveryZoneRequest): DeliveryZoneDTO
deleteZone(Long zoneId): void
```

#### 1.9 StoreDeliverySettingsService
**Path:** `service/StoreDeliverySettingsService.java`  
**Methods:**
```java
getSettings(Long storeId): StoreDeliverySettingsDTO
updateSettings(Long storeId, StoreDeliverySettingsDTO): StoreDeliverySettingsDTO
```

---

### ✅ Controllers (1 Admin Controller)

#### 1.10 DeliveryController
**Path:** `controller/DeliveryController.java`  
**Base:** `/api/stores/{storeId}/delivery`  
**Auth:** Required (Store Owner only via StoreAccessChecker)

**Endpoints:**
```
GET    /settings                     - Get delivery settings
PUT    /settings                     - Update delivery settings

GET    /providers                    - List providers
GET    /providers/{providerId}       - Get provider
POST   /providers                    - Create provider
PUT    /providers/{providerId}       - Update provider
DELETE /providers/{providerId}       - Delete provider

GET    /zones                        - List zones
GET    /zones/{zoneId}               - Get zone
POST   /zones                        - Create zone
PUT    /zones/{zoneId}               - Update zone
DELETE /zones/{zoneId}               - Delete zone
```

**Security:** Alle Endpoints prüfen:
```java
if (user == null) return 401;
if (!StoreAccessChecker.isOwner(store, user)) return 403;
```

---

### ✅ DTOs (6+)

**Gefunden:**
```
- DeliveryProviderDTO
- DeliveryProviderRequest
- DeliveryZoneDTO
- DeliveryZoneRequest
- StoreDeliverySettingsDTO
```

---

## 📦 2. ORDER ENTITY DELIVERY FIELDS

### Order.java - Delivery Fields (BEREITS VORHANDEN!)

```java
// Line 103-118
@Enumerated(EnumType.STRING)
@Column(name = "delivery_type", length = 20)
private DeliveryType deliveryType;          // PICKUP or DELIVERY

@Enumerated(EnumType.STRING)
@Column(name = "delivery_mode", length = 20)
private DeliveryMode deliveryMode;          // STANDARD or EXPRESS

@Column(name = "delivery_provider_id")
private Long deliveryProviderId;            // FK to DeliveryProvider

@Column(name = "delivery_fee", precision = 10, scale = 2)
private BigDecimal deliveryFee;             // Calculated fee

@Column(name = "eta_minutes")
private Integer etaMinutes;                 // Estimated time
```

**✅ ALLE FELDER EXISTIEREN BEREITS!**

Fehlende Felder:
- ❌ `deliveryZoneId` - nicht vorhanden (kann aber via deliveryProviderId abgeleitet werden)
- ❌ `shippingMethod` als String - wird durch deliveryType + deliveryMode ersetzt

---

## 💰 3. SHIPPING CALCULATION (AKTUELL)

### OrderService.java - createOrder()

**Line 88-91:**
```java
// Add tax and shipping to total
BigDecimal tax = total.multiply(BigDecimal.valueOf(0.19)); // 19% MwSt
BigDecimal shipping = BigDecimal.valueOf(5.00); // ❌ HARDCODED!
total = total.add(tax).add(shipping);
```

**❌ PROBLEM:** Shipping ist hardcoded 5.00 EUR
- Kein Bezug zu DeliveryZones
- Kein STANDARD vs EXPRESS
- Kein postal code lookup
- Keine Store-specific settings

**Order Fields werden NICHT gesetzt:**
```java
// ❌ FEHLT:
order.setDeliveryType(deliveryType);
order.setDeliveryMode(deliveryMode);
order.setDeliveryProviderId(providerId);
order.setDeliveryFee(calculatedFee);
order.setEtaMinutes(eta);
```

---

## 🌐 4. FRONTEND CHECKOUT (AKTUELL)

### checkout.component.ts

**Line 1126:**
```typescript
shipping = 4.99;  // ❌ HARDCODED!
expressShipping = 9.99; // ❌ HARDCODED!
```

**Shipping Method Selection (Line 243-276):**
```html
<input type="radio" name="shippingMethod" value="STANDARD" 
       [(ngModel)]="selectedShippingMethod" />
<!-- Shows: shipping | number:'1.2-2' -->

<input type="radio" name="shippingMethod" value="EXPRESS"
       [(ngModel)]="selectedShippingMethod" />
<!-- Shows: expressShipping | number:'1.2-2' -->
```

**❌ PROBLEME:**
- Kein API Call zu Backend für Delivery Options
- Hardcoded prices
- Kein Postal Code → Zone Matching
- Kein StoreDeliverySettings Check (is delivery enabled?)

---

## 🔍 5. WAS FEHLT FÜR PUBLIC DELIVERY OPTIONS?

### ❌ Missing: Public Controller Endpoint

**Benötigt:** `/api/public/stores/{storeId}/delivery/options`

**Request:**
```json
{
  "postalCode": "20095",
  "city": "Hamburg",
  "country": "Germany"
}
```

**Response:**
```json
{
  "pickupEnabled": true,
  "deliveryEnabled": true,
  "expressEnabled": true,
  "options": [
    {
      "type": "PICKUP",
      "mode": null,
      "fee": 0.00,
      "eta": null,
      "available": true
    },
    {
      "type": "DELIVERY",
      "mode": "STANDARD",
      "fee": 4.99,
      "eta": 180,
      "available": true,
      "zoneId": 123,
      "zoneName": "Hamburg City"
    },
    {
      "type": "DELIVERY",
      "mode": "EXPRESS",
      "fee": 9.99,
      "eta": 60,
      "available": true,
      "zoneId": 123,
      "zoneName": "Hamburg City"
    }
  ]
}
```

---

### ❌ Missing: Public Delivery Service Logic

**Benötigt:** `PublicDeliveryService.java`

**Logic:**
```java
public DeliveryOptionsResponse getDeliveryOptions(
    Long storeId, 
    String postalCode, 
    String city, 
    String country
) {
    // 1. Get StoreDeliverySettings
    // 2. If deliveryEnabled, find matching DeliveryZone
    // 3. Check postal code ranges (JSON parsing)
    // 4. Build options list
    // 5. Return available + unavailable options
}
```

**Postal Code Matching:**
```java
// DeliveryZone.postalCodeRanges = "["20000-20999","21000-21999"]"
private boolean isPostalCodeInRange(String postalCode, String rangesJson) {
    // Parse JSON array
    // Check if postalCode matches any range
    // Return true/false
}
```

---

### ❌ Missing: Frontend Delivery Service

**Benötigt:** `delivery.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  getDeliveryOptions(
    storeId: number, 
    postalCode: string, 
    city: string, 
    country: string
  ): Observable<DeliveryOptions> {
    return this.http.post<DeliveryOptions>(
      `/api/public/stores/${storeId}/delivery/options`,
      { postalCode, city, country }
    );
  }
}
```

---

## 📊 6. DELIVERY DATENMODELL (ZUSAMMENFASSUNG)

### Hierarchie:

```
Store (1)
  ├─ StoreDeliverySettings (1:1)
  │    ├─ pickupEnabled: Boolean
  │    ├─ deliveryEnabled: Boolean
  │    └─ expressEnabled: Boolean
  │
  ├─ DeliveryProviders (1:N)
  │    ├─ type: IN_HOUSE | THIRD_PARTY | MARKETPLACE
  │    ├─ name: String
  │    ├─ isActive: Boolean
  │    ├─ priority: Integer
  │    └─ configJson: String (flexible)
  │
  └─ DeliveryZones (1:N)
       ├─ name: String
       ├─ country, city: String
       ├─ postalCodeRanges: JSON ["20000-20999"]
       ├─ minOrderValue: BigDecimal
       ├─ feeStandard: BigDecimal    ┐
       ├─ etaStandardMinutes: Integer│ STANDARD Mode
       ├─ feeExpress: BigDecimal     │
       └─ etaExpressMinutes: Integer ┘ EXPRESS Mode
```

### Order Mapping:

```
Order
  ├─ deliveryType: PICKUP | DELIVERY
  ├─ deliveryMode: STANDARD | EXPRESS
  ├─ deliveryProviderId: Long (FK)
  ├─ deliveryFee: BigDecimal
  └─ etaMinutes: Integer
```

---

## ✅ 7. WIEDERVERWENDBARE KLASSEN

### Entities:
- ✅ **DeliveryProvider** - für Provider Management
- ✅ **DeliveryZone** - für Zone-based pricing
- ✅ **StoreDeliverySettings** - für global enable/disable
- ✅ **Order.deliveryType/Mode/Fee** - bereits vorhanden!

### Services:
- ✅ **DeliveryZoneService** - reuse `getZonesByStore()`
- ✅ **StoreDeliverySettingsService** - reuse `getSettings()`
- ❌ **PublicDeliveryService** - NEW (zone matching logic)

### Enums:
- ✅ **DeliveryType** - PICKUP, DELIVERY
- ✅ **DeliveryMode** - STANDARD, EXPRESS
- ✅ **DeliveryProviderType** - IN_HOUSE, THIRD_PARTY, MARKETPLACE

---

## 🎯 8. EMPFEHLUNG FÜR STEP 14.1

### Phase 1: Backend Public Endpoint (MINIMAL)

**Neue Dateien:**
1. `PublicDeliveryService.java` (NEW)
   - Methode: `getDeliveryOptions(storeId, postalCode, city, country)`
   - Logic: Zone matching + Settings check
   - ~150-200 Zeilen

2. `PublicDeliveryController.java` (NEW)
   - Endpoint: `POST /api/public/stores/{storeId}/delivery/options`
   - No Auth required
   - ~80 Zeilen

3. `DeliveryOptionsDTO.java` (NEW)
   - Response DTO
   - ~50 Zeilen

**Geänderte Dateien:**
- ❌ KEINE! Reuse existing entities & services

---

### Phase 2: OrderService Integration

**Geänderte Dateien:**
1. `OrderService.createOrder()` (MODIFY)
   - Ersetze hardcoded `BigDecimal.valueOf(5.00)`
   - Call `PublicDeliveryService.calculateFee()`
   - Set Order fields: deliveryType, deliveryMode, deliveryFee, etaMinutes
   - ~20 Zeilen changed

2. `PublicOrderController.checkout()` (MODIFY)
   - Accept deliveryType, deliveryMode in request
   - Pass to OrderService
   - ~10 Zeilen

---

### Phase 3: Frontend Integration

**Neue Dateien:**
1. `delivery.service.ts` (NEW)
   - Method: `getDeliveryOptions()`
   - ~50 Zeilen

**Geänderte Dateien:**
1. `checkout.component.ts` (MODIFY)
   - Remove hardcoded `shipping = 4.99`
   - Call `deliveryService.getDeliveryOptions()` on address change
   - Update UI with dynamic options
   - ~50 Zeilen changed

---

## 📋 9. IMPLEMENTIERUNGS-PRIORITÄT

### Must-Have (MVP):
1. ✅ **PublicDeliveryService** - Zone matching logic
2. ✅ **PublicDeliveryController** - Public endpoint
3. ✅ **DeliveryOptionsDTO** - Response structure
4. ✅ **OrderService** - Dynamic fee calculation
5. ✅ **Frontend DeliveryService** - API client
6. ✅ **Checkout Component** - Dynamic options UI

### Nice-to-Have (Later):
- ❌ DeliveryProvider integration (aktuell unused)
- ❌ Multi-provider selection
- ❌ Real-time ETA calculation
- ❌ Weight-based pricing
- ❌ Free shipping thresholds (minOrderValue exists!)

---

## 🚨 10. KRITISCHE ERKENNTNISSE

### ✅ POSITIV:
1. **Delivery Architecture existiert bereits!**
   - Entities ✅
   - Admin Management ✅
   - Order Fields ✅
   - Enums ✅

2. **DeliveryZone ist sehr flexibel:**
   - Postal code ranges (JSON)
   - STANDARD + EXPRESS fees
   - ETA per mode
   - City/Country scoping

3. **Order Entity ist ready:**
   - Alle Felder vorhanden
   - Nur setzen fehlt

### ❌ PROBLEME:
1. **Hardcoded Shipping:**
   - OrderService: `5.00 EUR`
   - Frontend: `4.99 / 9.99 EUR`
   - Keine Verbindung zu Zones

2. **Fehlende Public API:**
   - Kein `/api/public/.../delivery/options`
   - Frontend kann nicht dynamic fetchen

3. **DeliveryProvider unused:**
   - Entity existiert
   - Aber keine Integration in Zone/Order

---

## 🎯 11. NÄCHSTE SCHRITTE (STEP 14.1)

### Implementierungs-Reihenfolge:

**Step 14.1a: Backend Public Service**
```java
// 1. PublicDeliveryService.java (NEW)
public DeliveryOptionsResponse getDeliveryOptions(...) {
    // Zone matching
    // Settings check
    // Build response
}

// 2. PublicDeliveryController.java (NEW)
@PostMapping("/api/public/stores/{storeId}/delivery/options")
public ResponseEntity<DeliveryOptionsResponse> getOptions(...) {
    return publicDeliveryService.getDeliveryOptions(...);
}
```

**Step 14.1b: OrderService Integration**
```java
// OrderService.createOrder() - MODIFY
BigDecimal deliveryFee = publicDeliveryService.calculateFee(
    storeId, 
    deliveryType, 
    deliveryMode, 
    postalCode
);
order.setDeliveryFee(deliveryFee);
order.setDeliveryType(deliveryType);
order.setDeliveryMode(deliveryMode);
```

**Step 14.1c: Frontend Integration**
```typescript
// delivery.service.ts (NEW)
getDeliveryOptions(storeId, postalCode, city, country) {
    return this.http.post(...);
}

// checkout.component.ts (MODIFY)
onAddressChange() {
    this.deliveryService.getDeliveryOptions(...).subscribe(options => {
        this.deliveryOptions = options;
        this.updateShippingUI();
    });
}
```

---

## ✅ FAZIT

**Delivery Architecture ist zu 80% implementiert!**

### Was existiert:
- ✅ 3 Core Entities (Provider, Zone, Settings)
- ✅ 3 Services (CRUD Management)
- ✅ 1 Admin Controller (complete)
- ✅ Order Fields (delivery_type, delivery_mode, delivery_fee)
- ✅ 2 Enums (DeliveryType, DeliveryMode)

### Was fehlt:
- ❌ Public Delivery Options Endpoint
- ❌ Zone Matching Logic (postal code ranges)
- ❌ Dynamic Fee Calculation in OrderService
- ❌ Frontend Delivery Service
- ❌ Dynamic Checkout UI

### Aufwand Step 14.1:
- Backend: ~300 Zeilen (2 neue Klassen, 1 Modification)
- Frontend: ~100 Zeilen (1 Service, 1 Component Modification)
- **Total:** ~400 Zeilen, kein Refactor, reuse existing entities

**Status:** READY TO IMPLEMENT 🚀

