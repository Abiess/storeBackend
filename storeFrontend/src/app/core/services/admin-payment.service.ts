import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaymentSettingsDTO, PaymentSettingsUpdateRequest } from '../models/payment-settings.model';

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Lade PayPal-Settings für einen Store
   */
  getPayPalSettings(storeId: number): Observable<PaymentSettingsDTO> {
    return this.http.get<PaymentSettingsDTO>(`${this.apiUrl}/stores/${storeId}/admin/payment-settings/paypal`);
  }

  /**
   * Aktualisiere PayPal-Settings (aktivieren/deaktivieren)
   */
  updatePayPalSettings(storeId: number, request: PaymentSettingsUpdateRequest): Observable<PaymentSettingsDTO> {
    return this.http.put<PaymentSettingsDTO>(`${this.apiUrl}/stores/${storeId}/admin/payment-settings/paypal`, request);
  }

  /**
   * Prüfe Verbindungsstatus (globale Credentials vorhanden?)
   */
  checkConnection(storeId: number): Observable<PaymentSettingsDTO> {
    return this.http.post<PaymentSettingsDTO>(`${this.apiUrl}/stores/${storeId}/admin/payment-settings/paypal/check-connection`, {});
  }
}
