import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AppKey, AppAccessMode } from '../models';

/**
 * App Provisioning Phase 1 (Platform Administration).
 *
 * Dünner HTTP-Client-Wrapper für die neuen Backend-Endpunkte unter
 * `/api/admin/app-provisioning/**` (siehe `AppProvisioningController`,
 * ARCHITECTURE_APP_FACTORY.md Abschnitt 14/15). Nur für
 * `ROLE_PLATFORM_ADMIN` nutzbar (Backend erzwingt dies via
 * `@PreAuthorize`, das Frontend zusätzlich via `platformAdminGuard`).
 */
export interface AdminUserSummary {
  id: number;
  email: string;
  name?: string | null;
  appAccessMode: AppAccessMode;
}

export interface AdminEntitlement {
  id: number;
  app: AppKey;
  scope: 'STORE' | 'GLOBAL';
  storeId: number | null;
  storeName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserEntitlements {
  userId: number;
  userEmail: string;
  appAccessMode: AppAccessMode;
  entitlements: AdminEntitlement[];
}

export interface AdminStoreSummary {
  id: number;
  name: string;
  slug: string;
  ownerEmail: string | null;
  businessType: string;
}

export interface UpsertEntitlementRequest {
  app: AppKey;
  storeId: number | null;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppProvisioningService {
  private apiUrl = `${environment.apiUrl}/admin/app-provisioning`;

  constructor(private http: HttpClient) {}

  /** GET /api/admin/app-provisioning/users?query=... */
  searchUsers(query: string): Observable<AdminUserSummary[]> {
    return this.http.get<AdminUserSummary[]>(`${this.apiUrl}/users`, {
      params: { query: query ?? '' }
    });
  }

  /** GET /api/admin/app-provisioning/users/{userId}/entitlements */
  getUserEntitlements(userId: number): Observable<AdminUserEntitlements> {
    return this.http.get<AdminUserEntitlements>(`${this.apiUrl}/users/${userId}/entitlements`);
  }

  /**
   * PUT /api/admin/app-provisioning/users/{userId}/entitlements
   * Legt ein Entitlement an oder aktualisiert es (Upsert für App+Store).
   * ACHTUNG: Ist der User aktuell LEGACY, macht der ERSTE Aufruf dieser
   * Methode ihn userweit MANAGED - siehe Warnhinweis in der Komponente.
   */
  upsertEntitlement(userId: number, request: UpsertEntitlementRequest): Observable<AdminEntitlement> {
    return this.http.put<AdminEntitlement>(`${this.apiUrl}/users/${userId}/entitlements`, request);
  }

  /** PATCH /api/admin/app-provisioning/users/{userId}/entitlements/{entitlementId} (Soft-Disable/-Enable) */
  patchEntitlement(userId: number, entitlementId: number, enabled: boolean): Observable<AdminEntitlement> {
    return this.http.patch<AdminEntitlement>(
      `${this.apiUrl}/users/${userId}/entitlements/${entitlementId}`,
      { enabled }
    );
  }

  /** GET /api/admin/app-provisioning/stores?query=... (Context-Auswahl für STORE-Apps) */
  searchStores(query: string): Observable<AdminStoreSummary[]> {
    return this.http.get<AdminStoreSummary[]>(`${this.apiUrl}/stores`, {
      params: { query: query ?? '' }
    });
  }
}
