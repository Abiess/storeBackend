// DHL Slot Management Service
// Phase 3A.5 Checkpoint 3 - Slot Management API Integration

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * DHL Shelf Slot DTO
 */
export interface DhlShelfSlotDto {
  id: number;
  storeId: number;
  code: string;
  capacity: number;
  sortOrder: number;
  active: boolean;
  description?: string;
  occupiedCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Single Slot Create Request
 */
export interface DhlCreateSlotRequest {
  code: string;
  capacity: number;
  description?: string;
}

/**
 * Bulk Slots Create Request
 */
export interface DhlBulkCreateSlotsRequest {
  prefix: string;
  startNumber: number;
  count: number;
  capacity: number;
  description?: string;
}

/**
 * Slot Update Request
 */
export interface DhlUpdateSlotRequest {
  capacity?: number;
  active?: boolean;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DhlSlotService {

  constructor(private http: HttpClient) {}

  /**
   * GET /api/stores/{storeId}/dhl/slots
   * 
   * Lädt alle Slots eines Stores sortiert nach sortOrder
   */
  getSlots(storeId: number): Observable<DhlShelfSlotDto[]> {
    return this.http.get<DhlShelfSlotDto[]>(
      `${environment.apiUrl}/stores/${storeId}/dhl/slots`
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/slots
   * 
   * Erstellt einzelnes Fach
   */
  createSlot(storeId: number, request: DhlCreateSlotRequest): Observable<DhlShelfSlotDto> {
    return this.http.post<DhlShelfSlotDto>(
      `${environment.apiUrl}/stores/${storeId}/dhl/slots`,
      request
    );
  }

  /**
   * POST /api/stores/{storeId}/dhl/slots/batch
   * 
   * Erstellt mehrere Fächer atomar
   * 
   * ATOMIC: Bei Fehler werden KEINE Slots erstellt
   */
  createBulkSlots(storeId: number, request: DhlBulkCreateSlotsRequest): Observable<DhlShelfSlotDto[]> {
    return this.http.post<DhlShelfSlotDto[]>(
      `${environment.apiUrl}/stores/${storeId}/dhl/slots/batch`,
      request
    );
  }

  /**
   * PUT /api/stores/{storeId}/dhl/slots/{slotId}
   * 
   * Aktualisiert Slot (capacity, active, description)
   */
  updateSlot(storeId: number, slotId: number, request: DhlUpdateSlotRequest): Observable<DhlShelfSlotDto> {
    return this.http.put<DhlShelfSlotDto>(
      `${environment.apiUrl}/stores/${storeId}/dhl/slots/${slotId}`,
      request
    );
  }
}
