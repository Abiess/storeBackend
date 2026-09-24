import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DhlActivityLog {
  id: number;
  storeId: number;
  parcelId: number | null;
  trackingCode: string;
  action: 'STORED' | 'FOUND' | 'PICKED_UP' | 'SCAN_FAILED' | 'MANUAL_SEARCH' | 'STORAGE_CANCELLED';
  slotSnapshot: string | null;
  userId: number;
  userEmail: string;  // Backend sendet userEmail, nicht userEmailSnapshot!
  durationMs: number | null;
  createdAt: string;
  failureReason?: string | null;  // Phase 3A.3
  cancellationReason?: string | null;  // Phase 3A.4
  cancellationNote?: string | null;    // Phase 3A.4
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
    userId?: number | null
  ): Observable<DhlActivityLogPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (today !== undefined) {
      params = params.set('today', today.toString());
    }
    // Defensive: nur setzen wenn wirklich ein nicht-leerer Wert vorhanden ist.
    // Schützt zusätzlich zur Aufrufer-Seite gegen die Literal-Strings "null"/
    // "undefined" (z.B. durch einen fehlerhaften <option [value]="null">
    // Template-Binding, das Angular als DOM-String statt echtem null liefert).
    if (action && action !== 'null' && action !== 'undefined') {
      params = params.set('action', action);
    }
    if (
      userId !== undefined &&
      userId !== null &&
      String(userId) !== 'null' &&
      String(userId) !== 'undefined' &&
      !Number.isNaN(Number(userId))
    ) {
      params = params.set('userId', String(userId));
    }

    return this.http.get<DhlActivityLogPage>(
      `${this.apiUrl}/stores/${storeId}/dhl/activity-log`,
      { params }
    );
  }
}
