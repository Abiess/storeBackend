-- ============================================================
-- HOTFIX: Fehlende Spalte 'stock' in Tabelle 'products'
-- Ursache: Product-Entity hat @Column(name="stock", nullable=false),
--          aber die Spalte fehlte im Schema → JDBC 500-Fehler beim
--          GET /api/stores/{id}/products
--
-- Ausführen auf Produktions-DB (als postgres-Superuser oder storeapp):
--   psql -U storeapp -d storedb -f fix_products_stock_column.sql
-- ============================================================

SET search_path TO public;

-- Spalte hinzufügen (mit DEFAULT 0, damit bestehende Zeilen gültig sind)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

-- Bestehende Produkte ohne Wert erhalten 0 (kein Datenverlust)
UPDATE products SET stock = 0 WHERE stock IS NULL;

-- Zur Kontrolle: Anzahl Produkte
SELECT COUNT(*) AS total_products, COUNT(stock) AS with_stock FROM products;

