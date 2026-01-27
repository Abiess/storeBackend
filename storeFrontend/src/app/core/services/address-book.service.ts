import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CustomerAddress {
  id?: number;
  customerId?: number;
  addressType: 'SHIPPING' | 'BILLING' | 'BOTH';
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AddressBookService {
  private apiUrl = `${environment.apiUrl}/api/customer/addresses`;

  constructor(private http: HttpClient) {}

  /**
   * Alle Adressen des Kunden abrufen
   */
  getAddresses(): Observable<CustomerAddress[]> {
    return this.http.get<CustomerAddress[]>(this.apiUrl);
  }

  /**
   * Adressen nach Typ filtern
   */
  getAddressesByType(type: 'SHIPPING' | 'BILLING'): Observable<CustomerAddress[]> {
    return this.http.get<CustomerAddress[]>(`${this.apiUrl}/type/${type}`);
  }

  /**
   * Standard-Adresse nach Typ abrufen
   */
  getDefaultAddress(type: 'SHIPPING' | 'BILLING'): Observable<CustomerAddress> {
    return this.http.get<CustomerAddress>(`${this.apiUrl}/default/${type}`);
  }

  /**
   * Neue Adresse erstellen
   */
  createAddress(address: CustomerAddress): Observable<CustomerAddress> {
    return this.http.post<CustomerAddress>(this.apiUrl, address);
  }

  /**
   * Adresse aktualisieren
   */
  updateAddress(addressId: number, address: CustomerAddress): Observable<CustomerAddress> {
    return this.http.put<CustomerAddress>(`${this.apiUrl}/${addressId}`, address);
  }

  /**
   * Als Standard-Adresse festlegen
   */
  setAsDefault(addressId: number): Observable<CustomerAddress> {
    return this.http.put<CustomerAddress>(`${this.apiUrl}/${addressId}/set-default`, {});
  }

  /**
   * Adresse löschen
   */
  deleteAddress(addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${addressId}`);
  }
}

