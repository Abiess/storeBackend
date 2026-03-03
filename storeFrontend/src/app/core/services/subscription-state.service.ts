import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Subscription,
  PlanDetails,
  Plan
} from '../models';

/**
 * Service für Subscription State Management
 * Verwaltet den aktuellen Zustand der Subscription im Frontend
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionStateService {
  // State für aktuelle Subscription
  private currentSubscriptionSubject = new BehaviorSubject<Subscription | null>(null);
  public currentSubscription$ = this.currentSubscriptionSubject.asObservable();

  // State für verfügbare Pläne
  private availablePlansSubject = new BehaviorSubject<PlanDetails[]>([]);
  public availablePlans$ = this.availablePlansSubject.asObservable();

  // Loading States
  private loadingSubscriptionSubject = new BehaviorSubject<boolean>(false);
  public loadingSubscription$ = this.loadingSubscriptionSubject.asObservable();

  private loadingPlansSubject = new BehaviorSubject<boolean>(false);
  public loadingPlans$ = this.loadingPlansSubject.asObservable();

  // Error States
  private subscriptionErrorSubject = new BehaviorSubject<string | null>(null);
  public subscriptionError$ = this.subscriptionErrorSubject.asObservable();

  private plansErrorSubject = new BehaviorSubject<string | null>(null);
  public plansError$ = this.plansErrorSubject.asObservable();

  constructor() {}

  /**
   * Setze aktuelle Subscription
   */
  setCurrentSubscription(subscription: Subscription | null): void {
    this.currentSubscriptionSubject.next(subscription);
  }

  /**
   * Hole aktuelle Subscription aus State
   */
  getCurrentSubscription(): Subscription | null {
    return this.currentSubscriptionSubject.value;
  }

  /**
   * Setze verfügbare Pläne
   */
  setAvailablePlans(plans: PlanDetails[]): void {
    this.availablePlansSubject.next(plans);
  }

  /**
   * Hole verfügbare Pläne aus State
   */
  getAvailablePlans(): PlanDetails[] {
    return this.availablePlansSubject.value;
  }

  /**
   * Finde Plan-Details nach Plan-Typ
   */
  getPlanDetails(plan: Plan): PlanDetails | undefined {
    return this.availablePlansSubject.value.find(p => p.plan === plan);
  }

  /**
   * Setze Loading-State für Subscription
   */
  setLoadingSubscription(loading: boolean): void {
    this.loadingSubscriptionSubject.next(loading);
  }

  /**
   * Setze Loading-State für Pläne
   */
  setLoadingPlans(loading: boolean): void {
    this.loadingPlansSubject.next(loading);
  }

  /**
   * Setze Fehler für Subscription
   */
  setSubscriptionError(error: string | null): void {
    this.subscriptionErrorSubject.next(error);
  }

  /**
   * Setze Fehler für Pläne
   */
  setPlansError(error: string | null): void {
    this.plansErrorSubject.next(error);
  }

  /**
   * Prüfe ob Benutzer eine aktive Subscription hat
   */
  hasActiveSubscription(): boolean {
    const subscription = this.getCurrentSubscription();
    return subscription !== null && subscription.status === 'ACTIVE';
  }

  /**
   * Prüfe ob Benutzer einen spezifischen Plan hat
   */
  hasPlan(plan: Plan): boolean {
    const subscription = this.getCurrentSubscription();
    return subscription !== null && subscription.plan === plan;
  }

  /**
   * Prüfe ob Benutzer mindestens einen bestimmten Plan hat
   */
  hasMinimumPlan(minimumPlan: Plan): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    const planOrder = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];
    const currentIndex = planOrder.indexOf(subscription.plan);
    const minimumIndex = planOrder.indexOf(minimumPlan);

    return currentIndex >= minimumIndex;
  }

  /**
   * Reset aller States
   */
  reset(): void {
    this.currentSubscriptionSubject.next(null);
    this.availablePlansSubject.next([]);
    this.loadingSubscriptionSubject.next(false);
    this.loadingPlansSubject.next(false);
    this.subscriptionErrorSubject.next(null);
    this.plansErrorSubject.next(null);
  }
}

