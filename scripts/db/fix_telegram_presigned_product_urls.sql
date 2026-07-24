-- Telegram-Produktbilder: abgelaufene Presigned-URLs auf permanente Public-URLs bereinigen
-- Hinweis: Dieses Repo verwendet die Tabelle products (nicht product) und product_media (nicht product_image).
-- product_media speichert keine URL-Spalte, sondern referenziert media.minio_object_name.
--
-- Backup-Beispiele (projektlokal, NICHT /tmp):
--   pg_dump -U storeapp -d storedb -t products > backups\products_backup_before_telegram_url_fix.sql
--   pg_dump -U storeapp -d storedb -t product_media > backups\product_media_backup_before_telegram_url_fix.sql
--
-- Analyse
SELECT id, image_url
FROM products
WHERE image_url LIKE '%X-Amz-%'
  AND image_url LIKE '%/store-assets/stores/%/telegram/%'
LIMIT 20;

SELECT COUNT(*) AS telegram_presigned_products
FROM products
WHERE image_url LIKE '%X-Amz-%'
  AND image_url LIKE '%/store-assets/stores/%/telegram/%';

-- Migration
UPDATE products
SET image_url = regexp_replace(
    image_url,
    '(https://minio\.markt\.ma/[^?]+)\?.*',
    '\1'
)
WHERE image_url LIKE '%X-Amz-%'
  AND image_url LIKE '%/store-assets/stores/%/telegram/%';

-- Verifikation
SELECT COUNT(*) AS remaining_presigned_products
FROM products
WHERE image_url LIKE '%X-Amz-%'
  AND image_url LIKE '%/store-assets/stores/%/telegram/%';
