-- ============================================================
-- Migration V012: DHL Phase 2.1 - Add capacity to shelf slots
-- ============================================================
-- Allows multiple parcels per slot with capacity management
-- 
-- Phase 2.1 Requirements:
-- - Slots can hold multiple parcels (e.g., capacity=3)
-- - Slot status: FREE (0/3), PARTIAL (1-2/3), FULL (3/3)
-- - Backward compatible: existing slots default to capacity=1

BEGIN;

-- Step 1: Add capacity column (nullable first for existing rows)
ALTER TABLE dhl_shelf_slots
ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Step 2: Set default value of 1 for all existing NULL rows (backward compatibility)
UPDATE dhl_shelf_slots
SET capacity = 1
WHERE capacity IS NULL;

-- Step 3: Set default for future inserts
ALTER TABLE dhl_shelf_slots
ALTER COLUMN capacity SET DEFAULT 1;

-- Step 4: Make column NOT NULL (safe after UPDATE)
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dhl_shelf_slots' 
        AND column_name = 'capacity' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE dhl_shelf_slots
        ALTER COLUMN capacity SET NOT NULL;
    END IF;
END $$;

COMMIT;

-- Migration notes:
-- - Existing slots: capacity = 1 (same behavior as Phase 2.0)
-- - New slots: capacity can be 1, 3, 5, etc. (store-specific)
-- - Occupied count derived from active parcels (not redundantly stored)
-- - Status calculation: occupiedCount compared to capacity
