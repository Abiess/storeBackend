import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Store, CreateStoreRequest } from '../models';
import { MockStoreService } from '../mocks/mock-store.service';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private mockService = new MockStoreService();

  constructor(private http: HttpClient) {}

  getMyStores(): Observable<Store[]> {
    if (environment.useMockData) {
      return this.mockService.getMyStores();
    }
    return this.http.get<Store[]>(`${environment.apiUrl}/me/stores`);
  }

  createStore(request: CreateStoreRequest): Observable<Store> {
    if (environment.useMockData) {
      return this.mockService.createStore(request);
    }
    return this.http.post<Store>(`${environment.apiUrl}/me/stores`, request);
  }

  getStoreById(storeId: number): Observable<Store> {
    if (environment.useMockData) {
      return this.mockService.getStoreById(storeId);
    }
    return this.http.get<Store>(`${environment.apiUrl}/stores/${storeId}`);
  }

  updateStore(storeId: number, request: Partial<CreateStoreRequest>): Observable<Store> {
    if (environment.useMockData) {
      return this.mockService.updateStore(storeId, request);
    }
    return this.http.put<Store>(`${environment.apiUrl}/stores/${storeId}`, request);
  }

  deleteStore(storeId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteStore(storeId);
    }
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}`);
  }

  checkSlugAvailability(slug: string): Observable<boolean> {
    if (environment.useMockData) {
      // Mock: Slugs mit 'test' sind bereits vergeben
      return new Observable(observer => {
        setTimeout(() => {
          observer.next(!slug.includes('test'));
          observer.complete();
        }, 300);
      });
    }
    return this.http.get<boolean>(`${environment.apiUrl}/stores/check-slug/${slug}`);
  }
}
