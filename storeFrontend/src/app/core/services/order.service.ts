import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Order, OrderStatus } from '../models';
import { MockOrderService } from '../mocks/mock-order.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private mockService = new MockOrderService();

  constructor(private http: HttpClient) {}

  getOrders(storeId: number, status?: OrderStatus): Observable<Order[]> {
    if (environment.useMockData) {
      return this.mockService.getOrders(storeId, status);
    }
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Order[]>(`${environment.apiUrl}/stores/${storeId}/orders`, { params });
  }

  getOrder(storeId: number, orderId: number): Observable<Order> {
    if (environment.useMockData) {
      return this.mockService.getOrder(storeId, orderId);
    }
    return this.http.get<Order>(`${environment.apiUrl}/stores/${storeId}/orders/${orderId}`);
  }

  updateOrderStatus(storeId: number, orderId: number, status: OrderStatus, note?: string): Observable<Order> {
    if (environment.useMockData) {
      return this.mockService.updateOrderStatus(storeId, orderId, status, note);
    }
    return this.http.put<Order>(`${environment.apiUrl}/stores/${storeId}/orders/${orderId}/status`, { status, note });
  }

  getOrderHistory(storeId: number, orderId: number): Observable<any[]> {
    if (environment.useMockData) {
      return this.mockService.getOrderHistory(storeId, orderId);
    }
    return this.http.get<any[]>(`${environment.apiUrl}/stores/${storeId}/orders/${orderId}/history`);
  }
}
