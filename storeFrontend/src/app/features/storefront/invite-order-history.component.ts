import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SubdomainService } from '../../core/services/subdomain.service';
import {
  InviteOrderDetail, InviteOrderService, InviteOrderSummary
} from '../../core/services/invite-order.service';
import { StoreCurrencyPipe } from '../../core/pipes/store-currency.pipe';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { toDate } from '../../core/utils/date.utils';
import { StorefrontBottomNavComponent } from './storefront-bottom-nav.component';

@Component({
  selector: 'app-invite-order-history',
  imports: [CommonModule, StoreCurrencyPipe, TranslatePipe, StorefrontBottomNavComponent],
  template: `
    <main class="request-page">
      <header class="page-header">
        <button type="button" class="back" (click)="goBack()" [attr.aria-label]="'inviteOrders.back' | translate">←</button>
        <h1>{{ (orderNumber ? 'inviteOrders.detailTitle' : 'inviteOrders.title') | translate }}</h1>
      </header>

      <div class="request-tabs" *ngIf="!orderNumber">
        <span class="selected">{{ 'inviteOrders.sent' | translate }}</span>
      </div>

      <p class="state" *ngIf="loading">{{ 'inviteOrders.loading' | translate }}</p>
      <div class="state" *ngIf="!loading && error">
        <p role="alert">{{ 'inviteOrders.loadError' | translate }}</p>
        <button type="button" (click)="reload()">{{ 'inviteOrders.retry' | translate }}</button>
      </div>

      <ng-container *ngIf="!loading && !error && !orderNumber">
        <div class="state" *ngIf="orders.length === 0">{{ 'inviteOrders.empty' | translate }}</div>
        <div class="request-list" *ngIf="orders.length > 0">
          <button class="request-card" type="button" *ngFor="let order of orders" (click)="open(order.orderNumber)">
            <div class="request-card-heading">
              <strong>#{{ order.orderNumber }}</strong>
              <span>{{ asDate(order.createdAt) | date:'dd.MM.yyyy' }} <span aria-hidden="true">›</span></span>
            </div>
            <div class="request-price">{{ order.totalAmount | storeCurrency:order.currencyCode }}</div>
            <div class="request-state"><span class="state-mark" aria-hidden="true"></span>{{ statusKey(order.status) | translate }}</div>
            <small>{{ 'inviteOrders.itemCount' | translate: { count: order.itemCount } }}</small>
          </button>
        </div>
      </ng-container>

      <ng-container *ngIf="(!loading && !error ? order : null) as selectedOrder">
        <div class="detail-heading">
          <strong>#{{ selectedOrder.orderNumber }}</strong>
          <span>{{ asDate(selectedOrder.createdAt) | date:'dd.MM.yyyy' }}</span>
        </div>
        <div class="request-state detail-state"><span class="state-mark" aria-hidden="true"></span>{{ statusKey(selectedOrder.status) | translate }}</div>
        <section class="request-lines" [attr.aria-label]="'inviteOrders.items' | translate">
          <div class="request-line" *ngFor="let item of selectedOrder.items">
            <div class="product-row">
              <img *ngIf="item.imageUrl; else imagePlaceholder" [src]="item.imageUrl" alt="" loading="lazy">
              <ng-template #imagePlaceholder><span class="product-placeholder" aria-hidden="true">▦</span></ng-template>
              <div>
                <small *ngIf="item.sku">#{{ item.sku }}</small>
                <strong>{{ item.productName }}</strong>
                <span *ngIf="item.variantName">{{ item.variantName }}</span>
              </div>
            </div>
            <div class="quantity-row">
              <div><strong>{{ 'inviteOrders.quantity' | translate: { count: item.quantity } }}</strong>
                <span>{{ item.unitPrice | storeCurrency:selectedOrder.currencyCode }} {{ 'inviteOrders.perUnit' | translate }}</span>
              </div>
              <strong>{{ item.totalAmount | storeCurrency:selectedOrder.currencyCode }}</strong>
            </div>
          </div>
        </section>
        <div class="request-total"><span>{{ 'inviteOrders.total' | translate }}</span><strong>{{ selectedOrder.totalAmount | storeCurrency:selectedOrder.currencyCode }}</strong></div>
      </ng-container>
    </main>
    <app-storefront-bottom-nav [inviteOnlyMode]="true"
      (categoryClick)="goToShop()" (searchClick)="goToShop()"></app-storefront-bottom-nav>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #f5f5f5; color: #202020; }
    .request-page { max-width: 860px; min-height: 100vh; margin: auto; padding-bottom: 100px; }
    .page-header { height: 92px; display: flex; align-items: center; justify-content: center; position: relative; background: #fff; }
    .page-header h1 { font-size: 1.2rem; margin: 0; font-weight: 650; }
    .back { position: absolute; left: 20px; width: 50px; height: 50px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 5px 28px #0000000d; font-size: 1.8rem; cursor: pointer; }
    .request-tabs { display: flex; background: #fff; border-bottom: 1px solid #e6e6e6; }
    .selected { color: #c90020; font-weight: 600; padding: 16px 28px; border-bottom: 4px solid #c90020; }
    .request-list { padding: 18px; display: grid; gap: 16px; }
    .request-card { text-align: left; width: 100%; border: 1px solid #e2e2e2; border-radius: 12px; background: #fff; padding: 20px; cursor: pointer; color: inherit; }
    .request-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #e3e3e3; }
    .request-card-heading strong { font-weight: 500; font-size: 1.1rem; overflow-wrap: anywhere; }
    .request-card-heading span { color: #777; white-space: nowrap; }
    .request-card-heading span span { margin-left: 8px; font-size: 1.6rem; vertical-align: middle; }
    .request-price { color: #c90020; font-size: 1.25rem; font-weight: 650; margin: 20px 0; }
    .request-state { background: #eee; border-radius: 9px; padding: 15px; display: flex; align-items: center; gap: 16px; }
    .state-mark { height: 25px; border-left: 3px solid #c90020; position: relative; margin-left: 4px; }
    .state-mark::after { content: ''; position: absolute; left: -6px; bottom: -2px; width: 9px; height: 9px; background: #c90020; border-radius: 50%; }
    .request-card small { display: block; color: #777; margin-top: 14px; }
    .state { text-align: center; padding: 42px 20px; color: #686868; }
    .state button { padding: 10px 20px; color: #c90020; border: 1px solid #c90020; border-radius: 8px; background: #fff; }
    .detail-heading { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 22px 20px; gap: 10px; }
    .detail-heading strong { overflow-wrap: anywhere; }
    .detail-heading span { color: #777; white-space: nowrap; }
    .detail-state { border-radius: 0; background: #f2f2f2; }
    .request-lines { background: #fff; }
    .request-line { padding: 24px 20px; border-bottom: 1px solid #e5e5e5; }
    .product-row { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    .product-row img, .product-placeholder { flex: 0 0 64px; width: 64px; height: 72px; object-fit: contain; }
    .product-placeholder { display: grid; place-items: center; background: #f3f3f3; border-radius: 8px; color: #bbb; font-size: 2rem; }
    .product-row div { display: grid; gap: 4px; min-width: 0; }
    .product-row small { color: #c90020; }
    .product-row strong { font-size: 1.05rem; font-weight: 600; }
    .product-row span { color: #777; }
    .quantity-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid #dedede; border-radius: 10px; padding: 16px; }
    .quantity-row div { display: grid; gap: 5px; }
    .quantity-row div span { color: #666; font-size: .9rem; }
    .quantity-row > strong { color: #c90020; white-space: nowrap; }
    .request-total { display: flex; justify-content: space-between; padding: 20px; background: #fff; font-size: 1.05rem; }
    .request-total strong { color: #c90020; }
    @media (min-width: 768px) { .request-page { padding-bottom: 36px; } .request-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `]
})
export class InviteOrderHistoryComponent implements OnInit {
  storeId: number | null = null;
  orderNumber: string | null = null;
  orders: InviteOrderSummary[] = [];
  order: InviteOrderDetail | null = null;
  loading = true;
  error = false;

  constructor(private route: ActivatedRoute, private router: Router,
    private subdomainService: SubdomainService, private authService: AuthService,
    private orderService: InviteOrderService) {}

  ngOnInit(): void {
    this.orderNumber = this.route.snapshot.paramMap.get('orderNumber');
    this.subdomainService.resolveStore().pipe(take(1)).subscribe({
      next: info => {
        if (!info.storeId || info.customerAccountMode !== 'INVITE_ONLY' ||
            !this.authService.isLoggedInAsStoreCustomer(info.storeId)) {
          this.router.navigate(['/']);
          return;
        }
        this.storeId = info.storeId;
        this.reload();
      },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  reload(): void {
    if (this.storeId == null) return;
    this.loading = true;
    this.error = false;
    const result: Observable<InviteOrderDetail | InviteOrderSummary[]> = this.orderNumber
      ? this.orderService.detail(this.storeId, this.orderNumber)
      : this.orderService.list(this.storeId);
    result.subscribe({
      next: data => {
        if (Array.isArray(data)) this.orders = data;
        else this.order = data as InviteOrderDetail;
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  open(orderNumber: string): void { this.router.navigate(['/storefront/orders', orderNumber]); }
  goBack(): void { this.router.navigate(this.orderNumber ? ['/storefront/orders'] : ['/']); }
  goToShop(): void { this.router.navigate(['/']); }
  asDate(value: string): Date | null { return toDate(value); }

  statusKey(status: string): string {
    const known: Record<string, string> = {
      PENDING: 'pending', CONFIRMED: 'confirmed', PROCESSING: 'processing',
      SHIPPED: 'shipped', DELIVERED: 'delivered', CANCELLED: 'cancelled'
    };
    return 'inviteOrders.status.' + (known[status] ?? 'other');
  }
}
