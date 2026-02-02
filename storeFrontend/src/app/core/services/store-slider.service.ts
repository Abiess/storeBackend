import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoreSliderSettings {
  id?: number;
  storeId: number;
  overrideMode: 'DEFAULT_ONLY' | 'OWNER_ONLY' | 'MIXED';
  autoplay: boolean;
  durationMs: number;
  transitionMs: number;
  loopEnabled: boolean;
  showDots: boolean;
  showArrows: boolean;
}

export interface StoreSliderImage {
  id?: number;
  storeId: number;
  mediaId?: number;
  imageUrl: string;
  imageType: 'DEFAULT' | 'OWNER_UPLOAD';
  displayOrder: number;
  isActive: boolean;
  altText?: string;
}

export interface StoreSlider {
  settings: StoreSliderSettings;
  images: StoreSliderImage[];
}

@Injectable({
  providedIn: 'root'
})
export class StoreSliderService {
  private apiUrl = `${environment.apiUrl}/api/stores`;

  constructor(private http: HttpClient) {}

  getSlider(storeId: number): Observable<StoreSlider> {
    return this.http.get<StoreSlider>(`${this.apiUrl}/${storeId}/slider`);
  }

  getActiveSliderImages(storeId: number): Observable<StoreSliderImage[]> {
    return this.http.get<StoreSliderImage[]>(`${this.apiUrl}/${storeId}/slider/active`);
  }

  updateSettings(storeId: number, settings: Partial<StoreSliderSettings>): Observable<StoreSliderSettings> {
    return this.http.put<StoreSliderSettings>(`${this.apiUrl}/${storeId}/slider/settings`, settings);
  }

  uploadImage(storeId: number, file: File, altText?: string): Observable<StoreSliderImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) {
      formData.append('altText', altText);
    }
    return this.http.post<StoreSliderImage>(`${this.apiUrl}/${storeId}/slider/images`, formData);
  }

  updateImage(storeId: number, imageId: number, data: Partial<StoreSliderImage>): Observable<StoreSliderImage> {
    return this.http.put<StoreSliderImage>(`${this.apiUrl}/${storeId}/slider/images/${imageId}`, data);
  }

  reorderImages(storeId: number, imageIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${storeId}/slider/images/reorder`, { imageIds });
  }

  deleteImage(storeId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${storeId}/slider/images/${imageId}`);
  }
}

