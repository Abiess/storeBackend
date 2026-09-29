import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface CreateStoreCustomerAccountRequest {
  name: string;
  phone?: string;
  password: string;
}

export interface StoreCustomerAccountCreated {
  loginId: string;
  name: string;
  phone?: string | null;
}

@Injectable({ providedIn: 'root' })
export class StoreCustomerAccountService {
  constructor(private http: HttpClient) {}

  create(storeId: number, request: CreateStoreCustomerAccountRequest): Observable<StoreCustomerAccountCreated> {
    return this.http.post<StoreCustomerAccountCreated>(
      `${environment.apiUrl}/stores/${storeId}/customer-accounts`,
      request
    );
  }
}
