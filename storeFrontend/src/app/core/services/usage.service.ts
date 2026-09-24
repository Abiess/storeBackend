import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface UsageItem {
  used: number;
  /** -1 = unbegrenzt, null = nicht limitiert (z.B. customers) */
  limit: number | null;
  /** 0–100, oder null wenn limit unbegrenzt/nicht gesetzt */
  percent: number | null;
}

export interface UsageStats {
  plan: string;
  stores: UsageItem;
  products: UsageItem;
  storageMb: UsageItem;
  customDomains: UsageItem;
  subdomains: UsageItem;
  aiCallsThisMonth: UsageItem;
  customers: UsageItem;
}

/**
 * Service für Plan-Usage-Statistiken (Stores / Produkte / Speicher / Domains / AI / Kunden).
 * Nutzt das Backend-Endpoint /api/usage/me (siehe UsageController.java).
 */
@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly API_URL = `${environment.apiUrl}/usage`;

  constructor(private http: HttpClient) {}

  /** Aktuelle Nutzung des eingeloggten Users. */
  getMyUsage(): Observable<UsageStats> {
    return this.http.get<UsageStats>(`${this.API_URL}/me`);
  }
}

