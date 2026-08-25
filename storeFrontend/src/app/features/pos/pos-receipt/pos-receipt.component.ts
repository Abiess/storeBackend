import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';

interface OrderDetails {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  totalGross: number;
  totalNet: number;
  taxTotal: number;
  cashReceived?: number;
  cashChange?: number;
  store: {
    id: number;
    name: string;
  };
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  unitGrossPrice: number;
  lineGrossTotal: number;
  lineNetTotal: number;
  lineTaxAmount: number;
  taxRate: number;
}

interface TaxBreakdown {
  rate: number;
  net: number;
  tax: number;
  gross: number;
}

@Component({
  selector: 'app-pos-receipt',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-receipt.component.html',
  styleUrls: ['./pos-receipt.component.scss']
})
export class PosReceiptComponent implements OnInit {
  @Input() orderId!: number;
  @Input() orderNumber?: string;
  @Input() visible = false;

  order: OrderDetails | null = null;
  loading = false;
  error: string | null = null;
  taxBreakdown: TaxBreakdown[] = [];

  ngOnInit(): void {
    if (this.orderId) {
      this.loadOrder();
    }
  }

  loadOrder(): void {
    // TODO: OrderService integration
    this.loading = true;
    
    setTimeout(() => {
      this.order = {
        id: this.orderId,
        orderNumber: this.orderNumber || 'POS-20260826001234-A1B2',
        createdAt: new Date().toISOString(),
        status: 'CONFIRMED',
        paymentMethod: 'CASH',
        totalGross: 23.87,
        totalNet: 20.06,
        taxTotal: 3.81,
        cashReceived: 30.00,
        cashChange: 6.13,
        store: {
          id: 121,
          name: 'Demo Store'
        },
        items: [
          {
            id: 1,
            productName: 'Coca Cola 1L',
            quantity: 2,
            unitGrossPrice: 2.49,
            lineGrossTotal: 4.98,
            lineNetTotal: 4.18,
            lineTaxAmount: 0.80,
            taxRate: 19
          }
        ]
      };
      
      this.calculateTaxBreakdown();
      this.loading = false;
    }, 300);
  }

  calculateTaxBreakdown(): void {
    if (!this.order) return;

    const grouped = new Map<number, TaxBreakdown>();
    
    this.order.items.forEach(item => {
      const existing = grouped.get(item.taxRate) || { 
        rate: item.taxRate, 
        net: 0, 
        tax: 0, 
        gross: 0 
      };
      
      existing.net += item.lineNetTotal;
      existing.tax += item.lineTaxAmount;
      existing.gross += item.lineGrossTotal;
      
      grouped.set(item.taxRate, existing);
    });

    this.taxBreakdown = Array.from(grouped.values())
      .sort((a, b) => b.rate - a.rate);
  }

  print(): void {
    window.print();
  }

  close(): void {
    this.visible = false;
  }

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(value: number): string {
    return value.toFixed(2) + ' €';
  }

  get isCashPayment(): boolean {
    return this.order?.paymentMethod === 'CASH';
  }

  get isCardExternalPayment(): boolean {
    return this.order?.paymentMethod === 'CARD_EXTERNAL';
  }
}
