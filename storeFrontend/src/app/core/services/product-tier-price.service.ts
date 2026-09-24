import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductTierPrice {
  id?: number;
  productId: number;
  minimumQuantity: number;
  unitPrice: number;
  label?: string | null;
  active: boolean;
  sortOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductTierPriceService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Lädt alle Staffelpreise für ein Produkt
   */
  getTierPrices(storeId: number, productId: number): Observable<ProductTierPrice[]> {
    return this.http.get<ProductTierPrice[]>(
      `${this.baseUrl}/stores/${storeId}/products/${productId}/tier-prices`
    );
  }

  /**
   * Erstellt einen neuen Staffelpreis
   */
  createTierPrice(storeId: number, productId: number, tierPrice: Partial<ProductTierPrice>): Observable<ProductTierPrice> {
    return this.http.post<ProductTierPrice>(
      `${this.baseUrl}/stores/${storeId}/products/${productId}/tier-prices`,
      tierPrice
    );
  }

  /**
   * Aktualisiert einen bestehenden Staffelpreis
   */
  updateTierPrice(storeId: number, productId: number, tierPriceId: number, tierPrice: Partial<ProductTierPrice>): Observable<ProductTierPrice> {
    return this.http.put<ProductTierPrice>(
      `${this.baseUrl}/stores/${storeId}/products/${productId}/tier-prices/${tierPriceId}`,
      tierPrice
    );
  }

  /**
   * Löscht einen Staffelpreis
   */
  deleteTierPrice(storeId: number, productId: number, tierPriceId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/stores/${storeId}/products/${productId}/tier-prices/${tierPriceId}`
    );
  }
}
