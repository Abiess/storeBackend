import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RevenueSummary, TopProduct, OrderStats } from '../models/analytics';

/**
 * Analytics Service
 * 
 * Liefert aggregierte Kennzahlen für Store-Owner Dashboard
 * Backend: AnalyticsController (/api/stores/{storeId}/analytics/...)
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Umsatz-Zusammenfassung
   * 
   * @param storeId Store-ID
   * @param from Start-Datum (ISO-8601: YYYY-MM-DD), optional
   * @param to End-Datum (ISO-8601: YYYY-MM-DD), optional
   * @returns RevenueSummary Observable
   */
  getSummary(
    storeId: number,
    from?: string,
    to?: string
  ): Observable<RevenueSummary> {
    let params = new HttpParams();
    
    // Query-Parameter nur mitsenden, wenn sie gesetzt sind
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<RevenueSummary>(
      `${this.apiUrl}/stores/${storeId}/analytics/summary`,
      { params }
    );
  }

  /**
   * Top-Produkte nach Umsatz
   * 
   * @param storeId Store-ID
   * @param from Start-Datum (ISO-8601: YYYY-MM-DD), optional
   * @param to End-Datum (ISO-8601: YYYY-MM-DD), optional
   * @param limit Anzahl Produkte (1-100, Default: 5)
   * @returns TopProduct[] Observable
   */
  getTopProducts(
    storeId: number,
    from?: string,
    to?: string,
    limit = 5
  ): Observable<TopProduct[]> {
    let params = new HttpParams();
    
    // Query-Parameter nur mitsenden, wenn sie gesetzt sind
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    params = params.set('limit', limit.toString());

    return this.http.get<TopProduct[]>(
      `${this.apiUrl}/stores/${storeId}/analytics/top-products`,
      { params }
    );
  }

  /**
   * Bestellstatistiken
   * 
   * @param storeId Store-ID
   * @param from Start-Datum (ISO-8601: YYYY-MM-DD), optional
   * @param to End-Datum (ISO-8601: YYYY-MM-DD), optional
   * @returns OrderStats Observable
   */
  getOrderStats(
    storeId: number,
    from?: string,
    to?: string
  ): Observable<OrderStats> {
    let params = new HttpParams();
    
    // Query-Parameter nur mitsenden, wenn sie gesetzt sind
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<OrderStats>(
      `${this.apiUrl}/stores/${storeId}/analytics/order-stats`,
      { params }
    );
  }
}
