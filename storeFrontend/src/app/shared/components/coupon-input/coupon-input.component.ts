import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CouponService, ValidateCouponsRequest, ValidateCouponsResponse, ValidCouponDTO, InvalidCouponDTO } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupon-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './coupon-input.component.html',
  styleUrls: ['./coupon-input.component.scss']
})
export class CouponInputComponent implements OnInit {
  @Input() storeId!: number;
  @Input() cart!: any;
  @Input() domainHost!: string;
  @Output() couponsApplied = new EventEmitter<ValidateCouponsResponse>();

  couponCode = '';
  appliedCoupons: ValidCouponDTO[] = [];
  invalidCoupons: InvalidCouponDTO[] = [];
  validating = false;

  constructor(private couponService: CouponService) {}

  ngOnInit(): void {
    this.validateCoupons();
  }

  onApplyCoupon(): void {
    if (!this.couponCode.trim()) return;

    const code = this.couponCode.trim().toUpperCase();

    if (this.appliedCoupons.some(c => c.code === code)) {
      this.invalidCoupons = [{ code, reason: 'Bereits angewendet' }];
      return;
    }

    this.validateCoupons([...this.appliedCoupons.map(c => c.code), code]);
  }

  onRemoveCoupon(coupon: ValidCouponDTO): void {
    const codes = this.appliedCoupons
      .filter(c => c.couponId !== coupon.couponId)
      .map(c => c.code);
    this.validateCoupons(codes);
  }

  private validateCoupons(codes: string[] = []): void {
    this.validating = true;

    const request: ValidateCouponsRequest = {
      domainHost: this.domainHost,
      cart: this.mapCart(),
      appliedCodes: codes
    };

    this.couponService.validateCoupons(this.storeId, request).subscribe({
      next: (response) => {
        this.appliedCoupons = response.validCoupons;
        this.invalidCoupons = response.invalidCoupons;
        this.couponCode = '';
        this.validating = false;
        this.couponsApplied.emit(response);
      },
      error: (err) => {
        console.error('Failed to validate coupons', err);
        this.validating = false;
      }
    });
  }

  private mapCart(): any {
    return {
      currency: this.cart.currency || 'EUR',
      subtotalCents: this.cart.subtotalCents || this.calculateSubtotal(),
      customerEmail: this.cart.customerEmail,
      items: this.cart.items.map((item: any) => ({
        productId: item.productId || item.id,
        productName: item.name || item.title || item.productName,
        priceCents: item.priceCents || item.price * 100,
        quantity: item.quantity,
        categoryIds: item.categoryIds || [],
        collectionIds: item.collectionIds || []
      }))
    };
  }

  private calculateSubtotal(): number {
    return this.cart.items.reduce((sum: number, item: any) => {
      const price = item.priceCents || item.price * 100;
      return sum + (price * item.quantity);
    }, 0);
  }

  getTotalDiscount(): number {
    return this.appliedCoupons.reduce((sum, c) => sum + c.discountCents, 0);
  }

  formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }
}

