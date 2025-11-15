import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  CouponDTO,
  ValidateCouponsRequest,
  ValidateCouponsResponse,
  CouponUsageDTO,
  ValidCouponDTO,
  InvalidCouponDTO,
  CartTotalsDTO
} from '../services/coupon.service';

@Injectable({
  providedIn: 'root'
})
export class MockCouponService {
  private mockCoupons: CouponDTO[] = [
    {
      id: 1,
      storeId: 1,
      code: 'SAVE20',
      type: 'PERCENT',
      percentDiscount: 20,
      currency: 'EUR',
      startsAt: '2024-01-01T00:00:00',
      endsAt: '2025-12-31T23:59:59',
      minSubtotalCents: 5000,
      appliesTo: 'ALL',
      domainScope: 'ALL',
      productIds: [],
      categoryIds: [],
      collectionIds: [],
      customerEmails: [],
      domainIds: [],
      usageLimitTotal: 1000,
      usageLimitPerCustomer: 3,
      timesUsedTotal: 45,
      combinable: 'NONE',
      status: 'ACTIVE',
      autoApply: false,
      description: '20% Rabatt auf alles',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-11-15T10:30:00'
    },
    {
      id: 2,
      storeId: 1,
      code: 'WELCOME10',
      type: 'FIXED',
      valueCents: 1000,
      currency: 'EUR',
      startsAt: '2024-01-01T00:00:00',
      endsAt: '2025-12-31T23:59:59',
      minSubtotalCents: 3000,
      appliesTo: 'ALL',
      domainScope: 'ALL',
      productIds: [],
      categoryIds: [],
      collectionIds: [],
      customerEmails: [],
      domainIds: [],
      usageLimitTotal: undefined,
      usageLimitPerCustomer: 1,
      timesUsedTotal: 123,
      combinable: 'STACK_WITH_DIFFERENT_TYPES',
      status: 'ACTIVE',
      autoApply: true,
      description: '10€ Willkommensrabatt',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-11-15T10:30:00'
    },
    {
      id: 3,
      storeId: 1,
      code: 'FREESHIP',
      type: 'FREE_SHIPPING',
      currency: 'EUR',
      startsAt: '2024-01-01T00:00:00',
      endsAt: '2025-12-31T23:59:59',
      minSubtotalCents: 2000,
      appliesTo: 'ALL',
      domainScope: 'ALL',
      productIds: [],
      categoryIds: [],
      collectionIds: [],
      customerEmails: [],
      domainIds: [],
      usageLimitTotal: undefined,
      usageLimitPerCustomer: undefined,
      timesUsedTotal: 567,
      combinable: 'STACK_ALL',
      status: 'ACTIVE',
      autoApply: false,
      description: 'Kostenloser Versand',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-11-15T10:30:00'
    }
  ];

  private nextId = 4;

  constructor() {
    console.log('🎭 Mock: CouponService initialized with', this.mockCoupons.length, 'coupons');
  }

  listCoupons(storeId: number, status?: string): Observable<CouponDTO[]> {
    console.log('🎭 Mock: Listing coupons for store', storeId, 'with status filter:', status);

    let filtered = this.mockCoupons.filter(c => c.storeId === storeId);

    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    return of(filtered).pipe(delay(300));
  }

  getCoupon(storeId: number, id: number): Observable<CouponDTO> {
    console.log('🎭 Mock: Getting coupon', id, 'for store', storeId);

    const coupon = this.mockCoupons.find(c => c.storeId === storeId && c.id === id);

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    return of(coupon).pipe(delay(300));
  }

  createCoupon(storeId: number, coupon: CouponDTO): Observable<CouponDTO> {
    console.log('🎭 Mock: Creating coupon for store', storeId, coupon);

    const exists = this.mockCoupons.some(c =>
      c.storeId === storeId &&
      c.code.toUpperCase() === coupon.code.toUpperCase()
    );

    if (exists) {
      throw new Error('Coupon code already exists');
    }

    const newCoupon: CouponDTO = {
      ...coupon,
      id: this.nextId++,
      storeId,
      timesUsedTotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.mockCoupons.push(newCoupon);
    console.log('🎭 Mock: Created coupon', newCoupon.code);

    return of(newCoupon).pipe(delay(500));
  }

  updateCoupon(storeId: number, id: number, coupon: CouponDTO): Observable<CouponDTO> {
    console.log('🎭 Mock: Updating coupon', id, 'for store', storeId);

    const index = this.mockCoupons.findIndex(c => c.storeId === storeId && c.id === id);

    if (index === -1) {
      throw new Error('Coupon not found');
    }

    const updated: CouponDTO = {
      ...coupon,
      id,
      storeId,
      updatedAt: new Date().toISOString()
    };

    this.mockCoupons[index] = updated;
    console.log('🎭 Mock: Updated coupon', updated.code);

    return of(updated).pipe(delay(500));
  }

  pauseCoupon(storeId: number, id: number): Observable<void> {
    console.log('🎭 Mock: Pausing coupon', id);

    const coupon = this.mockCoupons.find(c => c.storeId === storeId && c.id === id);

    if (coupon) {
      coupon.status = 'PAUSED';
      coupon.updatedAt = new Date().toISOString();
    }

    return of(void 0).pipe(delay(300));
  }

  resumeCoupon(storeId: number, id: number): Observable<void> {
    console.log('🎭 Mock: Resuming coupon', id);

    const coupon = this.mockCoupons.find(c => c.storeId === storeId && c.id === id);

    if (coupon) {
      coupon.status = 'ACTIVE';
      coupon.updatedAt = new Date().toISOString();
    }

    return of(void 0).pipe(delay(300));
  }

  archiveCoupon(storeId: number, id: number): Observable<void> {
    console.log('🎭 Mock: Archiving coupon', id);

    const coupon = this.mockCoupons.find(c => c.storeId === storeId && c.id === id);

    if (coupon) {
      coupon.status = 'ARCHIVED';
      coupon.updatedAt = new Date().toISOString();
    }

    return of(void 0).pipe(delay(300));
  }

  getCouponUsage(storeId: number, id: number): Observable<CouponUsageDTO> {
    console.log('🎭 Mock: Getting usage for coupon', id);

    const coupon = this.mockCoupons.find(c => c.storeId === storeId && c.id === id);

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    const usage: CouponUsageDTO = {
      totalRedemptions: coupon.timesUsedTotal || 0,
      totalDiscountCents: (coupon.timesUsedTotal || 0) * 1500,
      currency: coupon.currency || 'EUR',
      timesUsedTotal: coupon.timesUsedTotal || 0
    };

    return of(usage).pipe(delay(300));
  }

  importCoupons(storeId: number, csvContent: string): Observable<string> {
    console.log('🎭 Mock: Importing coupons for store', storeId);
    return of('Mock import successful: 5 coupons imported').pipe(delay(1000));
  }

  exportCoupons(storeId: number): Observable<string> {
    console.log('🎭 Mock: Exporting coupons for store', storeId);

    const csv = [
      'ID,Code,Type,Discount,Status,Uses',
      ...this.mockCoupons
        .filter(c => c.storeId === storeId)
        .map(c => `${c.id},${c.code},${c.type},${c.percentDiscount || c.valueCents},${c.status},${c.timesUsedTotal}`)
    ].join('\n');

    return of(csv).pipe(delay(500));
  }

  validateCoupons(storeId: number, request: ValidateCouponsRequest): Observable<ValidateCouponsResponse> {
    console.log('🎭 Mock: Validating coupons for store', storeId, request.appliedCodes);

    const validCoupons: ValidCouponDTO[] = [];
    const invalidCoupons: InvalidCouponDTO[] = [];

    const now = new Date();

    const autoApplyCoupons = this.mockCoupons.filter(c =>
      c.storeId === storeId &&
      c.status === 'ACTIVE' &&
      c.autoApply
    );

    const allCodes = [...new Set([...request.appliedCodes, ...autoApplyCoupons.map(c => c.code)])];

    for (const code of allCodes) {
      const coupon = this.mockCoupons.find(c =>
        c.storeId === storeId &&
        c.code.toUpperCase() === code.toUpperCase()
      );

      if (!coupon) {
        invalidCoupons.push({
          code,
          reason: 'Gutschein nicht gefunden'
        });
        continue;
      }

      if (coupon.status !== 'ACTIVE') {
        invalidCoupons.push({
          code,
          reason: 'Gutschein ist nicht aktiv'
        });
        continue;
      }

      if (coupon.endsAt && new Date(coupon.endsAt) < now) {
        invalidCoupons.push({
          code,
          reason: 'Gutschein ist abgelaufen'
        });
        continue;
      }

      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        invalidCoupons.push({
          code,
          reason: 'Gutschein ist noch nicht gültig'
        });
        continue;
      }

      if (coupon.minSubtotalCents && request.cart.subtotalCents < coupon.minSubtotalCents) {
        invalidCoupons.push({
          code,
          reason: `Mindestbestellwert von ${(coupon.minSubtotalCents / 100).toFixed(2)} € nicht erreicht`
        });
        continue;
      }

      if (coupon.usageLimitTotal && coupon.timesUsedTotal! >= coupon.usageLimitTotal) {
        invalidCoupons.push({
          code,
          reason: 'Nutzungslimit erreicht'
        });
        continue;
      }

      let discountCents = 0;

      if (coupon.type === 'PERCENT') {
        discountCents = Math.floor(request.cart.subtotalCents * (coupon.percentDiscount! / 100));
      } else if (coupon.type === 'FIXED') {
        discountCents = Math.min(coupon.valueCents!, request.cart.subtotalCents);
      } else if (coupon.type === 'FREE_SHIPPING') {
        discountCents = 0;
      }

      validCoupons.push({
        couponId: coupon.id!,
        code: coupon.code,
        type: coupon.type,
        discountCents,
        message: this.getDiscountMessage(coupon, discountCents)
      });
    }

    const totalDiscountCents = validCoupons.reduce((sum, c) => sum + c.discountCents, 0);

    const cartTotals: CartTotalsDTO = {
      subtotalCents: request.cart.subtotalCents,
      discountCents: totalDiscountCents,
      shippingCents: 0,
      taxCents: 0,
      totalCents: Math.max(0, request.cart.subtotalCents - totalDiscountCents),
      currency: request.cart.currency
    };

    const response: ValidateCouponsResponse = {
      validCoupons,
      invalidCoupons,
      cartTotals
    };

    console.log('🎭 Mock: Validation result:', validCoupons.length, 'valid,', invalidCoupons.length, 'invalid');

    return of(response).pipe(delay(500));
  }

  finalizeCoupons(storeId: number, orderId: number, request: ValidateCouponsRequest): Observable<void> {
    console.log('🎭 Mock: Finalizing coupons for order', orderId, 'in store', storeId);

    for (const code of request.appliedCodes) {
      const coupon = this.mockCoupons.find(c =>
        c.storeId === storeId &&
        c.code.toUpperCase() === code.toUpperCase()
      );

      if (coupon && coupon.status === 'ACTIVE') {
        coupon.timesUsedTotal = (coupon.timesUsedTotal || 0) + 1;
        console.log('🎭 Mock: Incremented usage for', coupon.code, 'to', coupon.timesUsedTotal);
      }
    }

    return of(void 0).pipe(delay(300));
  }

  private getDiscountMessage(coupon: CouponDTO, discountCents: number): string {
    if (coupon.type === 'PERCENT') {
      return `${coupon.percentDiscount}% Rabatt`;
    } else if (coupon.type === 'FIXED') {
      return `${(discountCents / 100).toFixed(2)} € Rabatt`;
    } else {
      return 'Kostenloser Versand';
    }
  }
}

