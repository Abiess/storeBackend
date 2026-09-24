import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { DeliveryProvider, CreateDeliveryProviderRequest } from '../models/delivery.model';

@Injectable({
  providedIn: 'root'
})
export class DeliveryProvidersService {
  private providersSubject = new BehaviorSubject<DeliveryProvider[]>([]);
  public providers$ = this.providersSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Lädt alle Lieferanbieter für einen Store
   */
  getProviders(storeId: number): Observable<DeliveryProvider[]> {
    return this.http.get<DeliveryProvider[]>(
      `${environment.apiUrl}/stores/${storeId}/delivery/providers`
    ).pipe(
      tap(providers => this.providersSubject.next(providers))
    );
  }

  /**
   * Lädt einen einzelnen Lieferanbieter
   */
  getProvider(storeId: number, providerId: number): Observable<DeliveryProvider> {
    return this.http.get<DeliveryProvider>(
      `${environment.apiUrl}/stores/${storeId}/delivery/providers/${providerId}`
    );
  }

  /**
   * Erstellt einen neuen Lieferanbieter
   */
  createProvider(
    storeId: number,
    request: CreateDeliveryProviderRequest
  ): Observable<DeliveryProvider> {
    return this.http.post<DeliveryProvider>(
      `${environment.apiUrl}/stores/${storeId}/delivery/providers`,
      request
    ).pipe(
      tap(provider => {
        const current = this.providersSubject.value;
        this.providersSubject.next([...current, provider]);
      })
    );
  }

  /**
   * Aktualisiert einen Lieferanbieter
   */
  updateProvider(
    storeId: number,
    providerId: number,
    request: Partial<CreateDeliveryProviderRequest>
  ): Observable<DeliveryProvider> {
    return this.http.put<DeliveryProvider>(
      `${environment.apiUrl}/stores/${storeId}/delivery/providers/${providerId}`,
      request
    ).pipe(
      tap(updated => {
        const current = this.providersSubject.value;
        const index = current.findIndex(p => p.id === providerId);
        if (index !== -1) {
          current[index] = updated;
          this.providersSubject.next([...current]);
        }
      })
    );
  }

  /**
   * Löscht einen Lieferanbieter
   */
  deleteProvider(storeId: number, providerId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/delivery/providers/${providerId}`
    ).pipe(
      tap(() => {
        const current = this.providersSubject.value;
        this.providersSubject.next(current.filter(p => p.id !== providerId));
      })
    );
  }

  /**
   * Aktiviert/Deaktiviert einen Lieferanbieter
   */
  toggleProviderEnabled(
    storeId: number,
    providerId: number,
    enabled: boolean
  ): Observable<DeliveryProvider> {
    return this.updateProvider(storeId, providerId, { enabled });
  }

  /**
   * Aktualisiert die Priorität eines Lieferanbieters
   */
  updateProviderPriority(
    storeId: number,
    providerId: number,
    priority: number
  ): Observable<DeliveryProvider> {
    return this.updateProvider(storeId, providerId, { priority });
  }

  /**
   * Räumt den State auf
   */
  clearState(): void {
    this.providersSubject.next([]);
  }
}

