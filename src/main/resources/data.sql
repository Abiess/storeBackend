-- Initial data for production database
-- This script runs AFTER Hibernate creates the tables

-- Insert plans if they don't exist
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
SELECT 'FREE', 1, 0, 1, 100, 50, 100
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'FREE');

INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
SELECT 'PRO', 10, 5, 10, 10000, 1000, 5000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'PRO');

INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
SELECT 'ENTERPRISE', 100, 50, 100, 100000, -1, -1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'ENTERPRISE');

