import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MockProductOptionService } from '../mocks/mock-product-option.service';

export interface ProductOption {
  id: number;
  productId: number;
  name: string;
  displayName: string;
  type: 'SELECT' | 'RADIO' | 'CHECKBOX';
  required: boolean;
  sortOrder: number;
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: number;
  optionId: number;
  value: string;
  displayValue: string;
  priceAdjustment: number;
  sortOrder: number;
}

export interface CreateProductOptionRequest {
  name: string;
  displayName: string;
  type: 'SELECT' | 'RADIO' | 'CHECKBOX';
  required: boolean;
  sortOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductOptionService {
  private mockService = new MockProductOptionService();

  constructor(private http: HttpClient) {}

  getOptions(storeId: number, productId: number): Observable<ProductOption[]> {
    if (environment.useMockData) {
      return this.mockService.getOptions(storeId, productId);
    }
    return this.http.get<ProductOption[]>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options`
    );
  }

  createOption(storeId: number, productId: number, option: CreateProductOptionRequest): Observable<ProductOption> {
    if (environment.useMockData) {
      return this.mockService.createOption(storeId, productId, option);
    }
    return this.http.post<ProductOption>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options`,
      option
    );
  }

  updateOption(storeId: number, productId: number, optionId: number, option: Partial<ProductOption>): Observable<ProductOption> {
    if (environment.useMockData) {
      return this.mockService.updateOption(storeId, productId, optionId, option);
    }
    return this.http.put<ProductOption>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`,
      option
    );
  }

  deleteOption(storeId: number, productId: number, optionId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteOption(storeId, productId, optionId);
    }
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`
    );
  }
}
