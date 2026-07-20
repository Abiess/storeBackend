import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '@app/core/services/payment.service';
import { PaymentProvider, PaymentCaptureResponse } from '@app/core/models/payment.model';

declare const paypal: any;

@Component({
  selector: 'app-paypal-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="paypal-button-container">
      <div #paypalButtonContainer></div>
      <div *ngIf="loading" class="paypal-loading">
        <div class="spinner"></div>
        <p>PayPal wird geladen...</p>
      </div>
      <div *ngIf="error" class="paypal-error">
        <p>{{ error }}</p>
        <button (click)="retryInit()" class="retry-btn">Erneut versuchen</button>
      </div>
    </div>
  `,
  styles: [`
    .paypal-button-container { min-height: 150px; position: relative; }
    .paypal-loading { display: flex; flex-direction: column; align-items: center; padding: 2rem; gap: 1rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .paypal-error { padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; text-align: center; }
    .retry-btn { margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
  `]
})
export class PayPalButtonComponent implements AfterViewInit, OnDestroy {
  @ViewChild('paypalButtonContainer', { static: true }) paypalButtonContainer!: ElementRef;
  @Input() orderId!: number;
  @Input() storeId!: number;
  @Input() amount!: number;
  @Input() currency: string = 'EUR';
  @Input() checkoutToken?: string;
  @Output() paymentSuccess = new EventEmitter<PaymentCaptureResponse>();
  @Output() paymentError = new EventEmitter<string>();
  @Output() paymentCancel = new EventEmitter<void>();
  
  loading = true;
  error: string | null = null;
  paymentId: number | null = null;
  private static sdkLoaded = false;
  private static sdkLoadPromise: Promise<void> | null = null;
  
  constructor(private paymentService: PaymentService) {}
  
  ngAfterViewInit() { this.initPayPalButton(); }
  ngOnDestroy() {}
  
  private async initPayPalButton() {
    try {
      this.loading = true;
      this.error = null;
      await this.loadPayPalSDK();
      if (typeof paypal === 'undefined') throw new Error('PayPal SDK not loaded');
      
      paypal.Buttons({
        style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          try {
            const response = await this.paymentService.createPayment(this.storeId, {
              orderId: this.orderId,
              provider: PaymentProvider.PAYPAL,
              returnUrl: window.location.origin + '/checkout/success',
              cancelUrl: window.location.origin + '/checkout/cancel',
              checkoutToken: this.checkoutToken
            }).toPromise();
            if (!response || !response.providerOrderId) throw new Error(response?.errorMessage || 'Payment creation failed');
            this.paymentId = response.paymentId;
            return response.providerOrderId;
          } catch (err: any) {
            this.error = err.error?.message || err.message || 'Payment creation failed';
            this.paymentError.emit(this.error ?? undefined);
            throw err;
          }
        },
        onApprove: async (data: any) => {
          try {
            if (!this.paymentId) throw new Error('Payment ID not found');
            const response = await this.paymentService.capturePayment(
              this.storeId, 
              this.paymentId, 
              this.checkoutToken
            ).toPromise();
            if (!response) throw new Error('Capture failed');
            if (response.status === 'PAID') {
              this.paymentSuccess.emit(response);
            } else if (response.status === 'PENDING') {
              this.error = 'Zahlung wird geprüft. Sie erhalten eine Benachrichtigung.';
              this.paymentError.emit(this.error ?? undefined);
            } else {
              throw new Error(response.errorMessage || 'Payment capture failed');
            }
          } catch (err: any) {
            this.error = err.error?.message || err.message || 'Payment capture failed';
            this.paymentError.emit(this.error ?? undefined);
          }
        },
        onCancel: (data: any) => { this.error = 'Zahlung abgebrochen'; this.paymentCancel.emit(); },
        onError: (err: any) => { this.error = 'PayPal Fehler'; this.paymentError.emit(this.error ?? undefined); }
      }).render(this.paypalButtonContainer.nativeElement);
      this.loading = false;
    } catch (err: any) {
      this.loading = false;
      this.error = 'PayPal konnte nicht geladen werden';
      this.paymentError.emit(this.error);
    }
  }
  
  private async loadPayPalSDK(): Promise<void> {
    if (PayPalButtonComponent.sdkLoaded) return Promise.resolve();
    if (PayPalButtonComponent.sdkLoadPromise) return PayPalButtonComponent.sdkLoadPromise;
    PayPalButtonComponent.sdkLoadPromise = new Promise((resolve, reject) => {
      if (typeof paypal !== 'undefined') { PayPalButtonComponent.sdkLoaded = true; resolve(); return; }
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=sb&currency=${this.currency}&intent=capture`;
      script.async = true;
      script.onload = () => { PayPalButtonComponent.sdkLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
    return PayPalButtonComponent.sdkLoadPromise;
  }
  
  retryInit() { this.initPayPalButton(); }
}
