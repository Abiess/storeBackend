import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DhlZone,
  DhlZoneRequest,
  DhlShelfSlotLayout,
  DhlLayoutUpdateRequest,
  DhlCreateSlotWithLayoutRequest
} from '@app/core/models/dhl.model';

/**
 * DHL Phase 3A – API Service
 * 
 * HTTP Service für alle 7 Backend-Endpoints.
 * Multi-Tenant: storeId ist immer Teil der URL.
 * 
 * Backend API Base: /api/stores/{storeId}/dhl
 */
@Injectable({
  providedIn: 'root'
})
export class DhlLayoutService {
  private readonly baseUrl = `${environment.apiUrl}/api/stores`;

  constructor(private http: HttpClient) {}

  // ========== ZONES ==========

  /**
   * GET /api/stores/{storeId}/dhl/zones
   * 
   * Lädt alle Zonen eines Stores
   */
  getZones(storeId: number): Observable<DhlZone[]> {
    return this.http.get<DhlZone[]>(`${this.baseUrl}/${storeId}/dhl/zones`);
  }

  /**
   * POST /api/stores/{storeId}/dhl/zones
   * 
   * Erstellt neue Zone
   */
  createZone(storeId: number, request: DhlZoneRequest): Observable<DhlZone> {
    return this.http.post<DhlZone>(`${this.baseUrl}/${storeId}/dhl/zones`, request);
  }

  /**
   * PUT /api/stores/{storeId}/dhl/zones/{zoneId}
   * 
   * Aktualisiert Zone
   */
  updateZone(storeId: number, zoneId: number, request: DhlZoneRequest): Observable<DhlZone> {
    return this.http.put<DhlZone>(`${this.baseUrl}/${storeId}/dhl/zones/${zoneId}`, request);
  }

  /**
   * DELETE /api/stores/{storeId}/dhl/zones/{zoneId}
   * 
   * Löscht Zone (nur wenn keine Slots zugeordnet)
   */
  deleteZone(storeId: number, zoneId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${storeId}/dhl/zones/${zoneId}`);
  }

  // ========== LAYOUT ==========

  /**
   * GET /api/stores/{storeId}/dhl/layout
   * 
   * Lädt komplettes Layout für Store.
   * 
   * Backend optimiert: N+1-Prevention via Batch-Query.
   * Response enthält: Slots, Positions, Zones, Occupied Counts.
   */
  getLayout(storeId: number): Observable<DhlShelfSlotLayout[]> {
    return this.http.get<DhlShelfSlotLayout[]>(`${this.baseUrl}/${storeId}/dhl/layout`);
  }

  /**
   * PUT /api/stores/{storeId}/dhl/layout
   * 
   * Batch-Update für Drag&Drop.
   * 
   * WICHTIG:
   * - Verändert nur gridX, gridY, gridWidth, gridHeight, zoneId
   * - Niemals: slotId, capacity, parcel-assignments
   * - Transaktion: Alle Updates oder keiner
   * 
   * Verwendung:
   * Nach Drag&Drop im Expertenmodus → Änderungen sammeln → 1x senden
   */
  updateLayoutBatch(storeId: number, request: DhlLayoutUpdateRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${storeId}/dhl/layout`, request);
  }

  /**
   * POST /api/stores/{storeId}/dhl/layout/slots
   * 
   * Erstellt neuen Slot MIT Layout (atomic).
   * 
   * Backend erstellt in einer Transaktion:
   * 1. DhlShelfSlot (code, capacity, description)
   * 2. DhlShelfSlotLayout (gridX, gridY, gridWidth, gridHeight, zoneId)
   * 
   * Response: Komplettes DhlShelfSlotLayout inkl. slotId
   */
  createSlotWithLayout(storeId: number, request: DhlCreateSlotWithLayoutRequest): Observable<DhlShelfSlotLayout> {
    return this.http.post<DhlShelfSlotLayout>(`${this.baseUrl}/${storeId}/dhl/layout/slots`, request);
  }

  // ========== HELPER METHODS ==========

  /**
   * Findet Slot im Layout-Array
   */
  findSlotById(layouts: DhlShelfSlotLayout[], slotId: number): DhlShelfSlotLayout | undefined {
    return layouts.find(layout => layout.slotId === slotId);
  }

  /**
   * Findet Slot im Layout-Array by Code
   */
  findSlotByCode(layouts: DhlShelfSlotLayout[], code: string): DhlShelfSlotLayout | undefined {
    return layouts.find(layout => layout.slotCode.toUpperCase() === code.toUpperCase());
  }

  /**
   * Berechnet Grid-Bounds (für Auto-Scroll)
   */
  getGridBounds(layouts: DhlShelfSlotLayout[]): { maxX: number; maxY: number } {
    if (layouts.length === 0) {
      return { maxX: 0, maxY: 0 };
    }

    const maxX = Math.max(...layouts.map(l => l.gridX + l.gridWidth));
    const maxY = Math.max(...layouts.map(l => l.gridY + l.gridHeight));

    return { maxX, maxY };
  }

  /**
   * Gruppiert Layouts nach Zone
   */
  groupByZone(layouts: DhlShelfSlotLayout[]): Map<string, DhlShelfSlotLayout[]> {
    const groups = new Map<string, DhlShelfSlotLayout[]>();

    layouts.forEach(layout => {
      const key = layout.zoneName || 'Unassigned';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(layout);
    });

    return groups;
  }
}
