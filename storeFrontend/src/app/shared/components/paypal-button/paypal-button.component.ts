import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '@app/core/services/payment.service';
import { PaymentProvider, PaymentCaptureResponse } from '@app/core/models/payment.model';
import { finalize } from 'rxjs/operators';

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
        
        // ═══════════════════════════════════════════════════════════════════════════
        // CREATE ORDER: Bestellung im Backend erstellen
        // ═══════════════════════════════════════════════════════════════════════════
        createOrder: async () => {
          console.log('[PayPal] createOrder called - Creating payment...');
          try {
            const response = await this.paymentService.createPayment(this.storeId, {
              orderId: this.orderId,
              provider: PaymentProvider.PAYPAL,
              returnUrl: window.location.origin + '/checkout/success',
              cancelUrl: window.location.origin + '/checkout/cancel',
              checkoutToken: this.checkoutToken
            }).pipe(
              finalize(() => console.log('[PayPal] createOrder API call completed'))
            ).toPromise();
            
            if (!response || !response.providerOrderId) {
              const errorMsg = response?.errorMessage || 'Payment creation failed - no provider order ID';
              console.error('[PayPal] createOrder FAILED:', errorMsg, response);
              throw new Error(errorMsg);
            }
            
            this.paymentId = response.paymentId;
            console.log('[PayPal] createOrder SUCCESS - PayPal Order ID:', response.providerOrderId, 'Payment ID:', this.paymentId);
            return response.providerOrderId;
            
          } catch (err: any) {
            const errorMsg = err.error?.message || err.message || 'Payment creation failed';
            console.error('[PayPal] createOrder ERROR:', errorMsg, err);
            
            // KRITISCH: Error-Nachricht anzeigen und Modal schließen
            this.error = this.getHumanReadableError(err);
            this.loading = false;
            this.paymentError.emit(this.error ?? undefined);
            
            throw err; // PayPal Modal schließt sich automatisch bei throw
          }
        },
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ON APPROVE: Zahlung wurde im PayPal-Modal bestätigt
        // ═══════════════════════════════════════════════════════════════════════════
        onApprove: async (data: any) => {
          console.log('[PayPal] onApprove called - User approved payment', data);
          this.loading = true;
          
          try {
            if (!this.paymentId) {
              throw new Error('Payment ID not found - cannot capture');
            }
            
            console.log('[PayPal] Capturing payment...', this.paymentId);
            const response = await this.paymentService.capturePayment(
              this.storeId, 
              this.paymentId, 
              this.checkoutToken
            ).pipe(
              finalize(() => {
                this.loading = false;
                console.log('[PayPal] capturePayment API call completed');
              })
            ).toPromise();
            
            if (!response) {
              throw new Error('Capture failed - no response from server');
            }
            
            console.log('[PayPal] Capture response:', response);
            
            if (response.status === 'PAID') {
              console.log('[PayPal] Payment SUCCESSFUL - Order confirmed');
              this.error = null;
              this.paymentSuccess.emit(response);
            } else if (response.status === 'PENDING') {
              console.warn('[PayPal] Payment PENDING - Waiting for confirmation');
              this.error = 'Zahlung wird geprüft. Sie erhalten eine Benachrichtigung.';
              this.paymentError.emit(this.error ?? undefined);
            } else {
              const errorMsg = response.errorMessage || 'Payment capture failed with status: ' + response.status;
              console.error('[PayPal] Capture FAILED:', errorMsg);
              throw new Error(errorMsg);
            }
            
          } catch (err: any) {
            const errorMsg = err.error?.message || err.message || 'Payment capture failed';
            console.error('[PayPal] onApprove ERROR:', errorMsg, err);
            
            // KRITISCH: Lesbare Fehlermeldung anzeigen
            this.error = this.getHumanReadableError(err);
            this.loading = false;
            this.paymentError.emit(this.error ?? undefined);
          }
        },
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ON CANCEL: Benutzer hat PayPal-Zahlung abgebrochen
        // ═══════════════════════════════════════════════════════════════════════════
        onCancel: (data: any) => {
          console.log('[PayPal] onCancel called - User cancelled payment', data);
          this.error = 'Zahlung abgebrochen';
          this.loading = false;
          this.paymentCancel.emit();
        },
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ON ERROR: PayPal-interner Fehler
        // ═══════════════════════════════════════════════════════════════════════════
        onError: (err: any) => {
          console.error('[PayPal] onError called - PayPal internal error', err);
          this.error = 'PayPal-Fehler. Bitte versuchen Sie es später erneut.';
          this.loading = false;
          this.paymentError.emit(this.error ?? undefined);
        }
      }).render(this.paypalButtonContainer.nativeElement);
      
      this.loading = false;
      console.log('[PayPal] Button rendered successfully');
      
    } catch (err: any) {
      console.error('[PayPal] initPayPalButton FAILED:', err);
      this.loading = false;
      this.error = 'PayPal konnte nicht geladen werden';
      this.paymentError.emit(this.error);
    }
  }
  
  /**
   * Konvertiert technische Fehler in benutzerfreundliche Nachrichten
   */
  private getHumanReadableError(err: any): string {
    const status = err.status || err.error?.status;
    const message = err.error?.message || err.message || '';
    
    // 503 Service Unavailable
    if (status === 503) {
      return 'PayPal ist momentan nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.';
    }
    
    // 500 Internal Server Error
    if (status >= 500) {
      return 'Ein Server-Fehler ist aufgetreten. Bitte kontaktieren Sie den Support.';
    }
    
    // 400/401/403/404
    if (status >= 400 && status < 500) {
      return message || 'Die Zahlung konnte nicht verarbeitet werden. Bitte prüfen Sie Ihre Eingaben.';
    }
    
    // Network/Timeout Error
    if (message.includes('timeout') || message.includes('network')) {
      return 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.';
    }
    
    // Fallback
    return message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
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
