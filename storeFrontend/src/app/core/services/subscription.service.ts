import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { 
  Subscription, 
  PlanDetails, 
  Plan, 
  UpgradeRequest, 
  PaymentIntent,
  SubscriptionStatus,
  PaymentMethod
} from '../models';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly API_URL = `${environment.apiUrl}/subscriptions`;

  // Plan-Definitionen mit Features und Preisen
  private readonly PLAN_DETAILS: PlanDetails[] = [
    {
      plan: Plan.FREE,
      name: 'Free',
      description: 'Perfekt für den Start',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: {
        maxStores: 1,
        maxProducts: 10,
        maxOrders: 50,
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
        maxStores: 3,
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

  constructor(private http: HttpClient) {}

  /**
   * Hole alle verfügbaren Pläne
   */
  getAvailablePlans(): Observable<PlanDetails[]> {
    if (environment.useMockData) {
      return of(this.PLAN_DETAILS).pipe(delay(300));
    }
    return this.http.get<PlanDetails[]>(`${this.API_URL}/plans`);
  }

  /**
   * Hole Details zu einem spezifischen Plan
   */
  getPlanDetails(plan: Plan): Observable<PlanDetails> {
    const planDetails = this.PLAN_DETAILS.find(p => p.plan === plan);
    if (environment.useMockData) {
      return of(planDetails!).pipe(delay(200));
    }
    return this.http.get<PlanDetails>(`${this.API_URL}/plans/${plan}`);
  }

  /**
   * Hole aktuelle Subscription des Benutzers
   */
  getCurrentSubscription(userId: number): Observable<Subscription | null> {
    if (environment.useMockData) {
      const mockSubscription: Subscription = {
        id: 1,
        userId: userId,
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date().toISOString(),
        amount: 0,
        billingCycle: 'MONTHLY',
        autoRenew: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return of(mockSubscription).pipe(delay(300));
    }
    return this.http.get<Subscription>(`${this.API_URL}/user/${userId}/current`);
  }

  /**
   * Subscription History des Benutzers
   */
  getSubscriptionHistory(userId: number): Observable<Subscription[]> {
    if (environment.useMockData) {
      return of([]).pipe(delay(300));
    }
    return this.http.get<Subscription[]>(`${this.API_URL}/user/${userId}/history`);
  }

  /**
   * Initiiere ein Plan-Upgrade
   */
  upgradePlan(request: UpgradeRequest): Observable<PaymentIntent> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Plan-Upgrade initiiert', request);
      
      const planDetails = this.PLAN_DETAILS.find(p => p.plan === request.targetPlan);
      const amount = request.billingCycle === 'YEARLY' 
        ? planDetails!.yearlyPrice 
        : planDetails!.monthlyPrice;

      const mockPaymentIntent: PaymentIntent = {
        id: 'pi_' + Date.now(),
        amount: amount,
        currency: 'EUR',
        status: 'pending',
        paymentMethod: request.paymentMethod,
        bankTransferDetails: request.paymentMethod === PaymentMethod.BANK_TRANSFER ? {
          accountHolder: 'markt.ma GmbH',
          iban: 'DE89 3704 0044 0532 0130 00',
          bic: 'COBADEFFXXX',
          reference: `SUB-${Date.now()}`,
          amount: amount,
          currency: 'EUR'
        } : undefined,
        createdAt: new Date().toISOString()
      };

      return of(mockPaymentIntent).pipe(delay(500));
    }
    return this.http.post<PaymentIntent>(`${this.API_URL}/upgrade`, request);
  }

  /**
   * Wähle initialen Plan (für neue Benutzer ohne Subscription)
   */
  subscribeToPlan(request: UpgradeRequest): Observable<PaymentIntent> {
    if (environment.useMockData) {
      console.log('🎭 Mock: Initiale Plan-Auswahl', request);

      const planDetails = this.PLAN_DETAILS.find(p => p.plan === request.targetPlan);
      const amount = request.billingCycle === 'YEARLY'
        ? planDetails!.yearlyPrice
        : planDetails!.monthlyPrice;

      const mockPaymentIntent: PaymentIntent = {
        id: 'pi_' + Date.now(),
        amount: amount,
        currency: 'EUR',
        status: amount === 0 ? 'completed' : 'pending',
        paymentMethod: request.paymentMethod,
        bankTransferDetails: request.paymentMethod === PaymentMethod.BANK_TRANSFER && amount > 0 ? {
          accountHolder: 'markt.ma GmbH',
          iban: 'DE89 3704 0044 0532 0130 00',
          bic: 'COBADEFFXXX',
          reference: `SUB-${Date.now()}`,
          amount: amount,
          currency: 'EUR'
        } : undefined,
        createdAt: new Date().toISOString()
      };

      return of(mockPaymentIntent).pipe(delay(500));
    }
    return this.http.post<PaymentIntent>(`${this.API_URL}/subscribe`, request);
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
      const mockSubscription: Subscription = {
        id: subscriptionId,
        userId: 1,
        plan: Plan.PRO,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date().toISOString(),
        amount: 29.99,
        billingCycle: 'MONTHLY',
        autoRenew: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
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
      const mockSubscription: Subscription = {
        id: subscriptionId,
        userId: 1,
        plan: Plan.PRO,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date().toISOString(),
        paymentMethod: paymentMethod,
        amount: 29.99,
        billingCycle: 'MONTHLY',
        autoRenew: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return of(mockSubscription).pipe(delay(500));
    }
    return this.http.put<Subscription>(`${this.API_URL}/${subscriptionId}/payment-method`, { paymentMethod });
  }

  /**
   * Prüfe ob ein Upgrade möglich ist
   */
  canUpgrade(currentPlan: Plan, targetPlan: Plan): boolean {
    const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlan);
    return targetIndex > currentIndex;
  }

  /**
   * Berechne Preisvorteil für jährliche Zahlung
   */
  getYearlySavings(plan: Plan): number {
    const planDetails = this.PLAN_DETAILS.find(p => p.plan === plan);
    if (!planDetails) return 0;
    
    const monthlyTotal = planDetails.monthlyPrice * 12;
    const yearlySavings = monthlyTotal - planDetails.yearlyPrice;
    return Math.round(yearlySavings * 100) / 100;
  }
}
