import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Media } from '../models';

export interface UploadMediaResponse {
  mediaId: number;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface AddMediaToProductRequest {
  mediaId: number;
  isPrimary: boolean;
  sortOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  constructor(private http: HttpClient) {}

  /**
   * Upload media mit Fortschrittsanzeige
   */
  uploadMediaWithProgress(storeId: number, file: File, mediaType: string = 'PRODUCT_IMAGE'): Observable<{ progress: number; response?: UploadMediaResponse }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);

    const req = new HttpRequest('POST', `${environment.apiUrl}/stores/${storeId}/media/upload`, formData, {
      reportProgress: true
    });

    return this.http.request<UploadMediaResponse>(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { progress };
        } else if (event.type === HttpEventType.Response) {
          return { progress: 100, response: event.body };
        }
        return { progress: 0 };
      })
    );
  }

  /**
   * Einfacher Upload ohne Fortschritt
   */
  uploadMedia(storeId: number, file: File, mediaType: string = 'PRODUCT_IMAGE'): Observable<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    return this.http.post<UploadMediaResponse>(`${environment.apiUrl}/stores/${storeId}/media/upload`, formData);
  }

  /**
   * Verknüpfe hochgeladenes Bild mit Produkt
   */
  addMediaToProduct(storeId: number, productId: number, request: AddMediaToProductRequest): Observable<any> {
    return this.http.post(`${environment.apiUrl}/stores/${storeId}/products/${productId}/media`, request);
  }

  /**
   * Setze Bild als Hauptbild für Produkt
   */
  setPrimaryImage(storeId: number, productId: number, mediaId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/stores/${storeId}/products/${productId}/media/${mediaId}/set-primary`, {});
  }

  /**
   * Lade alle Bilder eines Produkts
   */
  getProductMedia(storeId: number, productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/media`);
  }

  /**
   * Entferne Bild von Produkt
   */
  removeMediaFromProduct(storeId: number, productId: number, mediaId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/media/${mediaId}`);
  }

  getMedia(storeId: number): Observable<Media[]> {
    return this.http.get<Media[]>(`${environment.apiUrl}/stores/${storeId}/media`);
  }

  deleteMedia(storeId: number, mediaId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/media/${mediaId}`);
  }
}
