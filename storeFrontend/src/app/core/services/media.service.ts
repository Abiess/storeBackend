import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Media } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  constructor(private http: HttpClient) {}

  uploadMedia(storeId: number, file: File): Observable<Media> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Media>(`${environment.apiUrl}/stores/${storeId}/media/upload`, formData);
  }

  getMedia(storeId: number): Observable<Media[]> {
    return this.http.get<Media[]>(`${environment.apiUrl}/stores/${storeId}/media`);
  }

  deleteMedia(storeId: number, mediaId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/media/${mediaId}`);
  }
}

