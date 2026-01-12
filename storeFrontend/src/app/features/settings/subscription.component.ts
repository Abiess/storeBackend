import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '@app/core/services/subscription.service';
import { AuthService } from '@app/core/services/auth.service';
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
          this.currentSubscription = subscription;
          this.loadingSubscription = false;
        },
        error: (error) => {
          console.error('Fehler beim Laden der Subscription:', error);
          this.loadingSubscription = false;
          // Kein Fehler anzeigen - Benutzer hat möglicherweise noch keine Subscription
        }
      });
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
      },
      error: (error) => {
        console.error('Fehler beim Laden der Pläne:', error);
        this.plansError = 'Die Pläne konnten nicht geladen werden. Bitte versuchen Sie es später erneut.';
        this.loadingPlans = false;
      }
    });
  }

  toggleBillingCycle(): void {
    this.selectedBillingCycle = this.selectedBillingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY';
  }

  getPlanName(plan: Plan): string {
    const planDetails = this.availablePlans.find(p => p.plan === plan);
    return planDetails?.name || plan;
  }

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

  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.BANK_TRANSFER]: 'Banküberweisung',
      [PaymentMethod.CREDIT_CARD]: 'Kreditkarte',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.STRIPE]: 'Stripe'
    };
    return labels[method] || method;
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
      alert('❌ Benutzer nicht gefunden. Bitte melden Sie sich erneut an.');
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
          alert('✅ Plan erfolgreich aktiviert!');
          this.closePaymentModal();
          this.loadCurrentSubscription();
        } else if (paymentIntent.paymentMethod === PaymentMethod.BANK_TRANSFER) {
          alert('✅ Anfrage erfolgreich! Bitte überweisen Sie den Betrag mit dem angegebenen Verwendungszweck.');
        } else {
          alert('✅ Erfolgreich! Ihr Plan wurde aktualisiert.');
          this.closePaymentModal();
          this.loadCurrentSubscription();
        }
      },
      error: (error) => {
        console.error('Fehler beim Verarbeiten:', error);
        alert('❌ Fehler beim Verarbeiten. Bitte versuchen Sie es später erneut.');
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
