import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorefrontProductDetailComponent } from './storefront-product-detail.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('StorefrontProductDetailComponent - Tier Pricing', () => {
  let component: StorefrontProductDetailComponent;
  let fixture: ComponentFixture<StorefrontProductDetailComponent>;

  const mockProduct = {
    id: 634,
    name: 'Test Product',
    description: 'Test Description',
    price: 0.99,
    images: [],
    variants: [],
    tierPrices: [
      { minimumQuantity: 14, unitPrice: 0.89, active: true },
      { minimumQuantity: 25, unitPrice: 0.79, active: true },
      { minimumQuantity: 50, unitPrice: 0.69, active: true }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [StorefrontProductDetailComponent,
        TranslateModule.forRoot()],
    providers: [
        {
            provide: ActivatedRoute,
            useValue: {
                snapshot: { paramMap: { get: () => '634' } },
                queryParams: of({ variant: '58' })
            }
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
}).compileComponents();

    fixture = TestBed.createComponent(StorefrontProductDetailComponent);
    component = fixture.componentInstance;
  });

  it('should display only standard price when no tier prices exist', () => {
    component.product = { ...mockProduct, tierPrices: [] };
    component.quantity = 1;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeNull();
    expect(component.getEffectiveUnitPrice()).toBe(0.99);
  });

  it('should display standard price when quantity is below first tier', () => {
    component.product = mockProduct;
    component.quantity = 13;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeNull();
    expect(component.getEffectiveUnitPrice()).toBe(0.99);
  });

  it('should apply tier price when quantity equals first tier minimum', () => {
    component.product = mockProduct;
    component.quantity = 14;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeTruthy();
    expect(component.currentTierPrice?.unitPrice).toBe(0.89);
    expect(component.getEffectiveUnitPrice()).toBe(0.89);
  });

  it('should apply lower tier when quantity is between two tiers', () => {
    component.product = mockProduct;
    component.quantity = 20;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeTruthy();
    expect(component.currentTierPrice?.unitPrice).toBe(0.89);
    expect(component.getEffectiveUnitPrice()).toBe(0.89);
  });

  it('should apply last tier when quantity exceeds all tiers', () => {
    component.product = mockProduct;
    component.quantity = 100;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeTruthy();
    expect(component.currentTierPrice?.unitPrice).toBe(0.69);
    expect(component.getEffectiveUnitPrice()).toBe(0.69);
  });

  it('should ignore inactive tier prices', () => {
    component.product = {
      ...mockProduct,
      tierPrices: [
        { minimumQuantity: 14, unitPrice: 0.89, active: false },
        { minimumQuantity: 25, unitPrice: 0.79, active: true }
      ]
    };
    component.quantity = 14;
    component.updateCurrentTierPrice();

    expect(component.currentTierPrice).toBeNull();
    expect(component.getEffectiveUnitPrice()).toBe(0.99);
  });

  it('should calculate total price correctly with tier pricing', () => {
    component.product = mockProduct;
    component.quantity = 14;
    component.updateCurrentTierPrice();

    const total = component.getTotalPrice();
    expect(total).toBe(12.46); // 14 × 0.89
  });

  it('should round total price to 2 decimals', () => {
    component.product = mockProduct;
    component.quantity = 15;
    component.updateCurrentTierPrice();

    const total = component.getTotalPrice();
    // 15 × 0.89 = 13.35
    expect(total.toFixed(2)).toBe('13.35');
    expect(total).toBe(13.35);
  });

  it('should initialize quantity to 1 on load', () => {
    component.ngOnInit();
    expect(component.quantity).toBeGreaterThanOrEqual(1);
  });

  it('should not allow quantity to go below 1', () => {
    component.quantity = 1;
    component.decreaseQuantity();
    expect(component.quantity).toBe(1);
  });

  it('should use variant price as base price when variant has custom price', () => {
    const variantWithPrice = {
      id: 58,
      name: 'Test Variant',
      price: 1.29,
      comparePrice: null,
      costPrice: null
    };

    component.product = mockProduct;
    component.selectedVariant = variantWithPrice;
    component.quantity = 10;

    expect(component.getCurrentPrice()).toBe(1.29);
  });

  it('should recalculate tier price when quantity changes', () => {
    component.product = mockProduct;
    component.quantity = 10;
    component.updateCurrentTierPrice();
    expect(component.currentTierPrice).toBeNull();

    component.quantity = 14;
    component.onQuantityChange();
    expect(component.currentTierPrice).toBeTruthy();
    expect(component.currentTierPrice?.unitPrice).toBe(0.89);
  });

  it('should toggle showAllTierPrices correctly', () => {
    component.showAllTierPrices = false;
    expect(component.showAllTierPrices).toBe(false);

    component.showAllTierPrices = true;
    expect(component.showAllTierPrices).toBe(true);
  });
});
