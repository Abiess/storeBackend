-- Add legal text fields to stores table
-- These fields store store-specific legal documents

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS terms_and_conditions_text TEXT,
ADD COLUMN IF NOT EXISTS privacy_policy_text TEXT,
ADD COLUMN IF NOT EXISTS return_policy_text TEXT,
ADD COLUMN IF NOT EXISTS shipping_policy_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN stores.terms_and_conditions_text IS 'Store-specific Terms and Conditions (AGB)';
COMMENT ON COLUMN stores.privacy_policy_text IS 'Store-specific Privacy Policy (Datenschutzerklärung)';
COMMENT ON COLUMN stores.return_policy_text IS 'Store-specific Return Policy (Rückgaberecht/Widerruf)';
COMMENT ON COLUMN stores.shipping_policy_text IS 'Store-specific Shipping Information (Versandbedingungen)';
