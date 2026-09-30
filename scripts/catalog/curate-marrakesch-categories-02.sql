-- Marrakesch, Store 121: vorhandene Kategorien zu weiteren Gruppen ordnen.
-- In einem PostgreSQL-SQL-Editor als GANZEN Block ausführen, nachdem PR gemergt wurde.
-- Bilder, Kategorie-IDs, Slugs und alle übrigen Produktzuordnungen bleiben erhalten.
BEGIN;

DO $$
BEGIN
    IF (SELECT count(*) FROM categories c JOIN (VALUES
        (327, 'tee'), (304, 'getr-nke'), (312, 'konserven'),
        (330, 'thunfisch-amp-sardellen'), (320, 'oliven-l-amp-essig'),
        (310, 'ideal-amp-knor'), (324, 's-igkeit'), (323, 'ramdan'),
        (309, 'honig-amp-amlou'), (303, 'fr-hst-ck'),
        (321, 'parf-merie-kosmetik'), (334, 'wellness')
    ) AS expected(id, slug) ON c.id = expected.id AND c.slug = expected.slug
    WHERE c.store_id = 121) <> 12 THEN
        RAISE EXCEPTION 'Store 121: Kategorien oder Slugs weichen vom erwarteten Stand ab';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM products WHERE store_id = 121 AND id = 847 AND category_id = 323)
    THEN
        RAISE EXCEPTION 'Store 121: Chorba-Suppe #847 gehört nicht mehr zur Ramadan-Kategorie';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS marrakesch_category_backup_02 (
    category_id bigint PRIMARY KEY,
    store_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    parent_id bigint,
    sort_order integer NOT NULL,
    image_url varchar(2048),
    updated_at timestamp NOT NULL,
    saved_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO marrakesch_category_backup_02 (category_id, store_id, name, parent_id, sort_order, image_url, updated_at)
SELECT id, store_id, name, parent_id, sort_order, image_url, updated_at
FROM categories WHERE store_id = 121 AND id IN (327,304,312,330,320,310,324,323,309,303,321,334)
ON CONFLICT (category_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS marrakesch_product_backup_02 (
    product_id bigint PRIMARY KEY,
    store_id bigint NOT NULL,
    category_id bigint,
    updated_at timestamp NOT NULL,
    saved_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO marrakesch_product_backup_02 (product_id, store_id, category_id, updated_at)
SELECT id, store_id, category_id, updated_at FROM products WHERE store_id = 121 AND id = 847
ON CONFLICT (product_id) DO NOTHING;

UPDATE categories SET name = 'Tee & Getränke', sort_order = 50, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 327;
UPDATE categories SET name = 'Erfrischungsgetränke', parent_id = 327, sort_order = 10, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 304;

UPDATE categories SET name = 'Konserven & Vorrat', sort_order = 60, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 312;
UPDATE categories SET name = 'Fischkonserven', parent_id = 312, sort_order = 10, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 330;
UPDATE categories SET name = 'Oliven, Öl & Essig', parent_id = 312, sort_order = 20, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 320;
UPDATE categories SET name = 'Suppen, Brühen & Würze', parent_id = 312, sort_order = 30, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 310;

-- Eine Chorba-Suppe war unter Ramadan-Gebäck einsortiert.
UPDATE products SET category_id = 310, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 847 AND category_id = 323;
UPDATE categories SET name = 'Süßes & Gebäck', sort_order = 70, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 324;
UPDATE categories SET name = 'Ramadan-Gebäck', parent_id = 324, sort_order = 10, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 323;
UPDATE categories SET name = 'Honig & Amlou', parent_id = 324, sort_order = 20, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 309;
UPDATE categories SET name = 'Frühstück & Aufstriche', parent_id = 324, sort_order = 30, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 303;

UPDATE categories SET name = 'Kosmetik & Pflege', sort_order = 80, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 321;
UPDATE categories SET name = 'Seifen & Körperpflege', parent_id = 321, sort_order = 10, updated_at = CURRENT_TIMESTAMP
WHERE store_id = 121 AND id = 334;

COMMIT;
