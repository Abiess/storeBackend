import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { DeliveryZone, CreateDeliveryZoneRequest, DeliveryRate } from '../models/delivery.model';

@Injectable({
  providedIn: 'root'
})
export class DeliveryZonesService {
  private zonesSubject = new BehaviorSubject<DeliveryZone[]>([]);
  public zones$ = this.zonesSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Lädt alle Lieferzonen für einen Store
   */
  getZones(storeId: number): Observable<DeliveryZone[]> {
    return this.http.get<DeliveryZone[]>(
      `${environment.apiUrl}/stores/${storeId}/delivery/zones`
    ).pipe(
      tap(zones => this.zonesSubject.next(zones))
    );
  }

  /**
   * Lädt eine einzelne Lieferzone
   */
  getZone(storeId: number, zoneId: number): Observable<DeliveryZone> {
    return this.http.get<DeliveryZone>(
      `${environment.apiUrl}/stores/${storeId}/delivery/zones/${zoneId}`
    );
  }

  /**
   * Erstellt eine neue Lieferzone
   */
  createZone(
    storeId: number,
    request: CreateDeliveryZoneRequest
  ): Observable<DeliveryZone> {
    return this.http.post<DeliveryZone>(
      `${environment.apiUrl}/stores/${storeId}/delivery/zones`,
      request
    ).pipe(
      tap(zone => {
        const current = this.zonesSubject.value;
        this.zonesSubject.next([...current, zone]);
      })
    );
  }

  /**
   * Aktualisiert eine Lieferzone
   */
  updateZone(
    storeId: number,
    zoneId: number,
    request: Partial<CreateDeliveryZoneRequest>
  ): Observable<DeliveryZone> {
    return this.http.put<DeliveryZone>(
      `${environment.apiUrl}/stores/${storeId}/delivery/zones/${zoneId}`,
      request
    ).pipe(
      tap(updated => {
        const current = this.zonesSubject.value;
        const index = current.findIndex(z => z.id === zoneId);
        if (index !== -1) {
          current[index] = updated;
          this.zonesSubject.next([...current]);
        }
      })
    );
  }

  /**
   * Löscht eine Lieferzone
   */
  deleteZone(storeId: number, zoneId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/delivery/zones/${zoneId}`
    ).pipe(
      tap(() => {
        const current = this.zonesSubject.value;
        this.zonesSubject.next(current.filter(z => z.id !== zoneId));
      })
    );
  }

  /**
   * Aktiviert/Deaktiviert eine Lieferzone
   */
  toggleZoneEnabled(
    storeId: number,
    zoneId: number,
    enabled: boolean
  ): Observable<DeliveryZone> {
    return this.updateZone(storeId, zoneId, { enabled });
  }

  /**
   * Aktualisiert die Priorität einer Lieferzone
   */
  updateZonePriority(
    storeId: number,
    zoneId: number,
    priority: number
  ): Observable<DeliveryZone> {
    return this.updateZone(storeId, zoneId, { priority });
  }

  /**
   * Berechnet Lieferkosten für eine Adresse
   */
  calculateDeliveryRate(
    storeId: number,
    country: string,
    postalCode?: string
  ): Observable<DeliveryRate[]> {
    const params: any = { country };
    if (postalCode) {
      params.postalCode = postalCode;
    }
    return this.http.get<DeliveryRate[]>(
      `${environment.apiUrl}/stores/${storeId}/delivery/calculate`,
      { params }
    );
  }

  /**
   * Räumt den State auf
   */
  clearState(): void {
    this.zonesSubject.next([]);
  }
}

