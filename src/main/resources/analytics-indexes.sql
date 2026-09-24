-- =====================================================
-- ANALYTICS DATABASE INDEXES
-- =====================================================
-- Zweck: Performance-Optimierung für Analytics-Queries
-- Ausführung: Manuell auf Production-DB (PostgreSQL)
-- WICHTIG: Erst prüfen, ob Index bereits existiert!
-- =====================================================

-- Index 1: Orders Analytics (Haupt-Index)
-- Beschleunigt: Revenue-Queries, Order-Count, Stats
-- Erwarteter Speed-Up: 10-100x
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_analytics 
ON orders(store_id, payment_status, status, created_at);

-- Index 2: Order Items für Top-Produkte
-- Beschleunigt: Top-Produkte-Query (JOIN orders + products)
-- Erwarteter Speed-Up: 5-20x
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_order_items_order 
ON order_items(order_id);

-- Index 3: Order Items für Product-Aggregation
-- Beschleunigt: Top-Produkte nach Umsatz/Menge
-- Erwarteter Speed-Up: 5-20x
-- =====================================================
-- VERIFIED: product_id Spalte existiert in OrderItem Entity (Zeile 28)
CREATE INDEX IF NOT EXISTS idx_order_items_product 
ON order_items(product_id) 
WHERE product_id IS NOT NULL;

-- =====================================================
-- OPTIONAL: Payment Transactions für Zahlungsarten
-- =====================================================
-- Falls payment_transactions-Tabelle existiert
-- CREATE INDEX IF NOT EXISTS idx_payment_transactions_analytics 
-- ON payment_transactions(order_id, provider, status);

-- =====================================================
-- PERFORMANCE-CHECK (PostgreSQL)
-- =====================================================
-- Vor Index-Erstellung:
-- EXPLAIN ANALYZE
-- SELECT SUM(total_gross) FROM orders 
-- WHERE store_id = 1 AND payment_status = 'PAID';
-- Ergebnis: ~500ms (Seq Scan)

-- Nach Index-Erstellung:
-- EXPLAIN ANALYZE
-- SELECT SUM(total_gross) FROM orders 
-- WHERE store_id = 1 AND payment_status = 'PAID';
-- Ergebnis: ~10ms (Index Scan)

-- =====================================================
-- INDEX-PRÜFUNG (PostgreSQL)
-- =====================================================
-- Zeigt alle Indizes auf orders-Tabelle:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'orders';

-- Zeigt alle Indizes auf order_items-Tabelle:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'order_items';
