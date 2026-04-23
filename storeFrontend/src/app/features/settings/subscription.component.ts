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
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { UsageWidgetComponent } from '@app/shared/components/usage-widget.component';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UsageWidgetComponent],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  currentSubscription: Subscription | null = null;
  availablePlans: PlanDetails[] = [];
  selectedBillingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY';
  showUpgradeOptions = true;
  showPaymentModal = false;
  selectedPlan: PlanDetails | null = null;
  selectedPaymentMethod: PaymentMethod | null = null;
  paymentIntent: PaymentIntent | null = null;
  upgrading = false;
  loadingPlans = false;
  loadingSubscription = false;
  plansError: string | null = null;
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  constructor(
    private subscriptionService: SubscriptionService,
    private helperService: SubscriptionHelperService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Breadcrumbs initialisieren
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'Subscription', icon: '💳' }
    ];

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
          // Bei 404 (keine Subscription) ist das OK - Benutzer hat noch keinen Plan
          // Kein automatisches Aktivieren mehr!
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
        // Keine automatische Aktivierung mehr!
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
      console.log('🎁 FREE-Plan automatisch vorausgewählt (nur UI)');
      this.selectedPlan = freePlan;
      // NICHT automatisch aktivieren! Nur UI-Vorauswahl.
      // User muss explizit auf "Kostenlos starten" klicken.
    }
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
