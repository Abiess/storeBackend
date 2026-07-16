import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreCurrencyPipe } from '@app/core/pipes/store-currency.pipe';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { CurrencyCode, PriceMode } from '@app/core/models';

export interface TaxSummaryItem {
  taxRate: number;
  taxCategory: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

@Component({
  selector: 'app-tax-summary',
  standalone: true,
  imports: [CommonModule, StoreCurrencyPipe, TranslatePipe],
  template: `
    <div class="tax-summary">
      <div class="tax-summary-header">
        <h3>{{ 'checkout.orderSummary' | translate }}</h3>
      </div>

      <div class="tax-summary-body">
        <!-- Subtotal -->
        <div class="summary-line">
          <span class="label">{{ 'checkout.subtotal' | translate }}</span>
          <span class="value">{{ displayAmount(subtotalNet, subtotalGross) | storeCurrency:currencyCode:locale }}</span>
        </div>

        <!-- Rabatt (nur wenn vorhanden) -->
        <div class="summary-line discount-line" *ngIf="hasDiscount">
          <span class="label">{{ 'checkout.discount' | translate }}</span>
          <span class="value discount">-{{ displayAmount(discountNet, discountGross) | storeCurrency:currencyCode:locale }}</span>
        </div>

        <!-- Versandkosten -->
        <div class="summary-line" *ngIf="shippingGross > 0">
          <span class="label">{{ 'checkout.shipping' | translate }}</span>
          <span class="value">{{ displayAmount(shippingNet, shippingGross) | storeCurrency:currencyCode:locale }}</span>
        </div>

        <!-- Versandkosten kostenlos -->
        <div class="summary-line" *ngIf="shippingGross === 0">
          <span class="label">{{ 'checkout.shipping' | translate }}</span>
          <span class="value free">{{ 'checkout.freeShipping' | translate }}</span>
        </div>

        <!-- Steuer-Breakdown (optional, nur wenn detaillierte Daten vorhanden) -->
        <div class="tax-breakdown" *ngIf="showTaxBreakdown && taxBreakdown.length > 0">
          <div class="summary-line tax-detail" *ngFor="let item of taxBreakdown">
            <span class="label">{{ 'checkout.vat' | translate }} {{ item.taxRate }}%</span>
            <span class="value">{{ item.taxAmount | storeCurrency:currencyCode:locale }}</span>
          </div>
        </div>

        <!-- Gesamt-Steuer (falls keine Breakdown, aber vatEnabled) -->
        <div class="summary-line tax-line" *ngIf="!showTaxBreakdown && vatEnabled && taxTotal > 0">
          <span class="label">{{ 'checkout.includedVat' | translate }}</span>
          <span class="value">{{ taxTotal | storeCurrency:currencyCode:locale }}</span>
        </div>

        <div class="summary-divider"></div>

        <!-- Gesamtsumme -->
        <div class="summary-line total-line">
          <span class="label">{{ 'checkout.total' | translate }}</span>
          <span class="value">{{ displayAmount(totalNet, totalGross) | storeCurrency:currencyCode:locale }}</span>
        </div>

        <!-- Steuerhinweis bei NET-Preisen -->
        <div class="tax-notice" *ngIf="priceMode === 'NET'">
          <small>{{ 'checkout.netPriceNotice' | translate }}</small>
        </div>

        <!-- Steuerbefreiungs-Hinweis -->
        <div class="tax-notice" *ngIf="!vatEnabled">
          <small>{{ 'checkout.vatExemptNotice' | translate }}</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tax-summary {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .tax-summary-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .tax-summary-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .tax-summary-body {
      padding: 20px;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-line .label {
      color: #555;
    }

    .summary-line .value {
      font-weight: 500;
      color: #333;
    }

    .summary-line.discount-line .label,
    .summary-line.discount-line .value {
      color: #28a745;
    }

    .summary-line .value.free {
      color: #28a745;
      font-weight: 600;
    }

    .tax-breakdown {
      margin: 4px 0;
      padding-left: 12px;
      border-left: 2px solid #eee;
    }

    .summary-line.tax-detail {
      font-size: 13px;
      padding: 4px 0;
    }

    .summary-line.tax-detail .label {
      color: #777;
      font-style: italic;
    }

    .summary-line.tax-line {
      font-size: 13px;
      color: #666;
    }

    .summary-divider {
      height: 1px;
      background: #ddd;
      margin: 12px 0;
    }

    .summary-line.total-line {
      padding: 12px 0 0;
      font-size: 18px;
      font-weight: 700;
    }

    .summary-line.total-line .label {
      color: #333;
    }

    .summary-line.total-line .value {
      color: #667eea;
      font-size: 20px;
    }

    .tax-notice {
      margin-top: 12px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .tax-summary-body {
        padding: 16px;
      }

      .summary-line {
        font-size: 13px;
      }

      .summary-line.total-line {
        font-size: 16px;
      }

      .summary-line.total-line .value {
        font-size: 18px;
      }
    }
  `]
})
export class TaxSummaryComponent {
  @Input() subtotalNet = 0;
  @Input() subtotalGross = 0;
  @Input() taxTotal = 0;
  @Input() shippingNet = 0;
  @Input() shippingTax = 0;
  @Input() shippingGross = 0;
  @Input() discountNet = 0;
  @Input() discountTax = 0;
  @Input() discountGross = 0;
  @Input() totalNet = 0;
  @Input() totalGross = 0;
  @Input() currencyCode: CurrencyCode | string = 'EUR';
  @Input() priceMode: PriceMode = 'GROSS';
  @Input() locale?: string;
  @Input() vatEnabled = true;
  @Input() taxBreakdown: TaxSummaryItem[] = [];
  @Input() showTaxBreakdown = false;

  get hasDiscount(): boolean {
    return this.discountGross > 0 || this.discountNet > 0;
  }

  /**
   * Zeigt den passenden Betrag je nach priceMode
   */
  displayAmount(netAmount: number, grossAmount: number): number {
    return this.priceMode === 'NET' ? netAmount : grossAmount;
  }
}
