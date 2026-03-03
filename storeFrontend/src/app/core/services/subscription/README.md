# Subscription Services Architektur

Die Subscription-Funktionalität ist nach dem **Single Responsibility Principle** in **3 separate Services** aufgeteilt:

## 📦 Services Übersicht

### 1. **SubscriptionService** (`subscription.service.ts`)
**Verantwortlichkeit**: HTTP API-Kommunikation mit dem Backend

- ✅ Lädt verfügbare Pläne vom Backend
- ✅ Lädt aktuelle Subscription des Benutzers
- ✅ Führt Plan-Upgrades durch
- ✅ Verwaltet Subscription-Lifecycle (Cancel, Reactivate)
- ✅ Aktualisiert Zahlungsmethoden
- ✅ Unterstützt Mock-Modus für Entwicklung/Testing

**Wichtige Methoden**:
```typescript
getAvailablePlans(): Observable<PlanDetails[]>
getCurrentSubscription(userId: number): Observable<Subscription | null>
upgradePlan(request: UpgradeRequest): Observable<PaymentIntent>
subscribeToPlan(request: UpgradeRequest): Observable<PaymentIntent>
cancelSubscription(subscriptionId: number): Observable<void>
reactivateSubscription(subscriptionId: number): Observable<Subscription>
updatePaymentMethod(subscriptionId: number, method: PaymentMethod): Observable<Subscription>
```

---

### 2. **SubscriptionStateService** (`subscription-state.service.ts`)
**Verantwortlichkeit**: State Management & Caching

- ✅ Verwaltet Subscription-State mit RxJS BehaviorSubjects
- ✅ Cached verfügbare Pläne
- ✅ Cached aktuelle Subscription
- ✅ Verwaltet Loading-States
- ✅ Verwaltet Error-States
- ✅ Bietet Observables für reaktive UI-Updates

**Wichtige Properties**:
```typescript
currentSubscription$: Observable<Subscription | null>
availablePlans$: Observable<PlanDetails[]>
loadingSubscription$: Observable<boolean>
loadingPlans$: Observable<boolean>
subscriptionError$: Observable<string | null>
plansError$: Observable<string | null>
```

**Wichtige Methoden**:
```typescript
setCurrentSubscription(subscription: Subscription | null): void
getCurrentSubscription(): Subscription | null
setAvailablePlans(plans: PlanDetails[]): void
getPlanDetails(plan: Plan): PlanDetails | undefined
hasActiveSubscription(): boolean
hasPlan(plan: Plan): boolean
hasMinimumPlan(minimumPlan: Plan): boolean
reset(): void
```

---

### 3. **SubscriptionHelperService** (`subscription-helper.service.ts`)
**Verantwortlichkeit**: Berechnungen, Validierungen & Utilities

- ✅ Berechnet Preise und Ersparnisse
- ✅ Validiert Upgrade/Downgrade-Möglichkeiten
- ✅ Formatiert Werte für die Anzeige
- ✅ Liefert lokalisierte Labels
- ✅ Reine Funktionen ohne Side-Effects

**Wichtige Methoden**:
```typescript
// Upgrade/Downgrade
canUpgrade(currentPlan: Plan, targetPlan: Plan): boolean
canDowngrade(currentPlan: Plan, targetPlan: Plan): boolean
validateUpgradeRequest(currentPlan: Plan, targetPlan: Plan): { valid: boolean; error?: string }

// Preisberechnungen
calculatePrice(planDetails: PlanDetails, billingCycle: 'MONTHLY' | 'YEARLY'): number
calculatePriceDifference(currentPlan: PlanDetails, targetPlan: PlanDetails, billingCycle): number
getYearlySavings(planDetails: PlanDetails): number
getYearlySavingsPercentage(planDetails: PlanDetails): number

// Formatierung
getPlanName(plan: Plan): string
getStatusLabel(status: SubscriptionStatus): string
getPaymentMethodLabel(method: PaymentMethod): string
formatPrice(amount: number, currency?: string): string
formatDate(dateString: string): string
formatFeatureValue(value: number | boolean): string

// Utilities
getDaysUntilRenewal(renewalDate: string): number | null
isExpiringSoon(renewalDate: string): boolean
hasFeature(planDetails: PlanDetails, featureName: string): boolean
sortPlansByPriority(plans: PlanDetails[]): PlanDetails[]
```

---

## 🎯 Verwendung in Komponenten

### Basic Import
```typescript
import { SubscriptionService } from '@app/core/services/subscription.service';
import { SubscriptionStateService } from '@app/core/services/subscription-state.service';
import { SubscriptionHelperService } from '@app/core/services/subscription-helper.service';

// Oder Barrel Export
import { 
  SubscriptionService, 
  SubscriptionStateService, 
  SubscriptionHelperService 
} from '@app/core/services/subscription';
```

### Beispiel Komponente
```typescript
@Component({
  selector: 'app-subscription',
  // ...
})
export class SubscriptionComponent implements OnInit {
  constructor(
    private subscriptionService: SubscriptionService,
    private stateService: SubscriptionStateService,
    private helperService: SubscriptionHelperService
  ) {}

  ngOnInit(): void {
    // Laden via API Service
    this.subscriptionService.getAvailablePlans().subscribe();
    
    // State observieren
    this.stateService.currentSubscription$.subscribe(sub => {
      console.log('Subscription changed:', sub);
    });
    
    // Helper nutzen
    const savings = this.helperService.getYearlySavings(planDetails);
    const canUpgrade = this.helperService.canUpgrade(Plan.FREE, Plan.PRO);
  }
}
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Component                            │
│  (subscription.component.ts)                                │
└───┬──────────────────────┬──────────────────────┬──────────┘
    │                      │                      │
    │ API Calls            │ State Read/Write     │ Utilities
    │                      │                      │
    ▼                      ▼                      ▼
┌─────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ Subscription    │  │ SubscriptionState  │  │ SubscriptionHelper│
│ Service         │  │ Service            │  │ Service          │
│                 │  │                    │  │                  │
│ • HTTP Calls    │  │ • BehaviorSubjects │  │ • Berechnungen   │
│ • Backend API   │──▶│ • Cache            │  │ • Validierungen  │
│ • Mock Data     │  │ • Loading States   │  │ • Formatierung   │
└─────────────────┘  └────────────────────┘  └──────────────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│   Backend API   │
│  (Spring Boot)  │
└─────────────────┘
```

---

## ✅ Vorteile dieser Architektur

1. **Single Responsibility Principle**: Jeder Service hat eine klare Aufgabe
2. **Testbarkeit**: Services können einzeln getestet werden
3. **Wiederverwendbarkeit**: Helper-Service kann überall genutzt werden
4. **Wartbarkeit**: Änderungen sind isoliert und übersichtlich
5. **Performance**: State-Service vermeidet redundante API-Calls durch Caching
6. **Reactive**: State-Service bietet Observables für reaktive UIs

---

## 📝 Best Practices

### ✅ DO
- API-Calls nur über `SubscriptionService`
- State-Zugriff nur über `SubscriptionStateService`
- Berechnungen/Formatierungen über `SubscriptionHelperService`
- Services in Komponenten via Dependency Injection

### ❌ DON'T
- Direkte HTTP-Calls in Komponenten
- State direkt in Komponenten speichern
- Berechnungslogik in Komponenten duplizieren
- Services direkt instantiieren (`new SubscriptionService()`)

---

## 🧪 Testing

Jeder Service kann isoliert getestet werden:

```typescript
describe('SubscriptionHelperService', () => {
  let service: SubscriptionHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionHelperService);
  });

  it('should calculate yearly savings correctly', () => {
    const plan: PlanDetails = {
      plan: Plan.PRO,
      name: 'Pro',
      monthlyPrice: 29.99,
      yearlyPrice: 299.99,
      // ...
    };
    
    const savings = service.getYearlySavings(plan);
    expect(savings).toBe(59.89); // 29.99 * 12 - 299.99
  });
});
```

---

## 🔗 Related Files

- `src/app/core/models/subscription.model.ts` - Type Definitions
- `src/app/features/settings/subscription.component.ts` - Main UI Component
- `src/environments/environment.ts` - Configuration (useMockData)

---

**Erstellt**: 2026-03-03  
**Version**: 1.0.0  
**Autor**: Senior Full-Stack Engineer

