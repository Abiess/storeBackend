import { Observable, of, delay } from 'rxjs';
import { ProductMedia, AddProductMediaRequest } from '../services/product-media.service';
import { MOCK_MEDIA } from './mock-data';

let mockProductMedia: ProductMedia[] = [
  {
    id: 1,
    productId: 1,
    mediaId: 1,
    media: {
      id: 1,
      filename: 'laptop-silver.jpg',
      url: 'https://via.placeholder.com/800x600/silver/000000?text=Laptop+Silver',
      mimeType: 'image/jpeg'
    },
    isPrimary: true,
    sortOrder: 1
  },
  {
    id: 2,
    productId: 2,
    mediaId: 2,
    media: {
      id: 2,
      filename: 'mouse-black.jpg',
      url: 'https://via.placeholder.com/800x600/black/ffffff?text=Wireless+Mouse',
      mimeType: 'image/jpeg'
    },
    isPrimary: true,
    sortOrder: 1
  }
];

let nextProductMediaId = 3;

export class MockProductMediaService {
  getProductMedia(storeId: number, productId: number): Observable<ProductMedia[]> {
    const media = mockProductMedia.filter(pm => pm.productId === productId);
    return of(media).pipe(delay(300));
  }

  addMedia(storeId: number, productId: number, request: AddProductMediaRequest): Observable<ProductMedia> {
    const media = MOCK_MEDIA.find(m => m.id === request.mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    const newProductMedia: ProductMedia = {
      id: nextProductMediaId++,
      productId,
      mediaId: request.mediaId,
      media: {
        id: media.id,
        filename: media.filename,
        url: media.url,
        mimeType: media.mimeType
      },
      isPrimary: request.isPrimary || false,
      sortOrder: request.sortOrder || 0
    };

    mockProductMedia.push(newProductMedia);
    return of(newProductMedia).pipe(delay(300));
  }

  updateMedia(storeId: number, productId: number, mediaId: number, updates: Partial<ProductMedia>): Observable<ProductMedia> {
    const productMedia = mockProductMedia.find(pm => pm.id === mediaId && pm.productId === productId);
    if (productMedia) {
      Object.assign(productMedia, updates);
      return of(productMedia).pipe(delay(300));
    }
    throw new Error('Product media not found');
  }

  setPrimary(storeId: number, productId: number, mediaId: number): Observable<ProductMedia> {
    // Setze alle anderen auf nicht-primär
    mockProductMedia.forEach(pm => {
      if (pm.productId === productId) {
        pm.isPrimary = false;
      }
    });

    // Setze das gewählte auf primär
    const productMedia = mockProductMedia.find(pm => pm.id === mediaId && pm.productId === productId);
    if (productMedia) {
      productMedia.isPrimary = true;
      return of(productMedia).pipe(delay(300));
    }
    throw new Error('Product media not found');
  }

  removeMedia(storeId: number, productId: number, mediaId: number): Observable<void> {
    const index = mockProductMedia.findIndex(pm => pm.id === mediaId && pm.productId === productId);
    if (index !== -1) {
      mockProductMedia.splice(index, 1);
    }
    return of(void 0).pipe(delay(300));
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

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
  constructor(private http: HttpClient) {}

  getOptions(storeId: number, productId: number): Observable<ProductOption[]> {
    return this.http.get<ProductOption[]>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options`
    );
  }

  createOption(storeId: number, productId: number, option: CreateProductOptionRequest): Observable<ProductOption> {
    return this.http.post<ProductOption>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options`,
      option
    );
  }

  updateOption(storeId: number, productId: number, optionId: number, option: Partial<ProductOption>): Observable<ProductOption> {
    return this.http.put<ProductOption>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`,
      option
    );
  }

  deleteOption(storeId: number, productId: number, optionId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`
    );
  }
}

