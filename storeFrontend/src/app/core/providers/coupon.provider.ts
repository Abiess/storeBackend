import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CouponService } from '../services/coupon.service';
import { MockCouponService } from '../mocks/mock-coupon.service';

export function provideCouponService(): Provider {
  return {
    provide: CouponService,
    useClass: environment.useMockData ? MockCouponService : CouponService
  };
}

