-- Nur bei Bedarf nach Phase 1 ausführen: stellt die gesicherten Kategoriefelder wieder her.
-- Spätere manuelle Änderungen an diesen Feldern würden dabei ebenfalls zurückgesetzt.
BEGIN;
UPDATE categories c SET name = b.name, parent_id = b.parent_id,
    sort_order = b.sort_order, image_url = b.image_url, updated_at = b.updated_at
FROM marrakesch_category_backup_01 b
WHERE c.id = b.category_id AND c.store_id = 121 AND b.store_id = 121;
COMMIT;
