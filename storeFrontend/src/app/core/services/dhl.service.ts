import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DhlValidateRequest {
  // Optional: Override Order Paketdaten
  packageWeightGrams?: number;
  packageLengthMm?: number;
  packageWidthMm?: number;
  packageHeightMm?: number;
}

export interface DhlValidateResponse {
  success: boolean;
  validation?: string;  // SUCCESS | VALIDATION_FAILED
  shipmentNo?: string | null;
  routingCode?: string | null;
  labelUrl?: string | null;
  validationMessages?: any[];
  status?: {
    status: number;
    detail: string;
  };
  error?: string;
  messageKey?: string;
  message?: string;
  dhlStatus?: number;
  dhlDetail?: string;
}

export interface DhlLabelResponse {
  success: boolean;
  labelUrl?: string;
  shipmentNo?: string;
  routingCode?: string;
  error?: string;
  messageKey?: string;
  message?: string;
  dhlStatus?: number;
  dhlDetail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DhlService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * DHL Sendung validieren (kein Label, keine Kosten)
   */
  validateShipment(storeId: number, orderId: number, request?: DhlValidateRequest): Observable<DhlValidateResponse> {
    const url = `${this.baseUrl}/api/admin/orders/${orderId}/dhl/validate`;
    return this.http.post<DhlValidateResponse>(url, request || {});
  }

  /**
   * Live DHL Label erstellen (Kosten!)
   */
  createLabel(storeId: number, orderId: number, request?: DhlValidateRequest): Observable<DhlLabelResponse> {
    const url = `${this.baseUrl}/api/admin/orders/${orderId}/dhl/label`;
    return this.http.post<DhlLabelResponse>(url, request || {});
  }
}
