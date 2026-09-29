ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS customer_account_mode VARCHAR(24) NOT NULL DEFAULT 'OPEN_REGISTRATION';

ALTER TABLE stores
    ADD CONSTRAINT stores_customer_account_mode_check
    CHECK (customer_account_mode IN ('OPEN_REGISTRATION', 'LOGIN_ONLY', 'DISABLED'));
