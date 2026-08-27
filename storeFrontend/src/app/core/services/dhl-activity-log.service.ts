import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DhlActivityLog {
  id: number;
  storeId: number;
  parcelId: number | null;
  trackingCode: string;
  action: 'STORED' | 'FOUND' | 'PICKED_UP' | 'SCAN_FAILED' | 'MANUAL_SEARCH';
  slotSnapshot: string | null;
  userId: number;
  userEmailSnapshot: string;
  durationMs: number | null;
  createdAt: string;
}

export interface DhlActivityLogPage {
  content: DhlActivityLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class DhlActivityLogService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getActivityLog(
    storeId: number,
    page: number = 0,
    size: number = 20,
    today?: boolean,
    action?: string,
    userId?: number
  ): Observable<DhlActivityLogPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (today !== undefined) {
      params = params.set('today', today.toString());
    }
    if (action) {
      params = params.set('action', action);
    }
    if (userId !== undefined && userId !== null) {
      params = params.set('userId', userId.toString());
    }

    return this.http.get<DhlActivityLogPage>(
      `${this.apiUrl}/stores/${storeId}/dhl/activity-log`,
      { params }
    );
  }
}
