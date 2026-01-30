-- Flyway Migration V2: Initial Data
-- Fügt Standard-Daten hinzu

-- FREE Plan
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('FREE', 1, 0, 1, 100, 50, 100)
ON CONFLICT (name) DO NOTHING;

