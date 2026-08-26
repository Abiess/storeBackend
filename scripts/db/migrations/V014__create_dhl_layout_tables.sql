-- ============================================================
-- Migration V013: DHL Phase 3A - Visual Plan Layout
-- ============================================================
-- Allows store-specific visual shelf layouts with zones
-- 
-- WICHTIG:
-- - DhlShelfSlot.id bleibt stabile fachliche Identität
-- - Layout-Änderungen verändern NIEMALS Paketzuordnungen
-- - Ein Slot kann ohne Layout existieren (Fallback: Liste)
-- 
-- Phase 3A Features:
-- - Zonen/Bereiche ("Regal links", "Regal hinten", etc.)
-- - Grid-basierte Positionen (x, y, width, height)
-- - Drag&Drop-Support
-- - Multi-Tenant strict

BEGIN;

-- ========== DHL ZONES ==========

CREATE TABLE IF NOT EXISTS dhl_zones (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dhl_zone_store
        FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
    
    CONSTRAINT uq_dhl_zone_store_name
        UNIQUE (store_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dhl_zone_store 
    ON dhl_zones(store_id);

COMMENT ON TABLE dhl_zones IS 'DHL Phase 3A: Zonen/Bereiche für visuellen Regalplan';
COMMENT ON COLUMN dhl_zones.name IS 'Zone name (e.g. "Regal links", "Shelf A", "رف أيسر")';
COMMENT ON COLUMN dhl_zones.color IS 'Optional color for visual display (#667eea, etc.)';

-- ========== DHL SHELF SLOT LAYOUTS ==========

CREATE TABLE IF NOT EXISTS dhl_shelf_slot_layouts (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    shelf_slot_id BIGINT NOT NULL,
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    grid_width INTEGER NOT NULL DEFAULT 1,
    grid_height INTEGER NOT NULL DEFAULT 1,
    zone_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dhl_layout_store
        FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_dhl_layout_slot
        FOREIGN KEY (shelf_slot_id) REFERENCES dhl_shelf_slots(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_dhl_layout_zone
        FOREIGN KEY (zone_id) REFERENCES dhl_zones(id) ON DELETE SET NULL,
    
    CONSTRAINT uq_dhl_layout_store_slot
        UNIQUE (store_id, shelf_slot_id)
);

CREATE INDEX IF NOT EXISTS idx_dhl_layout_store 
    ON dhl_shelf_slot_layouts(store_id);

CREATE INDEX IF NOT EXISTS idx_dhl_layout_slot 
    ON dhl_shelf_slot_layouts(shelf_slot_id);

COMMENT ON TABLE dhl_shelf_slot_layouts IS 'DHL Phase 3A: Visual position of shelf slots in grid layout';
COMMENT ON COLUMN dhl_shelf_slot_layouts.grid_x IS 'Grid X-position (0-based)';
COMMENT ON COLUMN dhl_shelf_slot_layouts.grid_y IS 'Grid Y-position (0-based)';
COMMENT ON COLUMN dhl_shelf_slot_layouts.grid_width IS 'Grid width (1=S, 2=M, 3=L, 4=XL)';
COMMENT ON COLUMN dhl_shelf_slot_layouts.grid_height IS 'Grid height (1=S, 2=M, 3=L, 4=XL)';

COMMIT;

-- Migration notes:
-- - Existing DhlShelfSlot records remain unchanged
-- - Existing parcels remain assigned to their slots
-- - Slots without layout will show in fallback list view
-- - Layout is purely visual, does not affect allocation logic
