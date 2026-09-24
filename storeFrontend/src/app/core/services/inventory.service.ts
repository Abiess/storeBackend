import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MockInventoryService } from '../mocks/mock-inventory.service';

export interface InventoryLog {
  id: number;
  variantId: number;
  productName: string;
  variantName: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  notes?: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface AdjustInventoryRequest {
  quantityChange: number;
  reason: string;
  notes?: string;
}

export interface AdjustInventoryResponse {
  success: boolean;
  log: InventoryLog;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private mockService = new MockInventoryService();

  constructor(private http: HttpClient) {}

  getStoreLogs(storeId: number): Observable<InventoryLog[]> {
    if (environment.useMockData) {
      return this.mockService.getStoreLogs(storeId);
    }
    return this.http.get<InventoryLog[]>(`${environment.apiUrl}/stores/${storeId}/inventory/logs`);
  }

  getVariantLogs(storeId: number, productId: number, variantId: number): Observable<InventoryLog[]> {
    if (environment.useMockData) {
      return this.mockService.getVariantLogs(storeId, productId, variantId);
    }
    return this.http.get<InventoryLog[]>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}/inventory/logs`
    );
  }

  adjustInventory(
    storeId: number,
    productId: number,
    variantId: number,
    request: AdjustInventoryRequest
  ): Observable<AdjustInventoryResponse> {
    if (environment.useMockData) {
      return this.mockService.adjustInventory(storeId, productId, variantId, request);
    }
    return this.http.post<AdjustInventoryResponse>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}/inventory/adjust`,
      request
    );
  }
}
