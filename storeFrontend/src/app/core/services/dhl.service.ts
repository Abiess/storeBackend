import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DhlValidateRequest {
  // Optional: Override Order Paketdaten
  packageWeightGrams?: number;
  packageLengthMm?: number;
  packageWidthMm?: number;
  packageHeightMm?: number;
}

export interface DhlValidateResponse {
  success: boolean;
  validation?: string;  // SUCCESS | VALIDATION_FAILED
  shipmentNo?: string | null;
  routingCode?: string | null;
  labelUrl?: string | null;
  validationMessages?: any[];
  status?: {
    status: number;
    detail: string;
  };
  error?: string;
  messageKey?: string;
  message?: string;
  dhlStatus?: number;
  dhlDetail?: string;
}

export interface DhlLabelResponse {
  success: boolean;
  labelUrl?: string;
  shipmentNo?: string;
  routingCode?: string;
  error?: string;
  messageKey?: string;
  message?: string;
  dhlStatus?: number;
  dhlDetail?: string;
}

// ════════════════════════════════════════════════════════════════════════
// DHL PARCEL MANAGEMENT (Phase 1 - Paketannahme/Abholung im Shop)
// ════════════════════════════════════════════════════════════════════════

/**
 * DHL Parcel Status
 * CANCELLED = Teil 2 (Lagerverwaltung): Paket wurde manuell aus dem aktiven
 * Lager entfernt (Historie bleibt erhalten, siehe cancelParcel()).
 */
export type DhlParcelStatus = 'STORED' | 'PICKED_UP' | 'CANCELLED';

/**
 * DHL Parcel Response
 */
export interface DhlParcel {
  id: number;
  storeId: number;
  trackingCode: string;
  shelfLocation: string;
  receivedAt: string;
  pickedUpAt?: string;
  status: DhlParcelStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Teil 2 - Lagerverwaltung (nur gesetzt wenn status = CANCELLED)
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationNote?: string;
}

/**
 * Request: Paket einlagern
 */
export interface DhlStoreParcelRequest {
  trackingCode: string;
  shelfLocation: string;
  notes?: string;
}

/**
 * Request: Paket suchen
 */
export interface DhlFindParcelRequest {
  trackingCode: string;
}

/**
 * Request: Paket abholen
 */
export interface DhlPickupParcelRequest {
  trackingCode: string;
}

// ════════════════════════════════════════════════════════════════════════
// TEIL 2 - LAGERVERWALTUNG: PAKET ENTFERNEN (Phase 3A.4 Backend, jetzt FE)
// ════════════════════════════════════════════════════════════════════════

/**
 * Gründe für die Stornierung/Entfernung einer Paket-Einlagerung.
 * Muss exakt mit backend storebackend.enums.CancellationReason übereinstimmen.
 */
export type CancellationReason =
  | 'WRONG_SCAN'
  | 'WRONG_PARCEL'
  | 'TEST_SCAN'
  | 'DUPLICATE_ENTRY'
  | 'MANUAL_REMOVAL'
  | 'OTHER';

/**
 * Request: Paket aus dem Lager entfernen (POST /parcels/{parcelId}/cancel)
 */
export interface CancelParcelRequest {
  reason: CancellationReason;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DhlService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * DHL Sendung validieren (kein Label, keine Kosten)
   */
  validateShipment(storeId: number, orderId: number, request?: DhlValidateRequest): Observable<DhlValidateResponse> {
    const url = `${this.baseUrl}/admin/orders/${orderId}/dhl/validate`;
    return this.http.post<DhlValidateResponse>(url, request || {});
  }

  /**
   * Live DHL Label erstellen (Kosten!)
   */
  createLabel(storeId: number, orderId: number, request?: DhlValidateRequest): Observable<DhlLabelResponse> {
    const url = `${this.baseUrl}/admin/orders/${orderId}/dhl/label`;
    return this.http.post<DhlLabelResponse>(url, request || {});
  }

  // ════════════════════════════════════════════════════════════════════════
  // DHL PARCEL MANAGEMENT METHODS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Normalisiert DHL Tracking-Code (clientseitig)
   * 
   * Input-Varianten:
   * - (J)VGL0605379700518040
   * - JVGL 0605 3797 0051 8040
   * - jvgl0605379700518040
   * 
   * Output:
   * - JVGL0605379700518040
   * 
   * Regeln:
   * 1. trim()
   * 2. uppercase
   * 3. Leerzeichen entfernen
   * 4. führendes (J) entfernen falls vorhanden
   * 5. nur alphanumerische Zeichen behalten
   * 
   * @param rawCode Roher Tracking-Code vom Scanner/Input
   * @return Normalisierter Code
   */
  normalizeTrackingCode(rawCode: string): string {
    if (!rawCode || !rawCode.trim()) {
      throw new Error('Tracking code cannot be empty');
    }
    
    // 1. trim + uppercase
    let normalized = rawCode.trim().toUpperCase();
    
    // 2. Leerzeichen entfernen
    normalized = normalized.replace(/\s+/g, '');
    
    // 3. Führendes (J) entfernen falls vorhanden
    if (normalized.startsWith('(J)')) {
      normalized = 'J' + normalized.substring(3);
    }
    
    // 4. Nur alphanumerische Zeichen behalten
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    
    if (normalized.length < 10) {
      throw new Error('Invalid tracking code format: too short');
    }
    
    return normalized;
  }

  /**
   * POST /api/stores/{storeId}/dhl/parcels/store (Phase 1)
   * 
   * Lagert Paket ein
   */
  storeParcel(storeId: number, request: DhlStoreParcelRequest): Observable<DhlParcel> {
    return this.http.post<DhlParcel>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/store`,
      request
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/parcels/store (Phase 2 - mit Mode)
   * 
   * Lagert Paket ein mit auto/manual Mode
   */
  storeParcelV2(storeId: number, request: DhlStoreParcelRequestV2): Observable<DhlParcel> {
    return this.http.post<DhlParcel>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/store`,
      request
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/parcels/find
   * 
   * Sucht Paket anhand Tracking-Code
   */
  findParcel(storeId: number, request: DhlFindParcelRequest): Observable<DhlParcel> {
    return this.http.post<DhlParcel>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/find`,
      request
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/parcels/pickup
   * 
   * Holt Paket ab (markiert als PICKED_UP)
   */
  pickupParcel(storeId: number, request: DhlPickupParcelRequest): Observable<DhlParcel> {
    return this.http.post<DhlParcel>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/pickup`,
      request
    );
  }

  /**
   * GET /api/stores/{storeId}/dhl/parcels
   * 
   * Listet alle Pakete (alle Status)
   */
  listAllParcels(storeId: number): Observable<DhlParcel[]> {
    return this.http.get<DhlParcel[]>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels`
    );
  }

  /**
   * GET /api/stores/{storeId}/dhl/parcels/stored
   * 
   * Listet nur eingelagerte Pakete (status = STORED)
   */
  listStoredParcels(storeId: number): Observable<DhlParcel[]> {
    return this.http.get<DhlParcel[]>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/stored`
    );
  }

  /**
   * GET /api/stores/{storeId}/dhl/slots
   * 
   * Listet alle Slots mit Belegungsstatus
   */
  getSlots(storeId: number): Observable<DhlSlot[]> {
    return this.http.get<DhlSlot[]>(
      `${this.baseUrl}/stores/${storeId}/dhl/slots`
    );
  }

  /**
   * GET /api/stores/{storeId}/dhl/slots/stats
   * 
   * Statistiken für Dashboard
   */
  getSlotStats(storeId: number): Observable<DhlSlotStats> {
    return this.http.get<DhlSlotStats>(
      `${this.baseUrl}/stores/${storeId}/dhl/slots/stats`
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/slots/allocate
   * 
   * Weist nächsten freien Slot zu (AUTO-Modus)
   */
  allocateSlot(storeId: number): Observable<DhlSlot> {
    return this.http.post<DhlSlot>(
      `${this.baseUrl}/stores/${storeId}/dhl/slots/allocate`,
      {}
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/slots/initialize-default
   * 
   * Initialisiert Default-Slots (A1-C7)
   */
  initializeDefaultSlots(storeId: number): Observable<{initialized: boolean, count: number}> {
    return this.http.post<{initialized: boolean, count: number}>(
      `${this.baseUrl}/stores/${storeId}/dhl/slots/initialize-default`,
      {}
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCHRITT 3 - DHL TRACKING VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/stores/{storeId}/dhl/tracking/validate
   * 
   * Validiert einen Tracking-Code gegen DHL Parcel DE Tracking API.
   * 
   * Returns:
   * - VALID: DHL bestätigt Sendung → pieceCode verwenden
   * - NOT_FOUND: Kein DHL-Code (KEIN Fehler, normaler Fall bei Multi-Barcode)
   * 
   * Technische Fehler (Auth, Timeout, etc.) werfen HTTP Errors.
   * 
   * @param storeId Store-ID
   * @param trackingCode Gescannter Barcode
   */
  validateTrackingCode(storeId: number, trackingCode: string): Observable<DhlTrackingValidationResponse> {
    return this.http.post<DhlTrackingValidationResponse>(
      `${this.baseUrl}/stores/${storeId}/dhl/tracking/validate`,
      { trackingCode: trackingCode.trim() }
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEIL 2 - LAGERVERWALTUNG: PAKET ENTFERNEN
  // ════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/stores/{storeId}/dhl/parcels/{parcelId}/cancel
   *
   * Entfernt ein Paket manuell aus dem aktiven Lager (Status → CANCELLED).
   * Historie bleibt erhalten, Lagerplatz wird sofort frei (Occupancy zählt
   * nur STORED-Pakete).
   *
   * Backend validiert bereits:
   * - Paket muss STORED sein (sonst PARCEL_NOT_STORED)
   * - Paket darf nicht bereits storniert sein (sonst PARCEL_ALREADY_CANCELLED)
   */
  cancelParcel(storeId: number, parcelId: number, request: CancelParcelRequest): Observable<DhlParcel> {
    return this.http.post<DhlParcel>(
      `${this.baseUrl}/stores/${storeId}/dhl/parcels/${parcelId}/cancel`,
      request
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// Phase 2 Types
// ════════════════════════════════════════════════════════════════════════

export interface DhlSlot {
  id: number;
  code: string;
  sortOrder: number;
  active: boolean;
  description?: string;
  capacity: number;        // Phase 2.1: Maximale Anzahl Pakete
  occupiedCount: number;   // Phase 2.1: Aktuell eingelagerte Pakete
  occupied: boolean;       // true wenn voll (occupiedCount >= capacity)
}

export interface DhlSlotStats {
  totalSlots: number;         // Anzahl Regalfächer
  totalCapacity: number;      // Gesamtkapazität (Paketplätze)
  slotsWithCapacity: number;  // Fächer mit Platz
  freeCapacity: number;       // Freie Paketplätze
  occupiedSlots: number;      // Belegte Paketplätze (=Parcels) - Backend field name
  occupancyPercentage: number;
}

export interface DhlStoreParcelRequestV2 {
  trackingCode: string;
  mode: 'auto' | 'manual';
  slotCode?: string;
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════
// SCHRITT 3 - DHL TRACKING VALIDATION TYPES
// ════════════════════════════════════════════════════════════════════════

/**
 * Response von DHL Tracking Validation Endpoint
 * Entspricht backend DhlTrackingValidationResult.java
 */
export interface DhlTrackingValidationResponse {
  status: 'VALID' | 'NOT_FOUND';
  trackingCode: string;
  pieceCode?: string;
  pieceIdentifier?: string;
  shipmentStatus?: string;
  standardEventCode?: string;
  productName?: string;
  weight?: number;
  dhlResponseCode: string;
  dhlErrorMessage?: string;
  valid: boolean; // convenience field
}
