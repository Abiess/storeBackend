import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap, catchError, map } from 'rxjs/operators';
import {
  Subscription, 
  PlanDetails, 
  Plan, 
  UpgradeRequest, 
  PaymentIntent,
  PaymentMethod
} from '../models';
import { environment } from '@env/environment';
import { SubscriptionStateService } from './subscription-state.service';
import { SubscriptionHelperService } from './subscription-helper.service';
import { toDate } from '../utils/date.utils';

/**
 * Service für Subscription API-Calls
 * Kommuniziert mit dem Backend und aktualisiert State
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly API_URL = `${environment.apiUrl}/subscriptions`;

  // Plan-Definitionen für Mock-Modus (nur Development!)
  // PRODUKTIV werden Pläne vom Backend geholt (PlanConfig.java)
  // Diese Werte müssen mit Backend synchron bleiben!
  private readonly MOCK_PLAN_DETAILS: PlanDetails[] = [
    {
      plan: Plan.FREE,
      name: 'Free',
      description: 'Perfekt für den Start',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: {
        maxStores: 2,
        maxProducts: 100,
        maxOrders: 500,
        customDomain: false,
        analytics: false,
        priority_support: false,
        api_access: false,
        multiLanguage: false,
        customBranding: false
      }
    },
    {
      plan: Plan.PRO,
      name: 'Pro',
      description: 'Für wachsende Unternehmen',
      monthlyPrice: 29.99,
      yearlyPrice: 299.99,
      popular: true,
      features: {
        maxStores: 4,
        maxProducts: 1000,
        maxOrders: -1, // unbegrenzt
        customDomain: true,
        analytics: true,
        priority_support: true,
        api_access: true,
        multiLanguage: true,
        customBranding: false
      }
    },
    {
      plan: Plan.ENTERPRISE,
      name: 'Enterprise',
      description: 'Für große Unternehmen',
      monthlyPrice: 99.99,
      yearlyPrice: 999.99,
      features: {
        maxStores: -1, // unbegrenzt
        maxProducts: -1,
        maxOrders: -1,
        customDomain: true,
        analytics: true,
        priority_support: true,
        api_access: true,
        multiLanguage: true,
        customBranding: true
      }
    }
  ];

  constructor(
    private http: HttpClient,
    private stateService: SubscriptionStateService,
    private helperService: SubscriptionHelperService
  ) {}

  /**
   * Hole alle verfügbaren Pläne und speichere in State
   */
  getAvailablePlans(): Observable<PlanDetails[]> {
    this.stateService.setLoadingPlans(true);
    this.stateService.setPlansError(null);

    const request$ = environment.useMockData
      ? of(this.MOCK_PLAN_DETAILS).pipe(delay(300))
      : this.http.get<PlanDetails[]>(`${this.API_URL}/plans`);

    return request$.pipe(
      tap(plans => {
        this.stateService.setAvailablePlans(plans);
        this.stateService.setLoadingPlans(false);
      }),
      catchError(error => {
        console.error('Fehler beim Laden der Pläne:', error);
        this.stateService.setPlansError('Pläne konnten nicht geladen werden');
        this.stateService.setLoadingPlans(false);
        throw error;
      })
    );
  }

  /**
   * Hole Details zu einem spezifischen Plan
   */
  getPlanDetails(plan: Plan): Observable<PlanDetails> {
    // Versuche zuerst aus State zu lesen
    const cachedPlan = this.stateService.getPlanDetails(plan);
    if (cachedPlan) {
      return of(cachedPlan);
    }

    // Fallback: Aus Mock-Daten oder API
    if (environment.useMockData) {
      const planDetails = this.MOCK_PLAN_DETAILS.find(p => p.plan === plan);
      return of(planDetails!).pipe(delay(200));
    }

    return this.http.get<PlanDetails>(`${this.API_URL}/plans/${plan}`);
  }

  /**
   * Hole aktuelle Subscription des Benutzers und speichere in State
   */
  getCurrentSubscription(userId: number): Observable<Subscription | null> {
    this.stateService.setLoadingSubscription(true);
    this.stateService.setSubscriptionError(null);

    const request$ = environment.useMockData
      ? of(this.createMockSubscription(userId)).pipe(delay(300))
      : this.http.get<Subscription>(`${this.API_URL}/user/${userId}/current`).pipe(
          map(sub => {
            // ✅ Konvertiere LocalDateTime-Arrays zu JS Dates
            if (sub) {
              sub.startDate = toDate(sub.startDate) as any;
              sub.endDate = toDate(sub.endDate) as any;
              sub.renewalDate = toDate(sub.renewalDate) as any;
              sub.createdAt = toDate(sub.createdAt) as any;
              sub.updatedAt = toDate(sub.updatedAt) as any;
            }
            return sub;
          })
        );

    return request$.pipe(
      tap(subscription => {
        this.stateService.setCurrentSubscription(subscription);
        this.stateService.setLoadingSubscription(false);
      }),
      catchError(error => {
        console.error('Fehler beim Laden der Subscription:', error);
        this.stateService.setSubscriptionError('Subscription konnte nicht geladen werden');
        this.stateService.setLoadingSubscription(false);
        // Bei 404 (keine Subscription) keinen Fehler werfen
        if (error.status === 404) {
          this.stateService.setCurrentSubscription(null);
          return of(null);
        }
        throw error;
      })
    );
  }

  /**
   * Hilfsmethode: Erstelle Mock-Subscription für Tests
   */
  private createMockSubscription(userId: number): Subscription {
    return {
      id: 1,
      userId: userId,
      plan: Plan.FREE,
      status: 'ACTIVE' as any,
      startDate: new Date().toISOString(),
      amount: 0,
      billingCycle: 'MONTHLY',
      autoRenew: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Subscription History des Benutzers
   */
  getSubscriptionHistory(userId: number): Observable<Subscription[]> {
    if (environment.useMockData) {
      return of([]).pipe(delay(300));
    }
    return this.http.get<Subscription[]>(`${this.API_URL}/user/${userId}/history`).pipe(
      map(subs => subs.map(sub => {
        // ✅ Konvertiere LocalDateTime-Arrays zu JS Dates
        sub.startDate = toDate(sub.startDate) as any;
        sub.endDate = toDate(sub.endDate) as any;
        sub.renewalDate = toDate(sub.renewalDate) as any;
        sub.createdAt = toDate(sub.createdAt) as any;
        sub.updatedAt = toDate(sub.updatedAt) as any;
        return sub;
      }))
    );
  }

  /**
   * Initiiere ein Plan-Upgrade
   */
  upgradePlan(request: UpgradeRequest): Observable<PaymentIntent> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Plan-Upgrade initiiert', request);
      return of(this.createMockPaymentIntent(request)).pipe(delay(500));
    }
    return this.http.post<PaymentIntent>(`${this.API_URL}/upgrade`, request);
  }

  /**
   * Wähle initialen Plan (für neue Benutzer ohne Subscription)
   */
  subscribeToPlan(request: UpgradeRequest): Observable<PaymentIntent> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Initiale Plan-Auswahl', request);
      return of(this.createMockPaymentIntent(request)).pipe(delay(500));
    }
    return this.http.post<PaymentIntent>(`${this.API_URL}/upgrade`, request);
  }

  /**
   * Hilfsmethode: Erstelle Mock PaymentIntent (synchron für Mock-Modus)
   */
  private createMockPaymentIntent(request: UpgradeRequest): PaymentIntent {
    const planDetails = this.MOCK_PLAN_DETAILS.find(p => p.plan === request.targetPlan);
    if (!planDetails) {
      throw new Error(`Plan not found: ${request.targetPlan}`);
    }

    // ✅ Synchrone Preisberechnung für Mock-Modus
    const priceMap: Record<Plan, { monthly: number; yearly: number }> = {
      [Plan.FREE]: { monthly: 0, yearly: 0 },
      [Plan.PRO]: { monthly: 29.99, yearly: 299.99 },
      [Plan.ENTERPRISE]: { monthly: 99.99, yearly: 999.99 }
    };

    const priceAmount: number = request.billingCycle === 'YEARLY'
      ? priceMap[request.targetPlan].yearly
      : priceMap[request.targetPlan].monthly;

    return {
      id: `pi_mock_${Date.now()}`,
      amount: priceAmount,
      currency: 'EUR',
      status: priceAmount === 0 ? 'completed' : 'pending',
      paymentMethod: request.paymentMethod,
      bankTransferDetails: request.paymentMethod === PaymentMethod.BANK_TRANSFER && priceAmount > 0 ? {
        accountHolder: 'markt.ma GmbH',
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        reference: `SUB-${Date.now()}`,
        amount: priceAmount,
        currency: 'EUR'
      } : undefined,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Kündige Subscription
   */
  cancelSubscription(subscriptionId: number): Observable<void> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Subscription gekündigt', subscriptionId);
      return of(void 0).pipe(delay(500));
    }
    return this.http.post<void>(`${this.API_URL}/${subscriptionId}/cancel`, {});
  }

  /**
   * Reaktiviere Subscription
   */
  reactivateSubscription(subscriptionId: number): Observable<Subscription> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Subscription reaktiviert', subscriptionId);
      const mockSubscription = this.createMockSubscription(1);
      mockSubscription.id = subscriptionId;
      mockSubscription.plan = Plan.PRO;
      mockSubscription.amount = 29.99;
      return of(mockSubscription).pipe(delay(500));
    }
    return this.http.post<Subscription>(`${this.API_URL}/${subscriptionId}/reactivate`, {});
  }

  /**
   * Aktualisiere Zahlungsmethode
   */
  updatePaymentMethod(subscriptionId: number, paymentMethod: PaymentMethod): Observable<Subscription> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Zahlungsmethode aktualisiert', paymentMethod);
      const mockSubscription = this.createMockSubscription(1);
      mockSubscription.id = subscriptionId;
      mockSubscription.plan = Plan.PRO;
      mockSubscription.amount = 29.99;
      mockSubscription.paymentMethod = paymentMethod;
      mockSubscription.autoRenew = true;
      return of(mockSubscription).pipe(delay(500));
    }
    return this.http.put<Subscription>(`${this.API_URL}/${subscriptionId}/payment-method`, { paymentMethod });
  }

  /**
   * Prüfe ob ein Upgrade möglich ist (delegiert an Helper Service, gibt sync result zurück)
   */
  canUpgrade(currentPlan: Plan, targetPlan: Plan): boolean {
    // Für synchrone Aufrufe in Komponenten - nutzt lokale Logik
    const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlan);
    return targetIndex > currentIndex;
  }

  /**
   * Prüfe ob ein Upgrade möglich ist (async via Backend)
   */
  canUpgradeAsync(currentPlan: Plan, targetPlan: Plan): Observable<boolean> {
    return this.helperService.canUpgrade(currentPlan, targetPlan).pipe(
      map(result => result.valid)
    );
  }

  /**
   * Berechne Preisvorteil für jährliche Zahlung (delegiert an Helper Service)
   * Gibt direkt den Wert zurück für synchrone Verwendung
   */
  getYearlySavings(plan: Plan): number {
    // Für synchrone Verwendung - nutzt cached Werte aus State
    const planDetails = this.stateService.getPlanDetails(plan);
    if (!planDetails) return 0;

    const monthlyTotal = planDetails.monthlyPrice * 12;
    const savings = monthlyTotal - planDetails.yearlyPrice;
    return Math.round(savings * 100) / 100;
  }

  /**
   * Berechne Preisvorteil für jährliche Zahlung (async via Backend)
   */
  getYearlySavingsAsync(plan: Plan): Observable<number> {
    return this.helperService.getYearlySavings(plan);
  }
}
