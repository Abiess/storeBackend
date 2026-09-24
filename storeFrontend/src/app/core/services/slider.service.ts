import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface SliderImage {
  id: number;
  storeId: number;
  imageUrl: string;
  imageType: string;
  displayOrder: number;
  isActive: boolean;
  altText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SliderService {
  constructor(private http: HttpClient) {}

  /**
   * Holt aktive Slider-Bilder für die Storefront
   * WICHTIG: Cache-Control Header verhindert Browser-Caching
   */
  getActiveSliderImages(storeId: number): Observable<SliderImage[]> {
    // Füge Timestamp hinzu um Browser-Cache zu umgehen
    const timestamp = new Date().getTime();
    return this.http.get<SliderImage[]>(
      `${environment.apiUrl}/stores/${storeId}/slider/active?t=${timestamp}`
    );
  }
}

