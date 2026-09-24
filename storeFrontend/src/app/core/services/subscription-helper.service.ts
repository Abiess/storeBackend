import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Plan,
  PlanDetails,
  SubscriptionStatus,
  PaymentMethod
} from '../models';
import { environment } from '@env/environment';

/**
 * Service für Subscription Helper-Funktionen
 * Nutzt Backend-APIs für alle Berechnungen und Validierungen
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionHelperService {
  private readonly API_URL = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  /**
   * Prüfe ob ein Upgrade von currentPlan zu targetPlan möglich ist (via Backend)
   */
  canUpgrade(currentPlan: Plan, targetPlan: Plan): Observable<{ valid: boolean; error?: string }> {
    if (environment.useMockData) {
      // Mock: Lokale Validierung
      const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
      const currentIndex = planOrder.indexOf(currentPlan);
      const targetIndex = planOrder.indexOf(targetPlan);
      const valid = targetIndex > currentIndex;

      return of({
        valid,
        error: valid ? undefined : 'Downgrade ist derzeit nicht möglich'
      });
    }

    return this.http.post<{ valid: boolean; error?: string }>(
      `${this.API_URL}/validate-upgrade`,
      { currentPlan, targetPlan }
    );
  }

  /**
   * Prüfe ob ein Downgrade von currentPlan zu targetPlan möglich ist
   */
  canDowngrade(currentPlan: Plan, targetPlan: Plan): boolean {
    const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlan);
    return targetIndex < currentIndex;
  }

  /**
   * Berechne Preisvorteil für jährliche Zahlung (via Backend)
   */
  getYearlySavings(plan: Plan): Observable<number> {
    if (environment.useMockData) {
      // Mock: Lokale Berechnung für Tests
      const mockPrices = {
        [Plan.FREE]: { monthly: 0, yearly: 0 },
        [Plan.PRO]: { monthly: 29.99, yearly: 299.99 },
        [Plan.ENTERPRISE]: { monthly: 99.99, yearly: 999.99 }
      };
      const prices = mockPrices[plan];
      const savings = (prices.monthly * 12) - prices.yearly;
      return of(Math.round(savings * 100) / 100);
    }

    return this.http.get<{ yearlySavings: number }>(
      `${this.API_URL}/calculate-price`,
      { params: { plan, billingCycle: 'YEARLY' } }
    ).pipe(
      map(response => response.yearlySavings)
    );
  }

  /**
   * Berechne Ersparnis in Prozent (via Backend)
   */
  getYearlySavingsPercentage(plan: Plan): Observable<number> {
    return this.calculatePrice(plan, 'MONTHLY').pipe(
      map(monthlyPrice => {
        if (monthlyPrice === 0) return 0;
        const monthlyTotal = monthlyPrice * 12;

        // Hole Jahrespreis
        return this.calculatePrice(plan, 'YEARLY').pipe(
          map(yearlyPrice => {
            const savings = monthlyTotal - yearlyPrice;
            const percentage = (savings / monthlyTotal) * 100;
            return Math.round(percentage);
          })
        );
      }),
      // Flatten nested Observable
      map(obs => obs)
    ) as any;
  }

  /**
   * Berechne Preis basierend auf Billing Cycle (via Backend)
   */
  calculatePrice(plan: Plan, billingCycle: 'MONTHLY' | 'YEARLY'): Observable<number> {
    if (environment.useMockData) {
      // Mock: Lokale Preise
      const mockPrices = {
        [Plan.FREE]: { MONTHLY: 0, YEARLY: 0 },
        [Plan.PRO]: { MONTHLY: 29.99, YEARLY: 299.99 },
        [Plan.ENTERPRISE]: { MONTHLY: 99.99, YEARLY: 999.99 }
      };
      return of(mockPrices[plan][billingCycle]);
    }

    return this.http.get<{ price: number }>(
      `${this.API_URL}/calculate-price`,
      { params: { plan, billingCycle } }
    ).pipe(
      map(response => response.price)
    );
  }

  /**
   * Berechne Preis-Differenz zwischen zwei Plänen (nutzt calculatePrice)
   */
  calculatePriceDifference(
    currentPlan: Plan,
    targetPlan: Plan,
    billingCycle: 'MONTHLY' | 'YEARLY'
  ): Observable<number> {
    return this.calculatePrice(currentPlan, billingCycle).pipe(
      map(currentPrice =>
        this.calculatePrice(targetPlan, billingCycle).pipe(
          map(targetPrice => targetPrice - currentPrice)
        )
      )
    ) as any;
  }

  /**
   * Hole lokalisierten Plan-Namen
   */
  getPlanName(plan: Plan): string {
    const names: Record<Plan, string> = {
      [Plan.FREE]: 'Free',
      [Plan.PRO]: 'Pro',
      [Plan.ENTERPRISE]: 'Enterprise'
    };
    return names[plan] || plan;
  }

  /**
   * Hole lokalisierten Status-Label
   */
  getStatusLabel(status: SubscriptionStatus): string {
    const labels: Record<SubscriptionStatus, string> = {
      [SubscriptionStatus.ACTIVE]: 'Aktiv',
      [SubscriptionStatus.CANCELLED]: 'Gekündigt',
      [SubscriptionStatus.EXPIRED]: 'Abgelaufen',
      [SubscriptionStatus.PENDING]: 'Ausstehend',
      [SubscriptionStatus.TRIAL]: 'Testphase'
    };
    return labels[status] || status;
  }

  /**
   * Hole lokalisierten Zahlungsmethoden-Label
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.BANK_TRANSFER]: 'Banküberweisung',
      [PaymentMethod.CREDIT_CARD]: 'Kreditkarte',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.STRIPE]: 'Stripe'
    };
    return labels[method] || method;
  }

  /**
   * Hole CSS-Klasse für Plan-Badge
   */
  getPlanBadgeClass(plan: Plan): string {
    const classes: Record<Plan, string> = {
      [Plan.FREE]: 'plan-free',
      [Plan.PRO]: 'plan-pro',
      [Plan.ENTERPRISE]: 'plan-enterprise'
    };
    return classes[plan] || '';
  }

  /**
   * Hole CSS-Klasse für Status-Badge
   */
  getStatusBadgeClass(status: SubscriptionStatus): string {
    const classes: Record<SubscriptionStatus, string> = {
      [SubscriptionStatus.ACTIVE]: 'status-active',
      [SubscriptionStatus.CANCELLED]: 'status-cancelled',
      [SubscriptionStatus.EXPIRED]: 'status-expired',
      [SubscriptionStatus.PENDING]: 'status-pending',
      [SubscriptionStatus.TRIAL]: 'status-trial'
    };
    return classes[status] || '';
  }

  /**
   * Prüfe ob ein Feature in einem Plan verfügbar ist
   */
  hasFeature(planDetails: PlanDetails, featureName: keyof PlanDetails['features']): boolean {
    return planDetails.features[featureName] === true ||
           planDetails.features[featureName] === -1; // -1 = unbegrenzt
  }

  /**
   * Formatiere Feature-Wert für Anzeige
   */
  formatFeatureValue(value: number | boolean): string {
    if (value === true) return '✓';
    if (value === false) return '✗';
    if (value === -1) return '∞';
    return value.toString();
  }

  /**
   * Prüfe ob ein Plan "populär" markiert werden sollte (PRO ist Standard)
   */
  isPopularPlan(plan: Plan): boolean {
    return plan === Plan.PRO;
  }

  /**
   * Berechne verbleibende Tage bis zur Verlängerung
   */
  getDaysUntilRenewal(renewalDate: string | undefined): number | null {
    if (!renewalDate) return null;

    const renewal = new Date(renewalDate);
    const now = new Date();
    const diffTime = renewal.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Prüfe ob Subscription bald abläuft (weniger als 7 Tage)
   */
  isExpiringsoon(renewalDate: string | undefined): boolean {
    const daysUntilRenewal = this.getDaysUntilRenewal(renewalDate);
    return daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal > 0;
  }

  /**
   * Validiere ob Upgrade-Request gültig ist
   */
  validateUpgradeRequest(currentPlan: Plan | undefined, targetPlan: Plan): {
    valid: boolean;
    error?: string;
  } {
    if (!currentPlan) {
      return { valid: true }; // Neue Subscription, alles erlaubt
    }

    if (currentPlan === targetPlan) {
      return { valid: false, error: 'Sie haben bereits diesen Plan' };
    }

    if (!this.canUpgrade(currentPlan, targetPlan)) {
      return { valid: false, error: 'Downgrade ist derzeit nicht möglich' };
    }

    return { valid: true };
  }

  /**
   * Sortiere Pläne nach Priorität (FREE -> PRO -> ENTERPRISE)
   */
  sortPlansByPriority(plans: PlanDetails[]): PlanDetails[] {
    const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
    return [...plans].sort((a, b) => {
      return planOrder.indexOf(a.plan) - planOrder.indexOf(b.plan);
    });
  }

  /**
   * Formatiere Preis für Anzeige
   */
  formatPrice(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Formatiere Datum für Anzeige
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}

