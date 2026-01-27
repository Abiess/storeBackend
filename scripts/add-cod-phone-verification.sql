-- Migration: Add Cash on Delivery Phone Verification Support
-- Fügt paymentMethod und phoneVerification Felder zur orders Tabelle hinzu

-- 1. PaymentMethod Spalte hinzufügen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);

-- 2. Phone Verification ID hinzufügen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_verification_id BIGINT;

-- 3. Phone Verified Flag hinzufügen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- 4. Index für schnelle Suche nach Verifizierungs-ID
CREATE INDEX IF NOT EXISTS idx_orders_phone_verification
ON orders(phone_verification_id);

-- 5. Index für Payment Method Filterung
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
ON orders(payment_method);

-- Kommentar hinzufügen
COMMENT ON COLUMN orders.payment_method IS 'Zahlungsmethode: CASH_ON_DELIVERY, CREDIT_CARD, PAYPAL, STRIPE, BANK_TRANSFER';
COMMENT ON COLUMN orders.phone_verification_id IS 'Referenz zur PhoneVerification für Cash on Delivery';
COMMENT ON COLUMN orders.phone_verified IS 'Telefonnummer wurde verifiziert (erforderlich für Cash on Delivery)';

-- Optional: Bestehende Orders auf Standard-Zahlungsmethode setzen
UPDATE orders
SET payment_method = 'CREDIT_CARD'
WHERE payment_method IS NULL;

COMMIT;

