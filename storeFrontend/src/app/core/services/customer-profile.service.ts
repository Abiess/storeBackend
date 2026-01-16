import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { catchError } from 'rxjs/operators';

export interface CustomerProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  defaultShippingAddress?: Address;
  defaultBillingAddress?: Address;
  createdAt: string;
}

export interface Address {
  id?: number;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderHistory {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerProfileService {
  constructor(private http: HttpClient) {}

  /**
   * Holt den JWT Token aus localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Erstellt HTTP Headers mit Authorization Token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Lädt das Kundenprofil
   */
  getProfile(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>(
      `${environment.publicApiUrl}/customer/profile`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Laden des Profils:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Aktualisiert das Kundenprofil
   */
  updateProfile(profile: Partial<CustomerProfile>): Observable<CustomerProfile> {
    return this.http.put<CustomerProfile>(
      `${environment.publicApiUrl}/customer/profile`,
      profile,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Aktualisieren des Profils:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ändert das Passwort
   */
  changePassword(request: PasswordChangeRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.publicApiUrl}/customer/change-password`,
      request,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Ändern des Passworts:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lädt die Bestellhistorie des Kunden
   */
  getOrderHistory(email: string): Observable<OrderHistory[]> {
    return this.http.get<OrderHistory[]>(
      `${environment.publicApiUrl}/customer/orders?email=${email}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Laden der Bestellhistorie:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lädt eine spezifische Bestellung
   */
  getOrderDetails(orderNumber: string, email: string): Observable<any> {
    return this.http.get(
      `${environment.publicApiUrl}/orders/${orderNumber}?email=${email}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Laden der Bestelldetails:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Speichert eine Adresse
   */
  saveAddress(address: Address, type: 'shipping' | 'billing'): Observable<Address> {
    return this.http.post<Address>(
      `${environment.publicApiUrl}/customer/addresses/${type}`,
      address,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`❌ Fehler beim Speichern der ${type}-Adresse:`, error);
        return throwError(() => error);
      })
    );
  }
}

