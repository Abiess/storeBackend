/**
 * DHL Phase 3A – API Models & Interfaces
 * 
 * TypeScript interfaces matching Backend DTOs exactly.
 * Multi-Tenant: All queries include storeId.
 */

// ========== ZONE ==========

export interface DhlZone {
  id: number;
  storeId: number;
  name: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DhlZoneRequest {
  name: string;
  color?: string;
  sortOrder?: number;
}

// ========== SHELF SLOT LAYOUT ==========

export interface DhlShelfSlotLayout {
  id: number;
  storeId: number;
  slotId: number;
  slotCode: string;
  slotCapacity: number;
  slotActive: boolean;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  zoneId?: number;
  zoneName?: string;
  zoneColor?: string;
  occupiedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DhlLayoutUpdateRequest {
  updates: DhlLayoutPositionUpdate[];
}

export interface DhlLayoutPositionUpdate {
  slotId: number;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  zoneId?: number | null;
}

export interface DhlCreateSlotWithLayoutRequest {
  code: string;
  capacity: number;
  description?: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  zoneId?: number | null;
}

export interface DhlAddSlotToLayoutRequest {
  slotId: number;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  zoneId?: number | null;
}

// ========== SLOT SIZES ==========

export enum SlotSize {
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL'
}

export interface SlotSizeConfig {
  label: string;
  width: number;
  height: number;
}

export const SLOT_SIZE_MAP: Record<SlotSize, SlotSizeConfig> = {
  [SlotSize.S]: { label: 'S', width: 1, height: 1 },
  [SlotSize.M]: { label: 'M', width: 2, height: 1 },
  [SlotSize.L]: { label: 'L', width: 2, height: 2 },
  [SlotSize.XL]: { label: 'XL', width: 3, height: 2 }
};

// ========== VIEW MODELS ==========

/**
 * Slot-Status für visuellen Plan
 */
export enum SlotStatus {
  FREE = 'free',          // occupiedCount === 0
  PARTIAL = 'partial',    // 0 < occupiedCount < capacity
  FULL = 'full',          // occupiedCount === capacity
  INACTIVE = 'inactive'   // active === false
}

/**
 * UI-State für Visual Plan
 */
export interface VisualPlanState {
  mode: 'operation' | 'expert';
  layouts: DhlShelfSlotLayout[];
  zones: DhlZone[];
  slotsWithoutLayout: DhlShelfSlotWithoutLayout[];
  highlightedSlotId?: number;
  isDirty: boolean;
  loading: boolean;
  error?: string;
}

/**
 * Slot ohne Layout (Fallback-Liste)
 */
export interface DhlShelfSlotWithoutLayout {
  id: number;
  code: string;
  capacity: number;
  occupiedCount: number;
  active: boolean;
}

/**
 * Helper: Berechnet Slot-Status
 */
export function getSlotStatus(layout: DhlShelfSlotLayout): SlotStatus {
  if (!layout.slotActive) {
    return SlotStatus.INACTIVE;
  }
  if (layout.occupiedCount === 0) {
    return SlotStatus.FREE;
  }
  if (layout.occupiedCount >= layout.slotCapacity) {
    return SlotStatus.FULL;
  }
  return SlotStatus.PARTIAL;
}

/**
 * Helper: Berechnet Slot-Größe aus gridWidth/gridHeight
 */
export function getSizeFromGrid(width: number, height: number): SlotSize {
  if (width === 1 && height === 1) return SlotSize.S;
  if (width === 2 && height === 1) return SlotSize.M;
  if (width === 2 && height === 2) return SlotSize.L;
  return SlotSize.XL;
}

/**
 * Helper: Berechnet Grid-Dimensionen aus Size
 */
export function getGridFromSize(size: SlotSize): { width: number; height: number } {
  const config = SLOT_SIZE_MAP[size];
  return { width: config.width, height: config.height };
}
