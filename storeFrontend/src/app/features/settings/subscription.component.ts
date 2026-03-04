import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '@app/core/services/subscription.service';
import { SubscriptionHelperService } from '@app/core/services/subscription-helper.service';
import { AuthService } from '@app/core/services/auth.service';
import { toDate } from '@app/core/utils/date.utils';
import {
  Plan,
  PlanDetails,
  Subscription,
  SubscriptionStatus,
  PaymentMethod,
  UpgradeRequest,
  PaymentIntent
} from '@app/core/models';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  currentSubscription: Subscription | null = null;
  availablePlans: PlanDetails[] = [];
  selectedBillingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY';
  showUpgradeOptions = true; // Geändert: Zeige Pläne immer an
  showPaymentModal = false;
  selectedPlan: PlanDetails | null = null;
  selectedPaymentMethod: PaymentMethod | null = null;
  paymentIntent: PaymentIntent | null = null;
  upgrading = false;
  loadingPlans = false;
  loadingSubscription = false;
  plansError: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private helperService: SubscriptionHelperService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentSubscription();
    this.loadAvailablePlans();
  }

  loadCurrentSubscription(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.loadingSubscription = true;
      this.subscriptionService.getCurrentSubscription(user.id).subscribe({
        next: (subscription) => {
          // ✅ Sicherheitskonvertierung (falls Service es nicht gemacht hat)
          if (subscription) {
            subscription.startDate = toDate(subscription.startDate) as any;
            subscription.endDate = toDate(subscription.endDate) as any;
            subscription.renewalDate = toDate(subscription.renewalDate) as any;
            subscription.createdAt = toDate(subscription.createdAt) as any;
            subscription.updatedAt = toDate(subscription.updatedAt) as any;
          }
          this.currentSubscription = subscription;
          this.loadingSubscription = false;
          console.log('✅ Subscription geladen:', subscription);
        },
        error: (error) => {
          console.error('Fehler beim Laden der Subscription:', error);
          this.loadingSubscription = false;
          // Kein Fehler anzeigen - Benutzer hat möglicherweise noch keine Subscription
          // Automatisch FREE-Plan vorauswählen
          this.autoSelectFreePlan();
        }
      });
    } else {
      // Auch wenn kein User eingeloggt ist, FREE-Plan vorauswählen
      this.autoSelectFreePlan();
    }
  }

  loadAvailablePlans(): void {
    this.loadingPlans = true;
    this.plansError = null;
    this.subscriptionService.getAvailablePlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans;
        this.loadingPlans = false;
        console.log('Verfügbare Pläne geladen:', plans);
        // Wenn keine Subscription vorhanden, FREE-Plan vorauswählen
        if (!this.currentSubscription && !this.selectedPlan) {
          this.autoSelectFreePlan();
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden der Pläne:', error);
        this.plansError = 'Die Pläne konnten nicht geladen werden. Bitte versuchen Sie es später erneut.';
        this.loadingPlans = false;
      }
    });
  }

  private autoSelectFreePlan(): void {
    // Finde den FREE-Plan in den verfügbaren Plänen
    const freePlan = this.availablePlans.find(p => p.plan === Plan.FREE);
    if (freePlan && !this.currentSubscription) {
      console.log('🎁 FREE-Plan automatisch vorausgewählt');
      this.selectedPlan = freePlan;
      // Automatisch aktivieren ohne Modal für FREE-Plan
      this.autoActivateFreePlan();
    }
  }

  private autoActivateFreePlan(): void {
    const user = this.authService.getCurrentUser();
    if (!user || this.currentSubscription) {
      return; // Nur aktivieren wenn User eingeloggt und keine Subscription vorhanden
    }

    const freePlan = this.availablePlans.find(p => p.plan === Plan.FREE);
    if (!freePlan) {
      return;
    }

    console.log('🎁 FREE-Plan wird automatisch aktiviert...');

    const request: UpgradeRequest = {
      userId: user.id,
      targetPlan: Plan.FREE,
      billingCycle: 'MONTHLY',
      paymentMethod: PaymentMethod.BANK_TRANSFER // Dummy, wird nicht gebraucht für FREE
    };

    this.subscriptionService.subscribeToPlan(request).subscribe({
      next: (paymentIntent) => {
        console.log('✅ FREE-Plan erfolgreich aktiviert');
        this.loadCurrentSubscription();
      },
      error: (error) => {
        console.error('Fehler beim Aktivieren des FREE-Plans:', error);
        // Fehler nicht anzeigen, Benutzer kann manuell wählen
      }
    });
  }

  toggleBillingCycle(): void {
    this.selectedBillingCycle = this.selectedBillingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY';
  }

  getPlanName(plan: Plan): string {
    return this.helperService.getPlanName(plan);
  }

  getStatusLabel(status: SubscriptionStatus): string {
    return this.helperService.getStatusLabel(status);
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    return this.helperService.getPaymentMethodLabel(method);
  }

  canUpgradeToThisPlan(targetPlan: Plan): boolean {
    if (!this.currentSubscription) return false;
    return this.subscriptionService.canUpgrade(this.currentSubscription.plan, targetPlan);
  }

  getYearlySavings(plan: Plan): number {
    return this.subscriptionService.getYearlySavings(plan);
  }

  selectPlanForUpgrade(plan: PlanDetails): void {
    this.selectedPlan = plan;
    this.showPaymentModal = true;
  }

  calculateUpgradePrice(): number {
    if (!this.selectedPlan) return 0;
    return this.selectedBillingCycle === 'YEARLY'
      ? this.selectedPlan.yearlyPrice
      : this.selectedPlan.monthlyPrice;
  }

  confirmUpgrade(): void {
    if (!this.selectedPlan || !this.selectedPaymentMethod) return;

    this.upgrading = true;

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.upgrading = false;
      return;
    }

    const request: UpgradeRequest = {
      userId: user.id,
      targetPlan: this.selectedPlan.plan,
      billingCycle: this.selectedBillingCycle,
      paymentMethod: this.selectedPaymentMethod
    };

    // Unterscheide zwischen Upgrade (bestehende Subscription) und initialer Auswahl
    const action$ = this.currentSubscription
      ? this.subscriptionService.upgradePlan(request)
      : this.subscriptionService.subscribeToPlan(request);

    action$.subscribe({
      next: (paymentIntent) => {
        this.paymentIntent = paymentIntent;
        this.upgrading = false;

        if (paymentIntent.amount === 0) {
          // FREE Plan - keine Zahlung erforderlich
          this.closePaymentModal();
          this.loadCurrentSubscription();
        } else if (paymentIntent.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        } else {
          this.closePaymentModal();
          this.loadCurrentSubscription();
        }
      },
      error: (error) => {
        console.error('Fehler beim Verarbeiten:', error);
        this.upgrading = false;
      }
    });
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPlan = null;
    this.selectedPaymentMethod = null;
    this.paymentIntent = null;
  }

  canSelectPlan(plan: Plan): boolean {
    // Wenn keine Subscription vorhanden, kann jeder Plan gewählt werden
    if (!this.currentSubscription) {
      return true;
    }
    // Bei bestehender Subscription: Upgrade-Logik
    return this.canUpgradeToThisPlan(plan);
  }

  getButtonLabel(plan: Plan): string {
    if (this.currentSubscription?.plan === plan) {
      return 'Aktueller Plan';
    }
    if (!this.currentSubscription) {
      return plan === Plan.FREE ? 'Kostenlos starten' : 'Plan wählen';
    }
    return 'Jetzt upgraden';
  }
}
