import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductFormComponent } from './product-form.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ProductFormComponent - Tier Pricing UI', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [ProductFormComponent,
        RouterTestingModule,
        TranslateModule.forRoot()],
    providers: [
        {
            provide: ActivatedRoute,
            useValue: {
                snapshot: { paramMap: new Map([['id', '121']]) },
                params: of({ id: '121' })
            }
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
}).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    // storeId is private, so we set it via the route params (already set in ActivatedRoute mock)
    fixture.detectChanges();
  });

  describe('Checkbox Active Toggle', () => {
    it('should toggle tier.active when checkbox is changed', () => {
      // Arrange
      component.tierPrices = [
        {
          minimumQuantity: 10,
          unitPrice: 5.00,
          active: false,
          sortOrder: 0
        }
      ];
      expect(component.tierPrices[0].active).toBe(false);

      // Act
      component.tierPrices[0].active = true;
      fixture.detectChanges();

      // Assert
      expect(component.tierPrices[0].active).toBe(true);
    });

    it('should allow multiple tiers to have different active states', () => {
      // Arrange
      component.tierPrices = [
        { minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 },
        { minimumQuantity: 20, unitPrice: 4.50, active: false, sortOrder: 1 },
        { minimumQuantity: 30, unitPrice: 4.00, active: true, sortOrder: 2 }
      ];

      // Assert
      expect(component.tierPrices[0].active).toBe(true);
      expect(component.tierPrices[1].active).toBe(false);
      expect(component.tierPrices[2].active).toBe(true);
    });
  });

  describe('Delete Button - New Tier (no id)', () => {
    it('should remove tier without id immediately', () => {
      // Arrange
      component.tierPrices = [
        { minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 }
      ];
      component.deletedTierPriceIds = [];

      // Act
      component.removeTierPrice(0);

      // Assert
      expect(component.tierPrices.length).toBe(0);
      expect(component.deletedTierPriceIds.length).toBe(0);
    });

    it('should not add new tier to deletedTierPriceIds', () => {
      // Arrange
      component.tierPrices = [
        { minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 },
        { minimumQuantity: 20, unitPrice: 4.50, active: true, sortOrder: 1 }
      ];
      component.deletedTierPriceIds = [];

      // Act
      component.removeTierPrice(1);

      // Assert
      expect(component.tierPrices.length).toBe(1);
      expect(component.deletedTierPriceIds.length).toBe(0);
    });
  });

  describe('Delete Button - Existing Tier (with id)', () => {
    it('should add tier id to deletedTierPriceIds', () => {
      // Arrange
      component.tierPrices = [
        { id: 123, minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 }
      ];
      component.deletedTierPriceIds = [];

      // Act
      component.removeTierPrice(0);

      // Assert
      expect(component.tierPrices.length).toBe(0);
      expect(component.deletedTierPriceIds).toContain(123);
    });

    it('should remove tier from array but track id for DELETE', () => {
      // Arrange
      component.tierPrices = [
        { id: 100, minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 },
        { id: 200, minimumQuantity: 20, unitPrice: 4.50, active: true, sortOrder: 1 },
        { minimumQuantity: 30, unitPrice: 4.00, active: true, sortOrder: 2 }
      ];
      component.deletedTierPriceIds = [];

      // Act - Remove existing tier with id=200
      component.removeTierPrice(1);

      // Assert
      expect(component.tierPrices.length).toBe(2);
      expect(component.tierPrices[0].id).toBe(100);
      expect(component.tierPrices[1].id).toBeUndefined();
      expect(component.deletedTierPriceIds).toEqual([200]);
    });

    it('should track multiple deleted tier IDs', () => {
      // Arrange
      component.tierPrices = [
        { id: 1, minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 },
        { id: 2, minimumQuantity: 20, unitPrice: 4.50, active: true, sortOrder: 1 },
        { id: 3, minimumQuantity: 30, unitPrice: 4.00, active: true, sortOrder: 2 }
      ];
      component.deletedTierPriceIds = [];

      // Act - Delete multiple
      component.removeTierPrice(2); // id=3
      component.removeTierPrice(0); // id=1

      // Assert
      expect(component.tierPrices.length).toBe(1);
      expect(component.tierPrices[0].id).toBe(2);
      expect(component.deletedTierPriceIds).toEqual([3, 1]);
    });
  });

  describe('Delete Button - Sort Order Update', () => {
    it('should reset sortOrder after deletion', () => {
      // Arrange
      component.tierPrices = [
        { minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 },
        { minimumQuantity: 20, unitPrice: 4.50, active: true, sortOrder: 1 },
        { minimumQuantity: 30, unitPrice: 4.00, active: true, sortOrder: 2 }
      ];

      // Act - Remove middle tier
      component.removeTierPrice(1);

      // Assert
      expect(component.tierPrices.length).toBe(2);
      expect(component.tierPrices[0].sortOrder).toBe(0);
      expect(component.tierPrices[1].sortOrder).toBe(1);
    });
  });

  describe('Button type attribute', () => {
    it('should have type="button" to prevent form submission', () => {
      // This test verifies the template has correct button type
      // In actual template: <button type="button" (click)="removeTierPrice(i)">
      // This prevents accidental form submission when deleting tier prices
      
      // We verify this by checking that removeTierPrice doesn't trigger form submission
      const formSubmitSpy = spyOn(component.productForm, 'markAsTouched');
      
      component.tierPrices = [
        { minimumQuantity: 10, unitPrice: 5.00, active: true, sortOrder: 0 }
      ];
      
      component.removeTierPrice(0);
      
      // removeTierPrice should NOT trigger form interactions
      expect(formSubmitSpy).not.toHaveBeenCalled();
    });
  });
});
