import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { OrderService } from './order.service';

/**
 * Service für COD Order Verification Counter
 * Verwaltet Badge Count in Navigation mit optional Auto-Refresh
 */
@Injectable({
  providedIn: 'root'
})
export class OrderVerificationCounterService implements OnDestroy {
  private unverifiedCountSubject = new BehaviorSubject<number>(0);
  public unverifiedCount$ = this.unverifiedCountSubject.asObservable();

  private currentStoreId: number | null = null;
  private pollingSubscription: Subscription | null = null;

  constructor(private orderService: OrderService) {}

  /**
   * Refresh count von Backend (filtert COD + !phoneVerified)
   */
  refreshCount(storeId: number): void {
    this.currentStoreId = storeId;

    this.orderService.getStoreOrders(storeId).subscribe({
      next: (orders) => {
        const unverifiedCount = orders.filter(order =>
          order.paymentMethod === 'CASH_ON_DELIVERY' &&
          !order.phoneVerified
        ).length;

        this.unverifiedCountSubject.next(unverifiedCount);
        console.log('🔢 Unverified COD count refreshed:', unverifiedCount);
      },
      error: (err) => {
        console.error('❌ Error refreshing count:', err);
        // Keep last count on error (don't reset to 0)
      }
    });
  }

  /**
   * Manuelles Setzen des Counts (Performance: von Component nach loadOrders)
   */
  setCount(count: number): void {
    this.unverifiedCountSubject.next(count);
    console.log('🔢 Unverified count set to:', count);
  }

  /**
   * Decrement count um 1 (nach Verify/Reject success)
   */
  decrement(): void {
    const current = this.unverifiedCountSubject.value;
    if (current > 0) {
      this.unverifiedCountSubject.next(current - 1);
      console.log('🔻 Count decremented to:', current - 1);
    }
  }

  /**
   * Increment count um 1 (falls neue unverified order kommt)
   */
  increment(): void {
    const current = this.unverifiedCountSubject.value;
    this.unverifiedCountSubject.next(current + 1);
    console.log('🔺 Count incremented to:', current + 1);
  }

  /**
   * Start Auto-Refresh Polling (optional)
   * @param storeId Store ID
   * @param intervalMs Interval in milliseconds (default 60000 = 1 min)
   */
  startPolling(storeId: number, intervalMs: number = 60000): void {
    this.stopPolling(); // Stop existing polling first

    this.currentStoreId = storeId;

    // Initial refresh
    this.refreshCount(storeId);

    // Start polling
    this.pollingSubscription = interval(intervalMs).subscribe(() => {
      if (this.currentStoreId) {
        console.log('🔄 Auto-refresh polling triggered');
        this.refreshCount(this.currentStoreId);
      }
    });

    console.log('▶️ Polling started for store', storeId, 'every', intervalMs, 'ms');
  }

  /**
   * Stop Auto-Refresh Polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
      console.log('⏸️ Polling stopped');
    }
  }

  /**
   * Reset count to 0 (cleanup)
   */
  reset(): void {
    this.unverifiedCountSubject.next(0);
    this.currentStoreId = null;
    console.log('🔄 Count reset to 0');
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}

