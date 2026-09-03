import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * Loyalty Account – Kunde + aktueller Punktestand
 *
 * WICHTIG: "identifier"/Code ist heute ein manueller Testcode
 * (z.B. "BONUS-0001") und wird später 1:1 durch eine NFC-Karten-UID
 * ersetzt, ohne dass sich an diesem Interface etwas ändert.
 */
export interface LoyaltyAccount {
  loyaltyAccountId: number;
  customerProfileId: number | null;
  customerName: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  /** Store-Währung (NICHT hardcodiert auf MAD/EUR) */
  currencyCode: string;
  /** true = Karte ist (noch) keinem CustomerProfile zugeordnet (anonyme Bonuskarte) */
  anonymous: boolean;
}

export interface LoyaltyPurchaseRequest {
  identifier: string;
  amount: number;
}

export interface LoyaltyPurchaseResponse {
  loyaltyAccountId: number;
  customerName: string | null;
  amount: number;
  pointsEarned: number;
  previousBalance: number;
  newBalance: number;
  currencyCode: string;
}

export interface LoyaltyRegisterRequest {
  customerProfileId: number;
  identifier: string;
}

export interface LoyaltyIssueCardRequest {
  identifier: string;
}

export interface LoyaltyLinkCustomerRequest {
  loyaltyAccountId: number;
  customerProfileId: number;
}

export interface LoyaltyCustomerOption {
  customerProfileId: number;
  name: string;
  email: string | null;
  phone: string | null;
  alreadyRegistered: boolean;
}

/**
 * Loyalty Account – Listen-Eintrag ("Bonuskarten"-Übersicht)
 * Schlanke Projektion für ResponsiveDataList, siehe LoyaltyAccountListItemDTO.
 */
export interface LoyaltyAccountListItem {
  loyaltyAccountId: number;
  customerProfileId: number | null;
  customerName: string | null;
  anonymous: boolean;
  /** Primärer/erster Karten-/Kundencode, null falls (theoretisch) keiner existiert */
  identifier: string | null;
  /** 'ACTIVE' | 'BLOCKED' | 'REPLACED', null falls kein Identifier existiert */
  status: string | null;
  pointsBalance: number;
  createdAt: string;
  /** ISO-Datum der letzten EARN-Transaction, null falls noch kein Einkauf zugeordnet wurde */
  lastPurchaseAt: string | null;
}

/**
 * Loyalty Service
 * API-Kommunikation für das Bonuspunkte-System (MVP: manueller Karten-/Kundencode)
 */
@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Sucht einen Loyalty Account anhand des Karten-/Kundencodes.
   * GET /api/stores/{storeId}/loyalty/lookup?code=...
   */
  lookup(storeId: number, code: string): Observable<LoyaltyAccount> {
    return this.http.get<LoyaltyAccount>(
      `${this.apiUrl}/stores/${storeId}/loyalty/lookup`,
      { params: { code } }
    );
  }

  /**
   * Ordnet einen Einkauf einem Loyalty Account zu (manueller Test-Flow).
   * POST /api/stores/{storeId}/loyalty/purchase
   */
  recordPurchase(storeId: number, request: LoyaltyPurchaseRequest): Observable<LoyaltyPurchaseResponse> {
    return this.http.post<LoyaltyPurchaseResponse>(
      `${this.apiUrl}/stores/${storeId}/loyalty/purchase`,
      request
    );
  }

  /**
   * Lädt bestehende Store-Kunden für die Code-Registrierung (Dropdown/Suche).
   * GET /api/stores/{storeId}/loyalty/customers?q=...
   */
  searchCustomers(storeId: number, query: string): Observable<LoyaltyCustomerOption[]> {
    return this.http.get<LoyaltyCustomerOption[]>(
      `${this.apiUrl}/stores/${storeId}/loyalty/customers`,
      { params: query ? { q: query } : {} }
    );
  }

  /**
   * Registriert einen neuen Karten-/Kundencode für ein bestehendes CustomerProfile.
   * POST /api/stores/{storeId}/loyalty/register
   */
  register(storeId: number, request: LoyaltyRegisterRequest): Observable<LoyaltyAccount> {
    return this.http.post<LoyaltyAccount>(
      `${this.apiUrl}/stores/${storeId}/loyalty/register`,
      request
    );
  }

  /**
   * Gibt eine neue ANONYME Bonuskarte aus (Laufkundschaft ohne Konto).
   * Legt einen LoyaltyAccount OHNE CustomerProfile an (Punktestand 0).
   * POST /api/stores/{storeId}/loyalty/issue-card
   */
  issueCard(storeId: number, request: LoyaltyIssueCardRequest): Observable<LoyaltyAccount> {
    return this.http.post<LoyaltyAccount>(
      `${this.apiUrl}/stores/${storeId}/loyalty/issue-card`,
      request
    );
  }

  /**
   * Verknüpft einen bestehenden (bisher anonymen) LoyaltyAccount nachträglich
   * mit einem CustomerProfile ("Kunde verknüpfen"). Die Punkte bleiben erhalten.
   * POST /api/stores/{storeId}/loyalty/link-customer
   */
  linkCustomer(storeId: number, request: LoyaltyLinkCustomerRequest): Observable<LoyaltyAccount> {
    return this.http.post<LoyaltyAccount>(
      `${this.apiUrl}/stores/${storeId}/loyalty/link-customer`,
      request
    );
  }

  /**
   * Lädt alle Loyalty-Accounts des Stores für die "Bonuskarten"-Übersicht.
   * GET /api/stores/{storeId}/loyalty/accounts
   */
  listAccounts(storeId: number): Observable<LoyaltyAccountListItem[]> {
    return this.http.get<LoyaltyAccountListItem[]>(
      `${this.apiUrl}/stores/${storeId}/loyalty/accounts`
    );
  }
}
