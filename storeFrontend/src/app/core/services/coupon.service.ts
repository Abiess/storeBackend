import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CouponDTO {
  id?: number;
  storeId?: number;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  percentDiscount?: number;
  valueCents?: number;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
  minSubtotalCents?: number;
  appliesTo: 'ALL' | 'PRODUCTS' | 'CATEGORIES' | 'COLLECTIONS';
  productIds?: number[];
  categoryIds?: number[];
  collectionIds?: number[];
  customerEmails?: string[];
  domainScope: 'ALL' | 'SELECTED';
  domainIds?: number[];
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  timesUsedTotal?: number;
  combinable: 'NONE' | 'STACK_WITH_DIFFERENT_TYPES' | 'STACK_ALL';
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  autoApply?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidateCouponsRequest {
  domainHost: string;
  cart: CartDTO;
  appliedCodes: string[];
}

export interface CartDTO {
  currency: string;
  subtotalCents: number;
  customerEmail?: string;
  items: CartItemDTO[];
}

export interface CartItemDTO {
  productId: number;
  productName: string;
  priceCents: number;
  quantity: number;
  categoryIds?: number[];
  collectionIds?: number[];
}

export interface ValidateCouponsResponse {
  validCoupons: ValidCouponDTO[];
  invalidCoupons: InvalidCouponDTO[];
  cartTotals: CartTotalsDTO;
}

export interface ValidCouponDTO {
  couponId: number;
  code: string;
  type: string;
  discountCents: number;
  message: string;
}

export interface InvalidCouponDTO {
  code: string;
  reason: string;
}

export interface CartTotalsDTO {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}

export interface CouponUsageDTO {
  totalRedemptions: number;
  totalDiscountCents: number;
  currency: string;
  timesUsedTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = environment.apiUrl || 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  // Admin APIs
  listCoupons(storeId: number, status?: string): Observable<CouponDTO[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<CouponDTO[]>(`${this.apiUrl}/api/stores/${storeId}/coupons`, { params });
  }

  getCoupon(storeId: number, id: number): Observable<CouponDTO> {
    return this.http.get<CouponDTO>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}`);
  }

  createCoupon(storeId: number, coupon: CouponDTO): Observable<CouponDTO> {
    return this.http.post<CouponDTO>(`${this.apiUrl}/api/stores/${storeId}/coupons`, coupon);
  }

  updateCoupon(storeId: number, id: number, coupon: CouponDTO): Observable<CouponDTO> {
    return this.http.put<CouponDTO>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}`, coupon);
  }

  pauseCoupon(storeId: number, id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}/pause`, {});
  }

  resumeCoupon(storeId: number, id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}/resume`, {});
  }

  archiveCoupon(storeId: number, id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}/archive`, {});
  }

  getCouponUsage(storeId: number, id: number): Observable<CouponUsageDTO> {
    return this.http.get<CouponUsageDTO>(`${this.apiUrl}/api/stores/${storeId}/coupons/${id}/usage`);
  }

  importCoupons(storeId: number, csvContent: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/api/stores/${storeId}/coupons/import`, csvContent, {
      responseType: 'text'
    });
  }

  exportCoupons(storeId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/api/stores/${storeId}/coupons/export`, {
      responseType: 'text'
    });
  }

  // Public APIs
  validateCoupons(storeId: number, request: ValidateCouponsRequest): Observable<ValidateCouponsResponse> {
    return this.http.post<ValidateCouponsResponse>(
      `${this.apiUrl}/public/stores/${storeId}/cart/validate-coupons`,
      request
    );
  }

  finalizeCoupons(storeId: number, orderId: number, request: ValidateCouponsRequest): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/public/stores/${storeId}/orders/${orderId}/finalize-coupons`,
      request
    );
  }
}

