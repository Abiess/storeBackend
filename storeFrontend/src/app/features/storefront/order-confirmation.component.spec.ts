import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { CheckoutService, OrderDetails } from '../../core/services/checkout.service';
import { TranslationService } from '../../core/services/translation.service';
import { OrderConfirmationComponent } from './order-confirmation.component';

describe('OrderConfirmationComponent', () => {
  const order = { orderNumber: 'ORD-123', status: 'PENDING', items: [] } as unknown as OrderDetails;

  function create(queryParams: Record<string, string>) {
    const checkout = jasmine.createSpyObj<CheckoutService>('CheckoutService',
      ['getOrderByNumber', 'getCustomerOrderByNumber']);
    checkout.getOrderByNumber.and.returnValue(of(order));
    checkout.getCustomerOrderByNumber.and.returnValue(of(order));
    const route = { snapshot: { queryParams } } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const translations = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate']);
    translations.translate.and.callFake(key => key);
    const component = new OrderConfirmationComponent(route, router, checkout, translations);
    component.ngOnInit();
    return { component, checkout };
  }

  it('loads an invite-only request without an email through the authenticated order endpoint', () => {
    const { component, checkout } = create({ orderNumber: 'ORD-123', email: '', orderRequest: 'true' });
    expect(checkout.getCustomerOrderByNumber).toHaveBeenCalledOnceWith('ORD-123');
    expect(checkout.getOrderByNumber).not.toHaveBeenCalled();
    expect(component.order).toBe(order);
    expect(component.error).toBe('');
  });

  it('keeps email verification for an ordinary order', () => {
    const { checkout } = create({ orderNumber: 'ORD-123', email: 'customer@example.com' });
    expect(checkout.getOrderByNumber).toHaveBeenCalledOnceWith('ORD-123', 'customer@example.com');
    expect(checkout.getCustomerOrderByNumber).not.toHaveBeenCalled();
  });

  it('rejects an ordinary order without an email', () => {
    const { component, checkout } = create({ orderNumber: 'ORD-123', email: '' });
    expect(component.error).toBe('order.missingInfo');
    expect(checkout.getOrderByNumber).not.toHaveBeenCalled();
  });
});
