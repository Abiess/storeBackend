import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface UnsplashImage {
  id: string;
  description: string;
  thumbUrl: string;
  regularUrl: string;
  authorName: string;
  authorUrl: string;
  downloadLocation: string;
}

export interface UnsplashSuggestionsResponse {
  images: UnsplashImage[];
  configured: boolean;
  page: number;
  message?: string;
}

export interface UnsplashApplyResult {
  saved: number;
  failed: number;
  total: number;
  storeId: number;
}

@Injectable({ providedIn: 'root' })
export class UnsplashService {

  constructor(private http: HttpClient) {}

  /**
   * Sucht Bildvorschläge passend zum businessType.
   * Wird über das Backend geleitet – der Unsplash-Key bleibt serverseitig.
   */
  getSuggestions(
    businessType: string,
    query?: string,
    page = 1
  ): Observable<UnsplashSuggestionsResponse> {
    let params: Record<string, string> = {
      businessType,
      page: String(page)
    };
    if (query && query.trim()) {
      params['query'] = query.trim();
    }
    return this.http.get<UnsplashSuggestionsResponse>(
      `${environment.apiUrl}/assets/suggestions`,
      { params }
    );
  }

  /**
   * Wendet ausgewählte Bilder auf den Store an:
   * Download-Tracking → MinIO → Slider.
   */
  applyImages(
    storeId: number,
    images: Pick<UnsplashImage, 'downloadLocation' | 'regularUrl' | 'description'>[],
    target: 'SLIDER' = 'SLIDER'
  ): Observable<UnsplashApplyResult> {
    return this.http.post<UnsplashApplyResult>(
      `${environment.apiUrl}/assets/suggestions/apply`,
      { storeId, images, target }
    );
  }
}
