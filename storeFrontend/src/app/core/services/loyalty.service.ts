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

export interface LoyaltyReplaceCardRequest {
  newIdentifier: string;
}

export interface LoyaltyAdjustRequest {
  identifier: string;
  points: number;
  reason: string;
}

export interface LoyaltyRedeemRequest {
  identifier: string;
  points: number;
  orderId?: number | null;
}

/**
 * Response nach ADJUST oder REDEEM (siehe LoyaltyAdjustmentResponse im Backend).
 */
export interface LoyaltyAdjustmentResponse {
  loyaltyAccountId: number;
  customerName: string | null;
  /** 'ADJUST' | 'REDEEM' */
  type: string;
  points: number;
  previousBalance: number;
  newBalance: number;
  note: string | null;
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
  /** ID des primären LoyaltyIdentifier (für Sperren/Ersetzen-Aktionen), null falls keiner existiert */
  loyaltyIdentifierId: number | null;
}

/**
 * Loyalty Transaction – Historie-Eintrag (Punkte-Buchung)
 * Siehe LoyaltyTransactionDTO / LoyaltyTransaction (resultingBalance ist ein
 * Snapshot, der bei jeder Buchung im Backend gespeichert wird).
 */
export interface LoyaltyTransaction {
  id: number;
  /** 'EARN' | 'REDEEM' | 'ADJUST' */
  type: string;
  points: number;
  amount: number | null;
  resultingBalance: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
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

  /**
   * Lädt die Transaktionshistorie (Punkte-Buchungen) eines Accounts, neueste zuerst.
   * GET /api/stores/{storeId}/loyalty/accounts/{loyaltyAccountId}/transactions
   */
  getTransactionHistory(storeId: number, loyaltyAccountId: number): Observable<LoyaltyTransaction[]> {
    return this.http.get<LoyaltyTransaction[]>(
      `${this.apiUrl}/stores/${storeId}/loyalty/accounts/${loyaltyAccountId}/transactions`
    );
  }

  /**
   * Sperrt einen bestehenden Identifier (Karte/Code). LoyaltyAccount und
   * Punktestand bleiben unverändert.
   * POST /api/stores/{storeId}/loyalty/identifiers/{identifierId}/block
   */
  blockIdentifier(storeId: number, identifierId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/stores/${storeId}/loyalty/identifiers/${identifierId}/block`,
      {}
    );
  }

  /**
   * Ersetzt einen bestehenden Identifier durch einen neuen (alter wird REPLACED,
   * neuer wird ACTIVE, gleicher LoyaltyAccount, Punktestand bleibt unverändert).
   * POST /api/stores/{storeId}/loyalty/identifiers/{identifierId}/replace
   */
  replaceIdentifier(storeId: number, identifierId: number, newIdentifier: string): Observable<LoyaltyAccount> {
    const request: LoyaltyReplaceCardRequest = { newIdentifier };
    return this.http.post<LoyaltyAccount>(
      `${this.apiUrl}/stores/${storeId}/loyalty/identifiers/${identifierId}/replace`,
      request
    );
  }

  /**
   * Manuelle Punktekorrektur (positiv oder negativ, Grund ist Pflichtfeld).
   * POST /api/stores/{storeId}/loyalty/adjust
   */
  adjustPoints(storeId: number, request: LoyaltyAdjustRequest): Observable<LoyaltyAdjustmentResponse> {
    return this.http.post<LoyaltyAdjustmentResponse>(
      `${this.apiUrl}/stores/${storeId}/loyalty/adjust`,
      request
    );
  }

  /**
   * Löst Punkte ein (nur möglich, wenn genügend Punkte vorhanden sind).
   * POST /api/stores/{storeId}/loyalty/redeem
   */
  redeemPoints(storeId: number, request: LoyaltyRedeemRequest): Observable<LoyaltyAdjustmentResponse> {
    return this.http.post<LoyaltyAdjustmentResponse>(
      `${this.apiUrl}/stores/${storeId}/loyalty/redeem`,
      request
    );
  }
}
