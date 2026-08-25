import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';
import { OrderService } from '@app/core/services/order.service';

interface OrderDetails {
  id: number;
  orderNumber: string;
  orderSource: string;
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
  templateUrl: './pos-receipt.component.html',
  styleUrls: ['./pos-receipt.component.scss']
})
export class PosReceiptComponent implements OnInit, OnChanges {
  @Input() storeId!: number;
  @Input() orderId!: number;
  @Input() visible = false;

  private orderService = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);

  order: OrderDetails | null = null;
  loading = false;
  error: string | null = null;
  taxBreakdown: TaxBreakdown[] = [];

  ngOnInit(): void {
    if (this.orderId && this.storeId) {
      this.loadOrder();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['orderId'] || changes['visible']) && this.visible && this.orderId && this.storeId) {
      this.loadOrder();
    }
  }

  loadOrder(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    
    this.orderService.getOrder(this.storeId, this.orderId).subscribe({
      next: (response: any) => {
        const apiOrder = response.order;
        const apiItems = response.items;
        
        this.order = {
          id: apiOrder.id,
          orderNumber: apiOrder.orderNumber,
          orderSource: apiOrder.orderSource,
          createdAt: apiOrder.createdAt,
          status: apiOrder.status,
          paymentMethod: apiOrder.paymentMethod,
          totalGross: apiOrder.totalGross,
          totalNet: apiOrder.totalNet,
          taxTotal: apiOrder.taxTotal,
          cashReceived: apiOrder.cashReceived,
          cashChange: apiOrder.cashChange,
          store: {
            id: apiOrder.store.id,
            name: apiOrder.store.name
          },
          items: apiItems.map((item: any) => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unitGrossPrice: item.unitGrossPrice,
            lineGrossTotal: item.lineGrossTotal,
            lineNetTotal: item.lineNetTotal,
            lineTaxAmount: item.lineTaxAmount,
            taxRate: item.taxRate
          }))
        };
        
        this.calculateTaxBreakdown();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load order:', err);
        if (err.status === 404) {
          this.error = 'pos.receipt.notFound';
        } else if (err.status === 403) {
          this.error = 'pos.receipt.noAccess';
        } else {
          this.error = 'pos.receipt.loadError';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
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

  retry(): void {
    this.loadOrder();
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
