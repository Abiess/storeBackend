ALTER TABLE customer_profiles
    ADD COLUMN IF NOT EXISTS login_id VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_profiles_store_login_id
    ON customer_profiles (store_id, LOWER(login_id))
    WHERE login_id IS NOT NULL;
