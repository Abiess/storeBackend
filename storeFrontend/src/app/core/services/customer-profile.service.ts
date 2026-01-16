import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CustomerProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  defaultShippingAddress?: Address;
  defaultBillingAddress?: Address;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveAddressRequest {
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

export interface OrderHistory {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  total: number;
  items: OrderHistoryItem[];
}

export interface OrderHistoryItem {
  productName: string;
  quantity: number;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerProfileService {
  private apiUrl = `${environment.publicApiUrl}/customer`;

  constructor(private http: HttpClient) {}

  /**
   * Lädt das Customer Profile des eingeloggten Users
   */
  getProfile(): Observable<CustomerProfile> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Lade Customer Profile');
    return this.http.get<CustomerProfile>(`${this.apiUrl}/profile`, { headers });
  }

  /**
   * Speichert die Adressen des Customers
   */
  saveAddress(request: SaveAddressRequest): Observable<CustomerProfile> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('💾 Speichere Adressen');
    return this.http.post<CustomerProfile>(`${this.apiUrl}/profile/address`, request, { headers });
  }

  /**
   * Aktualisiert das Customer Profile
   */
  updateProfile(request: UpdateProfileRequest): Observable<CustomerProfile> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('📝 Aktualisiere Customer Profile');
    return this.http.put<CustomerProfile>(`${this.apiUrl}/profile`, request, { headers });
  }

  /**
   * Ändert das Passwort des Customers
   */
  changePassword(request: PasswordChangeRequest): Observable<any> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('🔒 Ändere Passwort');
    return this.http.post<any>(`${this.apiUrl}/change-password`, request, { headers });
  }

  /**
   * Lädt die Bestellhistorie des Customers
   */
  getOrderHistory(email: string): Observable<OrderHistory[]> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Lade Bestellhistorie für:', email);
    return this.http.get<OrderHistory[]>(`${this.apiUrl}/orders?email=${encodeURIComponent(email)}`, { headers });
  }
}
