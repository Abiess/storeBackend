import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface GlobalDeliveryOption {
  id?: number;
  name: string;
  description?: string;
  deliveryType: 'PICKUP' | 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  price: number;
  etaMinDays?: number;
  etaMaxDays?: number;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Service for platform-wide global delivery options.
 * Admin: full CRUD via /api/admin/delivery-options (auth required)
 * Public: read-only via /api/public/delivery-options (no auth)
 */
@Injectable({ providedIn: 'root' })
export class PlatformDeliveryService {

  private adminUrl = `${environment.apiUrl}/admin/delivery-options`;
  private publicUrl = `${environment.apiUrl}/public/delivery-options`;

  constructor(private http: HttpClient) {}

  // ── Public (Storefront) ─────────────────────────────────────────────────

  getActiveOptions(): Observable<GlobalDeliveryOption[]> {
    return this.http.get<GlobalDeliveryOption[]>(this.publicUrl);
  }

  // ── Admin (Platform owner) ──────────────────────────────────────────────

  getAllOptions(): Observable<GlobalDeliveryOption[]> {
    return this.http.get<GlobalDeliveryOption[]>(this.adminUrl);
  }

  createOption(option: GlobalDeliveryOption): Observable<GlobalDeliveryOption> {
    return this.http.post<GlobalDeliveryOption>(this.adminUrl, option);
  }

  updateOption(id: number, option: GlobalDeliveryOption): Observable<GlobalDeliveryOption> {
    return this.http.put<GlobalDeliveryOption>(`${this.adminUrl}/${id}`, option);
  }

  deleteOption(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}

