import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MockProductMediaService } from '../mocks/mock-product-media.service';

export interface ProductMedia {
  id: number;
  productId: number;
  mediaId: number;
  media: {
    id: number;
    filename: string;
    url: string;
    mimeType: string;
  };
  isPrimary: boolean;
  sortOrder: number;
}

export interface AddProductMediaRequest {
  mediaId: number;
  isPrimary?: boolean;
  sortOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductMediaService {
  private mockService = new MockProductMediaService();

  constructor(private http: HttpClient) {}

  getProductMedia(storeId: number, productId: number): Observable<ProductMedia[]> {
    if (environment.useMockData) {
      return this.mockService.getProductMedia(storeId, productId);
    }
    return this.http.get<ProductMedia[]>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/media`
    );
  }

  addMedia(storeId: number, productId: number, request: AddProductMediaRequest): Observable<ProductMedia> {
    if (environment.useMockData) {
      return this.mockService.addMedia(storeId, productId, request);
    }
    return this.http.post<ProductMedia>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/media`,
      request
    );
  }

  updateMedia(storeId: number, productId: number, mediaId: number, updates: Partial<ProductMedia>): Observable<ProductMedia> {
    if (environment.useMockData) {
      return this.mockService.updateMedia(storeId, productId, mediaId, updates);
    }
    return this.http.put<ProductMedia>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/media/${mediaId}`,
      updates
    );
  }

  setPrimary(storeId: number, productId: number, mediaId: number): Observable<ProductMedia> {
    if (environment.useMockData) {
      return this.mockService.setPrimary(storeId, productId, mediaId);
    }
    return this.http.post<ProductMedia>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/media/${mediaId}/set-primary`,
      {}
    );
  }

  removeMedia(storeId: number, productId: number, mediaId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.removeMedia(storeId, productId, mediaId);
    }
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/media/${mediaId}`
    );
  }
}
