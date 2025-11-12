import { Observable, of, delay } from 'rxjs';
import { Order, OrderStatus } from '../models';
import { MOCK_ORDERS } from './mock-data';

export class MockOrderService {
  private orders: Order[] = [...MOCK_ORDERS];

  getOrders(storeId: number, status?: OrderStatus): Observable<Order[]> {
    let filtered = this.orders;
    if (status) {
      filtered = this.orders.filter(o => o.status === status);
    }
    return of(filtered).pipe(delay(500));
  }

  getOrder(storeId: number, orderId: number): Observable<Order> {
    const order = this.orders.find(o => o.id === orderId);
    return of(order!).pipe(delay(300));
  }

  updateOrderStatus(storeId: number, orderId: number, status: OrderStatus, note?: string): Observable<Order> {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      if (note) {
        order.notes = (order.notes || '') + '\n' + note;
      }
    }
    return of(order!).pipe(delay(500));
  }

  getOrderHistory(storeId: number, orderId: number): Observable<any[]> {
    const history = [
      {
        id: 1,
        status: OrderStatus.PENDING,
        note: 'Bestellung erstellt',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 2,
        status: OrderStatus.CONFIRMED,
        note: 'Bestellung bestätigt',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    return of(history).pipe(delay(300));
  }
}

