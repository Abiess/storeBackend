import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { DeliverySettings, CreateDeliverySettingsRequest } from '../models/delivery.model';

@Injectable({
  providedIn: 'root'
})
export class DeliverySettingsService {
  private settingsSubject = new BehaviorSubject<DeliverySettings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Lädt die Liefereinstellungen für einen Store
   */
  getDeliverySettings(storeId: number): Observable<DeliverySettings> {
    return this.http.get<DeliverySettings>(
      `${environment.apiUrl}/stores/${storeId}/delivery/settings`
    ).pipe(
      tap(settings => this.settingsSubject.next(settings))
    );
  }

  /**
   * Erstellt Liefereinstellungen für einen Store
   */
  createDeliverySettings(
    storeId: number,
    request: CreateDeliverySettingsRequest
  ): Observable<DeliverySettings> {
    return this.http.post<DeliverySettings>(
      `${environment.apiUrl}/stores/${storeId}/delivery/settings`,
      request
    ).pipe(
      tap(settings => this.settingsSubject.next(settings))
    );
  }

  /**
   * Aktualisiert Liefereinstellungen
   */
  updateDeliverySettings(
    storeId: number,
    request: Partial<CreateDeliverySettingsRequest>
  ): Observable<DeliverySettings> {
    return this.http.put<DeliverySettings>(
      `${environment.apiUrl}/stores/${storeId}/delivery/settings`,
      request
    ).pipe(
      tap(settings => this.settingsSubject.next(settings))
    );
  }

  /**
   * Löscht Liefereinstellungen
   */
  deleteDeliverySettings(storeId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/delivery/settings`
    ).pipe(
      tap(() => this.settingsSubject.next(null))
    );
  }

  /**
   * Aktiviert/Deaktiviert Lieferung
   */
  toggleDeliveryEnabled(storeId: number, enabled: boolean): Observable<DeliverySettings> {
    return this.updateDeliverySettings(storeId, { enabled });
  }

  /**
   * Räumt den State auf
   */
  clearState(): void {
    this.settingsSubject.next(null);
  }
}

