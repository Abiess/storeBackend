import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export interface InviteOrderSummary {
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  currencyCode: string;
  itemCount: number;
}

export interface InviteOrderLine {
  productName: string;
  sku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  imageUrl: string | null;
}

export interface InviteOrderDetail extends InviteOrderSummary {
  items: InviteOrderLine[];
}

@Injectable({ providedIn: 'root' })
export class InviteOrderService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  list(storeId: number): Observable<InviteOrderSummary[]> {
    return this.http.get<InviteOrderSummary[]>(this.url(storeId), { headers: this.headers() });
  }

  detail(storeId: number, orderNumber: string): Observable<InviteOrderDetail> {
    return this.http.get<InviteOrderDetail>(
      `${this.url(storeId)}/${encodeURIComponent(orderNumber)}`,
      { headers: this.headers() }
    );
  }

  private url(storeId: number): string {
    return `${environment.publicApiUrl}/customer/stores/${storeId}/orders`;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken() ?? ''}` });
  }
}
