-- Nur bei Bedarf, bevor weitere manuelle Änderungen an diesen Kategorien erfolgen.
BEGIN;
UPDATE products p SET category_id = b.category_id, updated_at = b.updated_at
FROM marrakesch_product_backup_02 b
WHERE p.id = b.product_id AND p.store_id = 121 AND b.store_id = 121;
UPDATE categories c SET name = b.name, parent_id = b.parent_id,
    sort_order = b.sort_order, image_url = b.image_url, updated_at = b.updated_at
FROM marrakesch_category_backup_02 b
WHERE c.id = b.category_id AND c.store_id = 121 AND b.store_id = 121;
COMMIT;
