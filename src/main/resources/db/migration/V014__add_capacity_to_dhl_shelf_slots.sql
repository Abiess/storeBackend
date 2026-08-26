-- DHL Phase 2.1: Add capacity field to dhl_shelf_slots
-- Allows multiple parcels per slot

-- Step 1: Add column as nullable first (for existing rows)
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
ALTER TABLE dhl_shelf_slots
ALTER COLUMN capacity SET NOT NULL;
