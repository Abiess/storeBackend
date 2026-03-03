# Subscription Plan Configuration

## ✅ SINGLE SOURCE OF TRUTH

Alle Subscription-Pläne, Limits, Features und Preise sind **zentral definiert** in:

```
src/main/java/storebackend/config/PlanConfig.java
```

## 📋 Plan-Übersicht

| Plan | maxStores | maxProducts | maxOrders | Monatspreis | Jahrespreis |
|------|-----------|-------------|-----------|-------------|-------------|
| **FREE** | 2 | 100 | 500 | 0,00 € | 0,00 € |
| **PRO** | 4 | 1000 | unbegrenzt | 29,99 € | 299,99 € |
| **ENTERPRISE** | unbegrenzt | unbegrenzt | unbegrenzt | 99,99 € | 999,99 € |

## 🔧 Features nach Plan

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Custom Domain | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Multi-Language | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |

## 🏗️ Architektur

```
PlanConfig.java (ZENTRAL)
    ↓
    ├── SubscriptionController.java
    │   └── GET /api/subscriptions/plans → getAllPlanDetails()
    │
    ├── SubscriptionService.java
    │   ├── getPlanLimits()
    │   ├── calculatePrice()
    │   ├── getYearlySavings()
    │   └── hasFeature()
    │
    └── Frontend (subscription.service.ts)
        └── MOCK_PLAN_DETAILS (nur für Development!)
```

## ⚠️ WICHTIG: Änderungen vornehmen

### Schritt 1: Plan-Limits ändern
Öffne `PlanConfig.java` und ändere die `planLimits` Map:

```java
private final Map<Plan, Map<String, Integer>> planLimits = Map.of(
    Plan.FREE, Map.of(
        "maxStores", 2,      // ← HIER ÄNDERN
        "maxProducts", 100,   // ← HIER ÄNDERN
        "maxOrders", 500      // ← HIER ÄNDERN
    ),
    // ...
);
```

### Schritt 2: Preise ändern
Ändere die `monthlyPrices` oder `yearlyPrices` Maps:

```java
private final Map<Plan, BigDecimal> monthlyPrices = Map.of(
    Plan.FREE, BigDecimal.ZERO,
    Plan.PRO, new BigDecimal("29.99"),  // ← HIER ÄNDERN
    // ...
);
```

### Schritt 3: Features ändern
Ändere die `planFeatures` Map:

```java
private final Map<Plan, Map<String, Boolean>> planFeatures = Map.of(
    Plan.FREE, Map.of(
        "customDomain", false,  // ← HIER ÄNDERN
        "analytics", false,      // ← HIER ÄNDERN
        // ...
    ),
    // ...
);
```

### Schritt 4: Frontend Mock synchronisieren (optional)
Wenn du Mock-Daten im Frontend nutzt, aktualisiere auch:

```typescript
// storeFrontend/src/app/core/services/subscription.service.ts
private readonly MOCK_PLAN_DETAILS: PlanDetails[] = [
  {
    plan: Plan.FREE,
    features: {
      maxStores: 2,  // ← MIT BACKEND SYNCHRON HALTEN
      // ...
    }
  },
  // ...
];
```

**⚠️ ABER:** Im Produktivbetrieb holt das Frontend die Pläne automatisch vom Backend via `/api/subscriptions/plans` Endpoint!

## 🧪 Testing

Nach Änderungen an `PlanConfig.java`:

1. **Backend kompilieren:**
   ```bash
   mvn clean compile
   ```

2. **Backend starten:**
   ```bash
   mvn spring-boot:run
   ```

3. **API testen:**
   ```bash
   curl http://localhost:8080/api/subscriptions/plans
   ```

4. **Frontend überprüfen:**
   - Öffne `http://localhost:4200/subscription/plans`
   - Pläne sollten automatisch vom Backend geladen werden

## 📝 Changelog

### 2026-03-03
- ✅ Zentrale `PlanConfig.java` erstellt
- ✅ `SubscriptionController.java` refactored (nutzt PlanConfig)
- ✅ `SubscriptionService.java` refactored (nutzt PlanConfig)
- ✅ Alle hardcoded Plan-Definitionen entfernt
- ✅ SINGLE SOURCE OF TRUTH etabliert

### Vorher (❌ BAD PRACTICE):
- Plan-Definitionen in 3 Dateien dupliziert
- Inkonsistenzen zwischen Controller und Service
- Schwer wartbar bei Änderungen

### Nachher (✅ BEST PRACTICE):
- **Eine zentrale Konfiguration**
- Alle Services nutzen `PlanConfig`
- Einfache Wartung und konsistente Daten

## 🔍 Weitere Informationen

- **Dependency Injection:** Spring injiziert automatisch `PlanConfig` in alle Services
- **Immutable:** Alle Maps sind `final` und immutable
- **Type-Safe:** Compile-Zeit-Fehler bei falschen Plan-Namen
- **Testbar:** Einfach zu mocken für Unit Tests

## 🚀 Nächste Schritte

Wenn du neue Pläne hinzufügen möchtest (z.B. "STARTUP"):

1. Füge in `Plan` Enum hinzu: `storebackend/enums/Plan.java`
2. Füge in `PlanConfig.java` alle Maps hinzu (limits, features, prices)
3. Füge in `getAllPlanDetails()` den neuen Plan hinzu
4. Done! ✅ Alle Endpoints und Services nutzen automatisch den neuen Plan

