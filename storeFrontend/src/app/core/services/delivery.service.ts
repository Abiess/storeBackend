import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DeliveryOptionsRequest, DeliveryOptionsResponse } from '../models';

/**
 * Service for delivery options (public API, no auth required)
 */
@Injectable({
  providedIn: 'root'
})
export class DeliveryService {

  constructor(private http: HttpClient) {}

  /**
   * Get available delivery options for a store and address
   *
   * @param storeId Store ID
   * @param postalCode Postal code (required)
   * @param city City (optional)
   * @param country Country (optional)
   * @returns Observable with delivery options
   */
  getDeliveryOptions(
    storeId: number,
    postalCode: string,
    city?: string,
    country?: string
  ): Observable<DeliveryOptionsResponse> {
    const request: DeliveryOptionsRequest = {
      postalCode: postalCode.trim(),
      city: city?.trim(),
      country: country?.trim()
    };

    return this.http.post<DeliveryOptionsResponse>(
      `${environment.apiUrl}/public/stores/${storeId}/delivery/options`,
      request
    );
  }
}

