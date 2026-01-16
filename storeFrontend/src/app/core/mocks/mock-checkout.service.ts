import { Observable, of, delay, throwError } from 'rxjs';
import { CheckoutRequest, CheckoutResponse, OrderDetails } from '../services/checkout.service';
import { MockCartService } from './mock-cart.service';

const mockCartService = new MockCartService();

let mockOrders: OrderDetails[] = [];
let nextOrderId = 1000;

export class MockCheckoutService {
  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    // Hole Warenkorb mit storeId
    let cart: any;
    mockCartService.getCart(request.storeId).subscribe(c => cart = c);

    if (!cart || cart.items.length === 0) {
      return throwError(() => new Error('Warenkorb ist leer'));
    }

    // Erstelle Bestellnummer
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(nextOrderId).padStart(5, '0')}`;
    const orderId = nextOrderId++;

    // Berechne Gesamt
    const total = cart.subtotal;

    // Erstelle Order-Items
    const items = cart.items.map((item: any) => ({
      id: item.id,
      productName: item.productTitle || item.productName,
      variantName: 'Standard',
      quantity: item.quantity,
      priceAtOrder: item.priceSnapshot,
      subtotal: item.priceSnapshot * item.quantity
    }));

    // Erstelle Bestellung
    const order: OrderDetails = {
      id: orderId,
      orderNumber,
      customerEmail: request.customerEmail,  // FIXED: customerEmail hinzugefügt
      customer: {
        id: 0, // Mock customer ID
        email: request.customerEmail
      },
      status: 'PENDING',
      totalAmount: total,
      shippingAddress: request.shippingAddress,
      billingAddress: request.billingAddress,
      items: items.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        variantName: 'Standard',
        quantity: item.quantity,
        price: item.priceSnapshot,  // FIXED: price statt priceAtOrder
        subtotal: item.priceSnapshot * item.quantity
      })),
      notes: request.notes,
      createdAt: new Date().toISOString()
    };

    mockOrders.push(order);

    // Leere Warenkorb mit storeId
    mockCartService.clearCart(request.storeId).subscribe();

    const response: CheckoutResponse = {
      orderId,
      orderNumber,
      status: 'PENDING',
      total,
      customerEmail: request.customerEmail,
      message: 'Bestellung erfolgreich aufgegeben'
    };

    return of(response).pipe(delay(800));
  }

  getOrderByNumber(orderNumber: string, email: string): Observable<OrderDetails> {
    const order = mockOrders.find(
      o => o.orderNumber === orderNumber && o.customer?.email.toLowerCase() === email.toLowerCase()
    );

    if (!order) {
      return throwError(() => new Error('Bestellung nicht gefunden oder E-Mail stimmt nicht überein'));
    }

    return of(order).pipe(delay(300));
  }
}
