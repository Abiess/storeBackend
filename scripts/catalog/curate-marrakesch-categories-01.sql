-- Store 121 (marrakesch): erste kleine Kuration der vorhandenen Kategorien.
-- Nach dem Frontend-Deploy einmalig ausführen:
--   sudo -u postgres psql -d storedb -v ON_ERROR_STOP=1 -f /opt/storebackend/scripts/catalog/curate-marrakesch-categories-01.sql
-- Die Produktzuordnungen, Kategorie-IDs und Slugs bleiben unverändert.
BEGIN;

-- Vor einer Änderung sicherstellen, dass die IDs noch zu den erwarteten Kategorien gehören.
DO $$
BEGIN
    IF (SELECT count(*) FROM categories c JOIN (VALUES
        (296, 'basar'), (299, 'couscous-tchicha'), (300, 'datteln'),
        (305, 'gew-rze'), (306, 'gew-rze-amp-kr-uter'),
        (307, 'gl-ser-teekannen-amp-tabletts'), (313, 'kr-uter'),
        (325, 'tajine-amp-tanjia'), (332, 'trockenfr-chte'),
        (333, 'vollkorn-semoule')
    ) AS expected(id, slug) ON c.id = expected.id AND c.slug = expected.slug
    WHERE c.store_id = 121) <> 10 THEN
        RAISE EXCEPTION 'Store 121: Kategorien oder Slugs weichen vom erwarteten Stand ab';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS marrakesch_category_backup_01 (
    category_id bigint PRIMARY KEY,
    store_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    parent_id bigint,
    sort_order integer NOT NULL,
    image_url varchar(2048),
    updated_at timestamp NOT NULL,
    saved_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO marrakesch_category_backup_01 (category_id, store_id, name, parent_id, sort_order, image_url, updated_at)
SELECT id, store_id, name, parent_id, sort_order, image_url, updated_at
FROM categories WHERE store_id = 121
ON CONFLICT (category_id) DO NOTHING;

-- Bereits sortierte Kategorien des Administrators behalten ihre Reihenfolge.
UPDATE categories SET sort_order = 100, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND parent_id IS NULL AND sort_order = 0
  AND id NOT IN (296, 299, 300, 305, 306, 307, 313, 325, 332, 333);

UPDATE categories SET name = 'Couscous & Getreide', sort_order = 10,
    image_url = 'https://markt.ma/assets/images/marrakesch/couscous-getreide.webp',
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 299;
UPDATE categories SET name = 'Mehl & Semoule', parent_id = 299, sort_order = 10,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 333;

UPDATE categories SET name = 'Datteln & Trockenfrüchte', sort_order = 20,
    image_url = 'https://markt.ma/assets/images/marrakesch/datteln-trockenfruechte.webp',
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 300;
UPDATE categories SET name = 'Nüsse & Trockenfrüchte', parent_id = 300, sort_order = 10,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 332;

UPDATE categories SET name = 'Gewürze & Kräuter', sort_order = 30,
    image_url = 'https://markt.ma/assets/images/marrakesch/gewuerze-kraeuter.webp',
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 305;
UPDATE categories SET name = 'Kräuter & Safran', parent_id = 305, sort_order = 10,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 313;
UPDATE categories SET name = 'Paprika & Gewürze', parent_id = 305, sort_order = 20,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 306;

UPDATE categories SET name = 'Basar & Küche', sort_order = 40,
    image_url = 'https://markt.ma/assets/images/marrakesch/basar-kueche.webp',
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 296;
UPDATE categories SET name = 'Teekannen & Gläser', parent_id = 296, sort_order = 10,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 307;
UPDATE categories SET name = 'Tajine & Tanjia', parent_id = 296, sort_order = 20,
    updated_at = CURRENT_TIMESTAMP WHERE store_id = 121 AND id = 325;

COMMIT;
