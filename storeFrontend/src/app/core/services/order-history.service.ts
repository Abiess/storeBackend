import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { OrderHistoryFilter, OrderHistoryResponse, OrderDetail, Order } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Bestellhistorie mit Filter abrufen
   */
  getOrderHistory(filter: OrderHistoryFilter): Observable<OrderHistoryResponse> {
    let params = new HttpParams();

    if (filter.status) params = params.set('status', filter.status);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.searchTerm) params = params.set('search', filter.searchTerm);
    if (filter.page !== undefined) params = params.set('page', filter.page.toString());
    if (filter.size !== undefined) params = params.set('size', filter.size.toString());
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    return this.http.get<OrderHistoryResponse>(
      `${this.apiUrl}/stores/${filter.storeId}/customers/${filter.customerId}/order-history`,
      { params }
    );
  }

  /**
   * Detaillierte Bestellinformationen abrufen
   */
  getOrderDetail(storeId: number, orderId: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/detail`);
  }

  /**
   * Bestellung stornieren (falls möglich)
   */
  cancelOrder(storeId: number, orderId: number, reason?: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/cancel`, { reason });
  }

  /**
   * Bestellung erneut aufgeben (Reorder)
   */
  reorderOrder(storeId: number, orderId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/reorder`, {});
  }

  /**
   * Retoure anfordern
   */
  requestReturn(storeId: number, orderId: number, items: number[], reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/return`, {
      itemIds: items,
      reason
    });
  }

  /**
   * Rechnung herunterladen
   */
  downloadInvoice(storeId: number, orderId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/invoice`, {
      responseType: 'blob'
    });
  }

  /**
   * Tracking-Informationen abrufen
   */
  getTrackingInfo(storeId: number, orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stores/${storeId}/orders/${orderId}/tracking`);
  }

  /**
   * Kundenstatistiken abrufen
   */
  getCustomerStats(storeId: number, customerId: number): Observable<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/stores/${storeId}/customers/${customerId}/stats`);
  }
}
