

SET search_path TO public;

SET search_path TO public;

-- Plans Tabelle   (muss zuerst erstellt werden wegen FK)
CREATE TABLE IF NOT EXISTS plans (
                                     id BIGSERIAL PRIMARY KEY,
                                     name VARCHAR(50) NOT NULL UNIQUE,
    max_stores INTEGER NOT NULL,
    max_custom_domains INTEGER NOT NULL,
    max_subdomains INTEGER NOT NULL,
    max_storage_mb BIGINT NOT NULL,
    max_products INTEGER NOT NULL,
    max_image_count INTEGER NOT NULL
    );

-- Users Tabelle
CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    plan_id BIGINT,
    ai_calls_this_month INTEGER NOT NULL DEFAULT 0,
    ai_calls_period_start TIMESTAMP,
    CONSTRAINT fk_users_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
    CONSTRAINT chk_users_language CHECK (preferred_language IN ('en', 'de', 'ar'))
    );

-- Migration: Phone-Auth Support hinzufügen
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- Email Verifications Tabelle (für Email-Verification Feature)
CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes für schnellere Token-Lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Password Reset Tokens Tabelle (für Password-Reset Feature)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes für schnellere Token-Lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at ON password_reset_tokens(used_at);

-- Stores Tabelle
CREATE TABLE IF NOT EXISTS stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    owner_id BIGINT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_image_url TEXT,
    slider_images TEXT,
    whatsapp_number VARCHAR(50),
    greeting_message TEXT,
    whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    -- ─── Social Media & Kontakt-Links ─────────────────────
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    telegram_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    footer_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Migration: Fehlende Spalten für bestehende stores-Tabellen hinzufügen
ALTER TABLE stores ADD COLUMN IF NOT EXISTS greeting_message TEXT;
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Currency & Tax Configuration for Stores
-- ═══════════════════════════════════════════════════════════════════════════

-- Währungs- und Länder-Felder hinzufügen
ALTER TABLE stores ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS price_mode VARCHAR(10);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shipping_tax_rate DECIMAL(5,2);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shipping_tax_strategy VARCHAR(30);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_exemption_text TEXT;

-- Bestehende Stores mit Defaults auffüllen (nur wenn NULL)
UPDATE stores SET currency_code = 'EUR' WHERE currency_code IS NULL;
UPDATE stores SET country_code = 'DE' WHERE country_code IS NULL;
UPDATE stores SET price_mode = 'GROSS' WHERE price_mode IS NULL;
UPDATE stores SET vat_enabled = TRUE WHERE vat_enabled IS NULL;
UPDATE stores SET default_tax_rate = 19.00 WHERE default_tax_rate IS NULL;
UPDATE stores SET shipping_tax_rate = 19.00 WHERE shipping_tax_rate IS NULL;
UPDATE stores SET shipping_tax_strategy = 'STORE_DEFINED' WHERE shipping_tax_strategy IS NULL;

-- NOT NULL Constraints setzen (erst nach Auffüllen!)
ALTER TABLE stores ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE stores ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE stores ALTER COLUMN price_mode SET NOT NULL;
ALTER TABLE stores ALTER COLUMN vat_enabled SET NOT NULL;
ALTER TABLE stores ALTER COLUMN default_tax_rate SET NOT NULL;
ALTER TABLE stores ALTER COLUMN shipping_tax_rate SET NOT NULL;
ALTER TABLE stores ALTER COLUMN shipping_tax_strategy SET NOT NULL;

-- Defaults für neue Stores
ALTER TABLE stores ALTER COLUMN currency_code SET DEFAULT 'EUR';
ALTER TABLE stores ALTER COLUMN country_code SET DEFAULT 'DE';
ALTER TABLE stores ALTER COLUMN price_mode SET DEFAULT 'GROSS';
ALTER TABLE stores ALTER COLUMN vat_enabled SET DEFAULT TRUE;
ALTER TABLE stores ALTER COLUMN default_tax_rate SET DEFAULT 19.00;
ALTER TABLE stores ALTER COLUMN shipping_tax_rate SET DEFAULT 19.00;
ALTER TABLE stores ALTER COLUMN shipping_tax_strategy SET DEFAULT 'STORE_DEFINED';

-- Migration: Fehlende Spalten für bestehende stores-Tabellen hinzufügen
ALTER TABLE stores ADD COLUMN IF NOT EXISTS greeting_message TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS telegram_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) NOT NULL DEFAULT 'SHOP';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_hours TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bot_protection_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bot_protection_mode VARCHAR(20) NOT NULL DEFAULT 'SUSPICIOUS_ONLY';

-- Domains Tabelle
CREATE TABLE IF NOT EXISTS domains (
                                       id BIGSERIAL PRIMARY KEY,
                                       store_id BIGINT NOT NULL,
                                       host VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_domains_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Store Usage Tracking
CREATE TABLE IF NOT EXISTS store_usage (
                                           id BIGSERIAL PRIMARY KEY,
                                           store_id BIGINT NOT NULL UNIQUE,
                                           storage_bytes BIGINT NOT NULL DEFAULT 0,
                                           image_count INTEGER NOT NULL DEFAULT 0,
                                           product_count INTEGER NOT NULL DEFAULT 0,
                                           updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                           CONSTRAINT fk_store_usage_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- User Roles (Join-Tabelle)
CREATE TABLE IF NOT EXISTS user_roles (
                                          user_id BIGINT NOT NULL,
                                          role VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Subscriptions Tabelle
CREATE TABLE IF NOT EXISTS subscriptions (
                                            id BIGSERIAL PRIMARY KEY,
                                            user_id BIGINT NOT NULL,
                                            plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    renewal_date TIMESTAMP,
    payment_method VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Customer Profiles Tabelle
CREATE TABLE IF NOT EXISTS customer_profiles (
                                                 id BIGSERIAL PRIMARY KEY,
                                                 user_id BIGINT NOT NULL UNIQUE,
                                                 first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    shipping_first_name VARCHAR(255),
    shipping_last_name VARCHAR(255),
    shipping_address1 VARCHAR(255),
    shipping_address2 VARCHAR(255),
    shipping_city VARCHAR(255),
    shipping_postal_code VARCHAR(50),
    shipping_country VARCHAR(100),
    shipping_phone VARCHAR(50),
    billing_first_name VARCHAR(255),
    billing_last_name VARCHAR(255),
    billing_address1 VARCHAR(255),
    billing_address2 VARCHAR(255),
    billing_city VARCHAR(255),
    billing_postal_code VARCHAR(50),
    billing_country VARCHAR(100),
    billing_phone VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  customer_id BIGINT NOT NULL,
                                                  address_type VARCHAR(20) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    address1 VARCHAR(255) NOT NULL,
    address2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_addresses_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Media Tabelle
CREATE TABLE IF NOT EXISTS media (
                                     id BIGSERIAL PRIMARY KEY,
                                     store_id BIGINT NOT NULL,
                                     file_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    minio_object_name VARCHAR(500) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    alt_text VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Categories Tabelle
CREATE TABLE IF NOT EXISTS categories (
                                          id BIGSERIAL PRIMARY KEY,
                                          store_id BIGINT NOT NULL,
                                          name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_id BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT uk_category_slug_per_store UNIQUE (store_id, slug)
    );

-- Products Tabelle
CREATE TABLE IF NOT EXISTS products (
                                        id BIGSERIAL PRIMARY KEY,
                                        store_id BIGINT,
                                        category_id BIGINT,
                                        supplier_id BIGINT,
                                        title VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2),
    is_supplier_catalog BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN DEFAULT FALSE,
    featured_order INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    sales_count BIGINT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Product Tax Configuration
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_category VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2);

-- Bestehende Produkte mit Defaults auffüllen
UPDATE products SET tax_category = 'STANDARD' WHERE tax_category IS NULL;
UPDATE products SET tax_rate = 19.00 WHERE tax_rate IS NULL;

-- NOT NULL Constraints
ALTER TABLE products ALTER COLUMN tax_category SET NOT NULL;
ALTER TABLE products ALTER COLUMN tax_rate SET NOT NULL;

-- Defaults für neue Produkte
ALTER TABLE products ALTER COLUMN tax_category SET DEFAULT 'STANDARD';
ALTER TABLE products ALTER COLUMN tax_rate SET DEFAULT 19.00;

-- Product Options
CREATE TABLE IF NOT EXISTS product_options (
                                               id BIGSERIAL PRIMARY KEY,
                                               product_id BIGINT NOT NULL,
                                               name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,  -- Hibernate-Entity: sortOrder -> sort_order
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_options_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

-- Product Option Values (ElementCollection via ProductOption.values)
CREATE TABLE IF NOT EXISTS product_option_values (
                                                     option_id BIGINT NOT NULL,
                                                     option_value VARCHAR(100) NOT NULL,
    CONSTRAINT fk_product_option_values_option FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
    );

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    weight DECIMAL(10, 3),
    option1 VARCHAR(255),
    option2 VARCHAR(255),
    option3 VARCHAR(255),
    image_url VARCHAR(500),
    media_urls TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    attributes_json TEXT,
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
                                              id BIGSERIAL PRIMARY KEY,
                                              variant_id BIGINT NOT NULL,
                                              quantity_change INTEGER NOT NULL,
                                              reason VARCHAR(50) NOT NULL,
    user_id BIGINT,
    notes TEXT,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_logs_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- Performance Indices für Varianten und Optionen
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);

-- Product Media
CREATE TABLE IF NOT EXISTS product_media (
                                             id BIGSERIAL PRIMARY KEY,
                                             product_id BIGINT NOT NULL,
                                             media_id BIGINT NOT NULL,
                                             sort_order INTEGER NOT NULL DEFAULT 0,
                                             is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                                             created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                             CONSTRAINT product_media_product_media_unique UNIQUE (product_id, media_id),
    CONSTRAINT fk_product_media_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_media_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

-- Carts
CREATE TABLE IF NOT EXISTS carts (
                                     id BIGSERIAL PRIMARY KEY,
                                     session_id VARCHAR(255) UNIQUE,
    user_id BIGINT,
    store_id BIGINT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_carts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
                                          id BIGSERIAL PRIMARY KEY,
                                          cart_id BIGINT NOT NULL,
                                          variant_id BIGINT NOT NULL,
                                          quantity INTEGER NOT NULL,
                                          price_snapshot DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    );

-- Orders Tabelle
CREATE TABLE IF NOT EXISTS orders (
                                      id BIGSERIAL PRIMARY KEY,
                                      order_number VARCHAR(50) NOT NULL UNIQUE,
    store_id BIGINT NOT NULL,
    customer_id BIGINT,
    customer_email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    tracking_number VARCHAR(100),
    tracking_carrier VARCHAR(50),
    tracking_url VARCHAR(500),
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    payment_method VARCHAR(50),
    phone_verification_id BIGINT,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_first_name VARCHAR(255),
    shipping_last_name VARCHAR(255),
    shipping_address1 VARCHAR(255),
    shipping_address2 VARCHAR(255),
    shipping_city VARCHAR(255),
    shipping_postal_code VARCHAR(50),
    shipping_country VARCHAR(100),
    shipping_phone VARCHAR(50),
    billing_first_name VARCHAR(255),
    billing_last_name VARCHAR(255),
    billing_address1 VARCHAR(255),
    billing_address2 VARCHAR(255),
    billing_city VARCHAR(255),
    billing_postal_code VARCHAR(50),
    billing_country VARCHAR(100),
    billing_phone VARCHAR(50),
    delivery_type VARCHAR(20),
    delivery_mode VARCHAR(20),
    delivery_provider_id BIGINT,
    delivery_fee DECIMAL(10, 2),
    eta_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    CONSTRAINT fk_orders_store FOREIGN KEY (store_id) REFERENCES stores(id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id)
    );

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
                                           id BIGSERIAL PRIMARY KEY,
                                           order_id BIGINT NOT NULL,
                                           variant_id BIGINT,
                                           product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    product_snapshot TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: OrderItem Tax Snapshot & Price Breakdown
-- ═══════════════════════════════════════════════════════════════════════════

-- Tax Snapshot (unveränderlich!)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_category VARCHAR(20);

-- Unit-Preise (für 1 Stück, vor Rabatt)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_net DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_gross DECIMAL(15,2);

-- Line-Totals VOR Rabatt
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_net_before_discount DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_tax_before_discount DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_gross_before_discount DECIMAL(15,2);

-- Rabatt auf diesen Item (aus Coupon proportional verteilt)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_discount_net DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_discount_tax DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_discount_gross DECIMAL(15,2);

-- Line-Totals NACH Rabatt (Menge × Preis - Rabatt)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_net DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_tax DECIMAL(15,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_gross DECIMAL(15,2);

-- Bestehende OrderItems mit Defaults auffüllen
UPDATE order_items SET tax_rate = 19.00 WHERE tax_rate IS NULL;
UPDATE order_items SET tax_category = 'STANDARD' WHERE tax_category IS NULL;
UPDATE order_items SET unit_price_net = 0.00 WHERE unit_price_net IS NULL;
UPDATE order_items SET unit_price_gross = 0.00 WHERE unit_price_gross IS NULL;
UPDATE order_items SET line_net_before_discount = 0.00 WHERE line_net_before_discount IS NULL;
UPDATE order_items SET line_tax_before_discount = 0.00 WHERE line_tax_before_discount IS NULL;
UPDATE order_items SET line_gross_before_discount = 0.00 WHERE line_gross_before_discount IS NULL;
UPDATE order_items SET line_discount_net = 0.00 WHERE line_discount_net IS NULL;
UPDATE order_items SET line_discount_tax = 0.00 WHERE line_discount_tax IS NULL;
UPDATE order_items SET line_discount_gross = 0.00 WHERE line_discount_gross IS NULL;
UPDATE order_items SET line_net = 0.00 WHERE line_net IS NULL;
UPDATE order_items SET line_tax = 0.00 WHERE line_tax IS NULL;
UPDATE order_items SET line_gross = 0.00 WHERE line_gross IS NULL;

-- Defaults setzen
ALTER TABLE order_items ALTER COLUMN tax_rate SET DEFAULT 19.00;
ALTER TABLE order_items ALTER COLUMN tax_category SET DEFAULT 'STANDARD';
ALTER TABLE order_items ALTER COLUMN unit_price_net SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN unit_price_gross SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_net_before_discount SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_tax_before_discount SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_gross_before_discount SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_discount_net SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_discount_tax SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_discount_gross SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_net SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_tax SET DEFAULT 0.00;
ALTER TABLE order_items ALTER COLUMN line_gross SET DEFAULT 0.00;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Order Currency, Tax & Discount Snapshot
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_mode VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN;

-- Zwischensumme (Produkte ohne Versand)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_net DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_gross DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_total DECIMAL(15,2);

-- Versandkosten aufgeschlüsselt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_net DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_tax DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_gross DECIMAL(15,2);

-- Gesamtsumme aufgeschlüsselt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_net DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_gross DECIMAL(15,2);

-- Rabatt aufgeschlüsselt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_net DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_tax DECIMAL(15,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_gross DECIMAL(15,2);

-- Coupon-Snapshot (unveränderlich!)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code_snapshot VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type_snapshot VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value_snapshot DECIMAL(15,2);

-- Bestehende Orders mit Defaults auffüllen
UPDATE orders SET currency_code = 'EUR' WHERE currency_code IS NULL;
UPDATE orders SET price_mode = 'GROSS' WHERE price_mode IS NULL;
UPDATE orders SET country_code = 'DE' WHERE country_code IS NULL;
UPDATE orders SET vat_enabled = TRUE WHERE vat_enabled IS NULL;
UPDATE orders SET subtotal_net = 0.00 WHERE subtotal_net IS NULL;
UPDATE orders SET subtotal_gross = 0.00 WHERE subtotal_gross IS NULL;
UPDATE orders SET tax_total = 0.00 WHERE tax_total IS NULL;
UPDATE orders SET shipping_net = 0.00 WHERE shipping_net IS NULL;
UPDATE orders SET shipping_tax = 0.00 WHERE shipping_tax IS NULL;
UPDATE orders SET shipping_gross = 0.00 WHERE shipping_gross IS NULL;
UPDATE orders SET total_net = 0.00 WHERE total_net IS NULL;
UPDATE orders SET total_gross = 0.00 WHERE total_gross IS NULL;
UPDATE orders SET discount_net = 0.00 WHERE discount_net IS NULL;
UPDATE orders SET discount_tax = 0.00 WHERE discount_tax IS NULL;
UPDATE orders SET discount_gross = 0.00 WHERE discount_gross IS NULL;

-- NOT NULL für Pflichtfelder (erst nach Auffüllen!)
ALTER TABLE orders ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE orders ALTER COLUMN price_mode SET NOT NULL;
ALTER TABLE orders ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE orders ALTER COLUMN vat_enabled SET NOT NULL;

-- Defaults setzen
ALTER TABLE orders ALTER COLUMN currency_code SET DEFAULT 'EUR';
ALTER TABLE orders ALTER COLUMN price_mode SET DEFAULT 'GROSS';
ALTER TABLE orders ALTER COLUMN country_code SET DEFAULT 'DE';
ALTER TABLE orders ALTER COLUMN vat_enabled SET DEFAULT TRUE;
ALTER TABLE orders ALTER COLUMN subtotal_net SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN subtotal_gross SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN tax_total SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN shipping_net SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN shipping_tax SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN shipping_gross SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN total_net SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN total_gross SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN discount_net SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN discount_tax SET DEFAULT 0.00;
ALTER TABLE orders ALTER COLUMN discount_gross SET DEFAULT 0.00;

-- Kommentare für Dokumentation
COMMENT ON COLUMN orders.coupon_code_snapshot IS 'Snapshot des verwendeten Coupon-Codes (unveränderlich)';
COMMENT ON COLUMN orders.discount_type_snapshot IS 'Typ: PERCENT, FIXED, FREE_SHIPPING (unveränderlich)';
COMMENT ON COLUMN orders.discount_value_snapshot IS 'Wert bei PERCENT (Prozentsatz) oder FIXED (Betrag in Store-Währung)';

-- Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
                                                    id BIGSERIAL PRIMARY KEY,
                                                    order_id BIGINT NOT NULL,
                                                    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    notes TEXT,
    CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_status_history_user FOREIGN KEY (updated_by) REFERENCES users(id)
    );

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
                                         id BIGSERIAL PRIMARY KEY,
                                         store_id BIGINT NOT NULL,
                                         customer_id BIGINT NOT NULL,
                                         name VARCHAR(255) NOT NULL DEFAULT 'Meine Wunschliste',
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlists_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlists_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Wishlist Items
CREATE TABLE IF NOT EXISTS wishlist_items (
                                              id BIGSERIAL PRIMARY KEY,
                                              wishlist_id BIGINT NOT NULL,
                                              product_id BIGINT NOT NULL,
                                              variant_id BIGINT,
                                              priority VARCHAR(20) DEFAULT 'MEDIUM',
    note TEXT,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_items_wishlist FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT wishlist_items_unique UNIQUE (wishlist_id, product_id, variant_id)
    );

-- Saved Carts
CREATE TABLE IF NOT EXISTS saved_carts (
                                           id BIGSERIAL PRIMARY KEY,
                                           store_id BIGINT NOT NULL,
                                           customer_id BIGINT NOT NULL,
                                           name VARCHAR(255) NOT NULL,
    description TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_carts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_carts_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Saved Cart Items
CREATE TABLE IF NOT EXISTS saved_cart_items (
                                                id BIGSERIAL PRIMARY KEY,
                                                saved_cart_id BIGINT NOT NULL,
                                                product_id BIGINT NOT NULL,
                                                variant_id BIGINT NOT NULL,
                                                quantity INTEGER NOT NULL,
                                                price_snapshot DECIMAL(10, 2) NOT NULL,
    product_snapshot TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_cart_items_saved_cart FOREIGN KEY (saved_cart_id) REFERENCES saved_carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    );

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
                                       id BIGSERIAL PRIMARY KEY,
                                       store_id BIGINT NOT NULL,
                                       code VARCHAR(100) NOT NULL,
    code_normalized VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    percent_discount INTEGER,
    value_cents BIGINT,
    currency VARCHAR(3),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    min_subtotal_cents BIGINT,
    applies_to VARCHAR(20) NOT NULL,
    domain_scope VARCHAR(20) NOT NULL,
    usage_limit_total INTEGER,
    usage_limit_per_customer INTEGER,
    times_used_total INTEGER NOT NULL DEFAULT 0,
    combinable VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,  -- ✅ Korrigiert: is_active statt status
    auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_coupons_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_product_ids (
                                                  coupon_id BIGINT NOT NULL,
                                                  product_id BIGINT NOT NULL,
                                                  PRIMARY KEY (coupon_id, product_id),
    CONSTRAINT fk_coupon_product_ids_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_category_ids (
                                                   coupon_id BIGINT NOT NULL,
                                                   category_id BIGINT NOT NULL,
                                                   PRIMARY KEY (coupon_id, category_id),
    CONSTRAINT fk_coupon_category_ids_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_collection_ids (
                                                     coupon_id BIGINT NOT NULL,
                                                     collection_id BIGINT NOT NULL,
                                                     PRIMARY KEY (coupon_id, collection_id),
    CONSTRAINT fk_coupon_collection_ids_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_customer_emails (
                                                      coupon_id BIGINT NOT NULL,
                                                      customer_email VARCHAR(255) NOT NULL,
    PRIMARY KEY (coupon_id, customer_email),
    CONSTRAINT fk_coupon_customer_emails_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_domain_ids (
                                                 coupon_id BIGINT NOT NULL,
                                                 domain_id BIGINT NOT NULL,
                                                 PRIMARY KEY (coupon_id, domain_id),
    CONSTRAINT fk_coupon_domain_ids_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS coupon_redemptions (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  store_id BIGINT NOT NULL,
                                                  coupon_id BIGINT NOT NULL,
                                                  customer_id BIGINT,
                                                  customer_email VARCHAR(255),
    order_id BIGINT NOT NULL,
    applied_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    domain_host VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_coupon_redemptions_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_redemptions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_redemptions_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- Store Themes
CREATE TABLE IF NOT EXISTS store_themes (
                                            id BIGSERIAL PRIMARY KEY,
                                            store_id BIGINT NOT NULL,
                                            name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    template VARCHAR(50) NOT NULL,
    colors_json TEXT,
    typography_json TEXT,
    layout_json TEXT,
    custom_css TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_themes_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Homepage Sections (Homepage Builder)
CREATE TABLE IF NOT EXISTS homepage_sections (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    settings TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_homepage_sections_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_store ON homepage_sections(store_id);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_sort ON homepage_sections(store_id, sort_order);

-- Redirect Rules
CREATE TABLE IF NOT EXISTS redirect_rules (
                                              id BIGSERIAL PRIMARY KEY,
                                              store_id BIGINT NOT NULL,
                                              domain_id BIGINT,
                                              source_path VARCHAR(1000) NOT NULL,
    target_url VARCHAR(1000) NOT NULL,
    http_code INTEGER NOT NULL DEFAULT 301,
    is_regex BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    comment VARCHAR(500),
    tag VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redirect_rules_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_redirect_rules_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
    );

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
                                          id BIGSERIAL PRIMARY KEY,
                                          user_id BIGINT,
                                          action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

-- ==================================================================================
-- SPALTEN-REPARATUR: Benenne timestamp -> logged_at um (falls vorhanden)
-- ==================================================================================
DO $$
BEGIN
    -- Prüfe ob inventory_logs.timestamp existiert und benenne zu logged_at um
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'inventory_logs'
        AND column_name = 'timestamp'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'inventory_logs'
        AND column_name = 'logged_at'
    ) THEN
        ALTER TABLE inventory_logs RENAME COLUMN timestamp TO logged_at;
        RAISE NOTICE 'Renamed inventory_logs.timestamp to logged_at';
    END IF;
END $$;

-- ==================================================================================
-- INDIZES - VOLLSTÄNDIG IDEMPOTENT MIT DO-BLOCK
-- Verhindert "relation already exists" Warnungen bei Re-Runs
-- ==================================================================================

DO $$
BEGIN
    -- Stores
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_slug') THEN
CREATE INDEX idx_stores_slug ON stores(slug);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_owner') THEN
CREATE INDEX idx_stores_owner ON stores(owner_id);
END IF;

    -- Domains
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domains_host') THEN
CREATE INDEX idx_domains_host ON domains(host);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domains_store') THEN
CREATE INDEX idx_domains_store ON domains(store_id);
END IF;

    -- Categories
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_store') THEN
CREATE INDEX idx_categories_store ON categories(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_parent') THEN
CREATE INDEX idx_categories_parent ON categories(parent_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_slug') THEN
CREATE INDEX idx_categories_slug ON categories(slug);
END IF;

    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_store') THEN
CREATE INDEX idx_products_store ON products(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_category') THEN
CREATE INDEX idx_products_category ON products(category_id);
END IF;

    -- Product Media
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_media_product') THEN
CREATE INDEX idx_product_media_product ON product_media(product_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_media_media') THEN
CREATE INDEX idx_product_media_media ON product_media(media_id);
END IF;

    -- Carts
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_session_id') THEN
CREATE INDEX idx_carts_session_id ON carts(session_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_user_id') THEN
CREATE INDEX idx_carts_user_id ON carts(user_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_store_id') THEN
CREATE INDEX idx_carts_store_id ON carts(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_expires_at') THEN
CREATE INDEX idx_carts_expires_at ON carts(expires_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_reminder_sent_at') THEN
CREATE INDEX idx_carts_reminder_sent_at ON carts(reminder_sent_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_updated_at') THEN
CREATE INDEX idx_carts_updated_at ON carts(updated_at);
END IF;

    -- Cart Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_cart_id') THEN
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_variant_id') THEN
CREATE INDEX idx_cart_items_variant_id ON cart_items(variant_id);
END IF;

    -- Orders
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_store') THEN
CREATE INDEX idx_orders_store ON orders(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_customer') THEN
CREATE INDEX idx_orders_customer ON orders(customer_id);
END IF;

    -- User Roles
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user') THEN
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
END IF;

    -- Customer Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_profiles_user') THEN
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
END IF;

    -- Customer Addresses
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_addresses_customer') THEN
CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_addresses_default') THEN
CREATE INDEX idx_customer_addresses_default ON customer_addresses(customer_id, is_default);
END IF;

    -- Wishlists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_customer') THEN
CREATE INDEX idx_wishlists_customer ON wishlists(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_store') THEN
CREATE INDEX idx_wishlists_store ON wishlists(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_default') THEN
CREATE INDEX idx_wishlists_default ON wishlists(customer_id, is_default);
END IF;

    -- Wishlist Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_items_wishlist') THEN
CREATE INDEX idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_items_product') THEN
CREATE INDEX idx_wishlist_items_product ON wishlist_items(product_id);
END IF;

    -- Saved Carts
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_carts_customer') THEN
CREATE INDEX idx_saved_carts_customer ON saved_carts(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_carts_store') THEN
CREATE INDEX idx_saved_carts_store ON saved_carts(store_id);
END IF;

    -- Saved Cart Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_cart_items_cart') THEN
CREATE INDEX idx_saved_cart_items_cart ON saved_cart_items(saved_cart_id);
END IF;

    -- Coupons
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coupon_store') THEN
CREATE INDEX idx_coupon_store ON coupons(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coupon_code') THEN
CREATE INDEX idx_coupon_code ON coupons(store_id, code);
END IF;

    -- Coupon Redemptions
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_store') THEN
CREATE INDEX idx_redemption_store ON coupon_redemptions(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_coupon') THEN
CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_customer') THEN
CREATE INDEX idx_redemption_customer ON coupon_redemptions(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_order') THEN
CREATE UNIQUE INDEX idx_redemption_order ON coupon_redemptions(order_id);
END IF;

    -- Store Themes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_theme_store') THEN
CREATE INDEX idx_theme_store ON store_themes(store_id);
END IF;

    -- Inventory Logs
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_variant') THEN
CREATE INDEX idx_inventory_logs_variant ON inventory_logs(variant_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_timestamp') THEN
CREATE INDEX idx_inventory_logs_timestamp ON inventory_logs(logged_at);
END IF;

    -- Redirect Rules
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_store') THEN
CREATE INDEX idx_redirect_store ON redirect_rules(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_domain') THEN
CREATE INDEX idx_redirect_domain ON redirect_rules(domain_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_active') THEN
CREATE INDEX idx_redirect_active ON redirect_rules(is_active);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_priority') THEN
CREATE INDEX idx_redirect_priority ON redirect_rules(priority);
END IF;

END $$;

-- =====================
-- V4__add_delivery_tables.sql
-- =====================
-- Flyway Migration V4: Add Delivery Management Tables
-- Created: 2026-01-30
-- Description: Tables for delivery providers, zones, and store delivery settings
-- VOLLSTÄNDIG IDEMPOTENT

-- Explizit public Schema setzen
SET search_path TO public;

-- Store Delivery Settings (One-to-One mit Store)
CREATE TABLE IF NOT EXISTS store_delivery_settings (
                                                       store_id BIGINT PRIMARY KEY,
                                                       pickup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                                                       delivery_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                                                       express_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                                                       currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    updated_at TIMESTAMP,
    CONSTRAINT fk_store_delivery_settings_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Delivery Providers
CREATE TABLE IF NOT EXISTS delivery_providers (
                                                  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                                                  store_id BIGINT NOT NULL,
                                                  type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 100,
    config_json TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT fk_delivery_providers_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
                                              id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                                              store_id BIGINT NOT NULL,
                                              name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    postal_code_ranges TEXT,
    min_order_value DECIMAL(10, 2),
    fee_standard DECIMAL(10, 2) NOT NULL,
    fee_express DECIMAL(10, 2),
    eta_standard_minutes INTEGER NOT NULL,
    eta_express_minutes INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT fk_delivery_zones_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

-- Idempotente Indizes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_providers_store_active_priority') THEN
CREATE INDEX idx_delivery_providers_store_active_priority ON delivery_providers(store_id, is_active, priority);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_zones_store_active') THEN
CREATE INDEX idx_delivery_zones_store_active ON delivery_zones(store_id, is_active);
END IF;
END $$;

-- Comments for documentation (idempotent)
DO $$
BEGIN
    -- Table comments
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        WHERE c.relname = 'store_delivery_settings'
    ) THEN
        COMMENT ON TABLE store_delivery_settings IS 'Store-wide delivery configuration (pickup, delivery, express)';
END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        WHERE c.relname = 'delivery_providers'
    ) THEN
        COMMENT ON TABLE delivery_providers IS 'Delivery provider configurations (IN_HOUSE, WHATSAPP_DISPATCH, MANUAL, EXTERNAL)';
END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        WHERE c.relname = 'delivery_zones'
    ) THEN
        COMMENT ON TABLE delivery_zones IS 'Delivery zones with postal codes, fees, and ETAs';
END IF;

    -- Column comments (orders table from V1)
EXECUTE 'COMMENT ON COLUMN orders.delivery_type IS ''PICKUP or DELIVERY''';
EXECUTE 'COMMENT ON COLUMN orders.delivery_mode IS ''STANDARD or EXPRESS''';
EXECUTE 'COMMENT ON COLUMN orders.delivery_provider_id IS ''Selected provider (auto-chosen by routing logic)''';
END $$;

-- =====================
-- V5__add_created_at_to_cart_items.sql
-- =====================
-- Flyway Migration V5: Add missing created_at column to cart_items
-- Created: 2026-01-30
-- Description: Fixes SchemaManagementException - cart_items missing created_at/updated_at columns

-- Explizit public Schema setzen
SET search_path TO public;

-- Add created_at column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'created_at'
    ) THEN
ALTER TABLE cart_items
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

RAISE NOTICE 'Added created_at column to cart_items';
ELSE
        RAISE NOTICE 'Column created_at already exists in cart_items - skipping';
END IF;
END $$;

-- Add updated_at column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'updated_at'
    ) THEN
ALTER TABLE cart_items
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

RAISE NOTICE 'Added updated_at column to cart_items';
ELSE
        RAISE NOTICE 'Column updated_at already exists in cart_items - skipping';
END IF;
END $$;

-- Add index for created_at (optional, for queries)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_created_at') THEN
CREATE INDEX idx_cart_items_created_at ON cart_items(created_at);
RAISE NOTICE 'Created index idx_cart_items_created_at';
END IF;
END $$;

-- Verify columns exist
DO $$
DECLARE
created_exists BOOLEAN;
    updated_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'created_at'
) INTO created_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'updated_at'
) INTO updated_exists;

IF created_exists AND updated_exists THEN
        RAISE NOTICE '✅ V5 Migration successful - cart_items now has created_at and updated_at';
ELSE
        RAISE EXCEPTION 'V5 Migration failed - columns missing';
END IF;
END $$;

-- =====================
-- V9__add_store_slider_feature.sql (idempotent angepasst)
-- =====================
SET search_path TO public;

-- Store Slider Feature
-- Ermöglicht Default-Slider mit Store-spezifischen Bildern

-- Slider Settings pro Store
CREATE TABLE IF NOT EXISTS store_slider_settings (
                                                     id BIGSERIAL PRIMARY KEY,
                                                     store_id BIGINT NOT NULL UNIQUE,
                                                     override_mode VARCHAR(20) NOT NULL DEFAULT 'default_only', -- default_only | owner_only | mixed
    autoplay BOOLEAN NOT NULL DEFAULT true,
    duration_ms INTEGER NOT NULL DEFAULT 5000,
    transition_ms INTEGER NOT NULL DEFAULT 500,
    loop_enabled BOOLEAN NOT NULL DEFAULT true,
    show_dots BOOLEAN NOT NULL DEFAULT true,
    show_arrows BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_slider_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT chk_override_mode CHECK (override_mode IN ('DEFAULT_ONLY', 'OWNER_ONLY', 'MIXED')),
    CONSTRAINT chk_duration_ms CHECK (duration_ms >= 1000 AND duration_ms <= 30000),
    CONSTRAINT chk_transition_ms CHECK (transition_ms >= 100 AND transition_ms <= 3000)
    );

-- Slider Images (sowohl Default als auch Owner-Upload)
CREATE TABLE IF NOT EXISTS store_slider_images (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   store_id BIGINT NOT NULL,
                                                   media_id BIGINT NULL, -- NULL für Default-Bilder (nur URL), NOT NULL für Owner-Uploads
                                                   image_url VARCHAR(500) NOT NULL, -- Default-URL oder generiert aus Media
    image_type VARCHAR(20) NOT NULL, -- default | owner_upload
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    alt_text VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_slider_image_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_slider_image_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    CONSTRAINT chk_image_type CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD')),
    CONSTRAINT chk_media_consistency CHECK (
(image_type = 'DEFAULT' AND media_id IS NULL) OR
(image_type = 'OWNER_UPLOAD' AND media_id IS NOT NULL)
    )
    );

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_slider_images_store_id ON store_slider_images(store_id);
CREATE INDEX IF NOT EXISTS idx_slider_images_active_order ON store_slider_images(store_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_slider_images_type ON store_slider_images(store_id, image_type);

-- Default Slider Images URLs (werden bei Store-Erstellung verwendet)
CREATE TABLE IF NOT EXISTS default_slider_images (
                                                     id BIGSERIAL PRIMARY KEY,
                                                     category VARCHAR(100) NOT NULL DEFAULT 'general', -- fashion, electronics, food, general, etc.
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_default_slider_category ON default_slider_images(category, is_active, display_order);

-- Initial Default Slider Images (Placeholder URLs - können später ersetzt werden)
-- Initial Default Slider Images (idempotent)
WITH seed(category, image_url, alt_text, display_order) AS (
    VALUES
        ('general', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=400&fit=crop', 'Willkommen in unserem Shop', 1),
        ('general', 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=400&fit=crop', 'Beste Angebote', 2),
        ('general', 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=1200&h=400&fit=crop', 'Premium Produkte', 3),
        ('fashion', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop', 'Fashion Collection', 1),
        ('fashion', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop', 'Style & Trends', 2),
        ('electronics', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=400&fit=crop', 'Tech Innovation', 1),
        ('electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=400&fit=crop', 'Latest Gadgets', 2),
        ('food', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop', 'Frische Zutaten', 1),
        ('food', 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=400&fit=crop', 'Leckere Gerichte', 2)
)
INSERT INTO default_slider_images (category, image_url, alt_text, display_order)
SELECT s.category, s.image_url, s.alt_text, s.display_order
FROM seed s
WHERE NOT EXISTS (
    SELECT 1
    FROM default_slider_images d
    WHERE d.category = s.category AND d.image_url = s.image_url
);

-- =====================
-- V2__initial_data.sql
-- =====================
-- Flyway Migration V2: Initial Data
-- Fügt Standard-Daten hinzu

-- Explizit public Schema setzen
SET search_path TO public;

-- Initial Plans (synchronisiert mit PlanConfig.java)
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('FREE', 2, 0, 1, 1000, 100, 10)
    ON CONFLICT (name) DO UPDATE SET
        max_stores = 2,
        max_products = 100,
        max_storage_mb = 1000,
        max_image_count = 10;

INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('PRO', 4, 5, 10, 10000, 1000, 100)
    ON CONFLICT (name) DO UPDATE SET
        max_stores = 4,
        max_products = 1000,
        max_storage_mb = 10000;

INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('ENTERPRISE', -1, -1, -1, -1, -1, -1)
    ON CONFLICT (name) DO NOTHING;

-- =====================
-- V3__setup_permissions.sql
-- =====================
-- Flyway Migration V3: Setup Database Permissions (MINIMAL VERSION)
-- WARNUNG: Diese Migration wurde auf minimal reduziert um Locks zu vermeiden
-- Die vollständigen Permissions werden AUSSERHALB von Flyway gesetzt (via fix-db-password.sh)

-- Explizit public Schema setzen
SET search_path TO public;

-- Setze nur KRITISCHE Basis-Rechte (schnell, kein Lock-Risiko)
DO $$
BEGIN
    -- Prüfe ob storeapp User existiert
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'storeapp') THEN

        RAISE NOTICE 'V3: Setting minimal permissions for storeapp (fast)';

        -- Nur Basis-Schema-Rechte (KEIN Owner-Wechsel!)
        GRANT USAGE ON SCHEMA public TO storeapp;
        GRANT CREATE ON SCHEMA public TO storeapp;

        -- Grant auf existierende Objekte (schnell)
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

        RAISE NOTICE 'V3: Minimal permissions set - full permissions are handled by deployment scripts';

ELSE
        RAISE NOTICE 'V3: User storeapp does not exist yet - skipping (will be handled by deployment)';
END IF;
END $$;

-- HINWEIS: Vollständige Permissions (inkl. DEFAULT PRIVILEGES) werden von
-- fix-db-password.sh gesetzt, welches VOR diesem Flyway-Lauf ausgeführt wird!
-- Siehe: .github/workflows/deploy.yml → "Setup PostgreSQL Database" Step

/* =====================================================================================
   Squashed additions: V10 - V16
   - Marketplace features (supplier/reseller)
   - cart_items timestamps repair
   - media schema alignment
   ===================================================================================== */

SET search_path TO public;

/* -------- V10: Marketplace features -------- */

-- 1) Extend products for supplier catalog
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT,
    ADD COLUMN IF NOT EXISTS is_supplier_catalog BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2);

-- store_id must be nullable for supplier catalog products
ALTER TABLE public.products
    ALTER COLUMN store_id DROP NOT NULL;

-- FK: products.supplier_id -> users.id (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_products_supplier'
      AND conrelid = 'public.products'::regclass
  ) THEN
ALTER TABLE public.products
    ADD CONSTRAINT fk_products_supplier
        FOREIGN KEY (supplier_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF;
END $$;

-- Indexes for supplier/catalog queries
CREATE INDEX IF NOT EXISTS idx_products_supplier
    ON public.products(supplier_id)
    WHERE is_supplier_catalog = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_catalog
    ON public.products(is_supplier_catalog);

-- 2) store_products mapping (reseller imports supplier products)
CREATE TABLE IF NOT EXISTS public.store_products (
                                                     id BIGSERIAL PRIMARY KEY,
                                                     store_id BIGINT NOT NULL,
                                                     supplier_product_id BIGINT NOT NULL,

                                                     retail_price DECIMAL(10, 2) NOT NULL,
    margin_percentage DECIMAL(5, 4),

    is_active BOOLEAN DEFAULT TRUE,

    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_store_products_store
    FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_store_products_supplier_product
    FOREIGN KEY (supplier_product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT uq_store_product UNIQUE (store_id, supplier_product_id)
    );

CREATE INDEX IF NOT EXISTS idx_store_products_store
    ON public.store_products(store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_products_supplier
    ON public.store_products(supplier_product_id);

-- 3) commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  order_id BIGINT NOT NULL,
                                                  order_item_id BIGINT NOT NULL,

                                                  recipient_type VARCHAR(20) NOT NULL,
    recipient_id BIGINT,

    amount DECIMAL(10, 2) NOT NULL,
    percentage DECIMAL(5, 4),

    status VARCHAR(20) DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,

    CONSTRAINT fk_commissions_order
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_commissions_order_item
    FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE,
    CONSTRAINT chk_recipient_type
    CHECK (recipient_type IN ('SUPPLIER', 'RESELLER', 'PLATFORM'))
    );

CREATE INDEX IF NOT EXISTS idx_commissions_order
    ON public.commissions(order_id);

CREATE INDEX IF NOT EXISTS idx_commissions_recipient
    ON public.commissions(recipient_type, recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_commissions_status
    ON public.commissions(status);

-- 4) Extend order_items
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS store_product_id BIGINT,
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT,
    ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5, 4) DEFAULT 0.05;

-- FK: order_items.store_product_id -> store_products.id (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_order_items_store_product'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
ALTER TABLE public.order_items
    ADD CONSTRAINT fk_order_items_store_product
        FOREIGN KEY (store_product_id) REFERENCES public.store_products(id) ON DELETE SET NULL;
END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_store_product
    ON public.order_items(store_product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_supplier
    ON public.order_items(supplier_id);

-- 5) Data migration: rename ROLE_STORE_OWNER -> ROLE_RESELLER (idempotent)
UPDATE public.user_roles
SET role = 'ROLE_RESELLER'
WHERE role = 'ROLE_STORE_OWNER';

-- 6) platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
                                                        id BIGSERIAL PRIMARY KEY,
                                                        setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('platform_fee_percentage', '0.05', 'Platform commission percentage (5%)')
    ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('recommended_reseller_margin', '0.30', 'Recommended reseller markup (30%)')
    ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE public.store_products IS 'Maps supplier products to reseller stores with custom pricing';
COMMENT ON TABLE public.commissions IS 'Tracks revenue split: supplier gets wholesale_price, reseller gets margin, platform gets fee';
COMMENT ON COLUMN public.products.is_supplier_catalog IS 'TRUE = supplier product in catalog, FALSE = reseller-owned product';
COMMENT ON COLUMN public.products.wholesale_price IS 'Supplier base price that resellers pay (not visible to customers)';
COMMENT ON COLUMN public.order_items.store_product_id IS 'NULL for direct store products, set for imported supplier products';

/* -------- V13: cart_items timestamp repair -------- */

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_items' AND column_name='created_at'
  ) THEN
ALTER TABLE public.cart_items
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_items' AND column_name='updated_at'
  ) THEN
ALTER TABLE public.cart_items
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
END IF;

  -- drop default on created_at if column exists (matches original migration intent)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_items' AND column_name='created_at'
  ) THEN
ALTER TABLE public.cart_items
    ALTER COLUMN created_at DROP DEFAULT;
END IF;
END $$;

/* -------- V11/V12/V14/V15/V16: media schema alignment (final, idempotent) -------- */

DO $$
BEGIN
  -- filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='file_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN file_name TO filename';
END IF;

  -- original_filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN original_name TO original_filename';
END IF;

  -- content_type: rename mime_type -> content_type if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='mime_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN mime_type TO content_type';
END IF;

  -- ensure content_type exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN content_type VARCHAR(100)';
END IF;

  -- ensure minio_object_name exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='minio_object_name'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN minio_object_name VARCHAR(500)';
END IF;

  -- ensure media_type exists (if your app expects it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='media_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN media_type VARCHAR(50)';
END IF;

  -- backfill + NOT NULL for content_type
EXECUTE 'UPDATE public.media
           SET content_type = COALESCE(content_type, ''application/octet-stream'')
           WHERE content_type IS NULL';

EXECUTE 'ALTER TABLE public.media ALTER COLUMN content_type SET NOT NULL';
END $$;

-- ==================================================================================
-- INDIZES - VOLLSTÄNDIG IDEMPOTENT MIT DO-BLOCK
-- Verhindert "relation already exists" Warnungen bei Re-Runs
-- ==================================================================================

DO $$
BEGIN
    -- Stores
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_slug') THEN
CREATE INDEX idx_stores_slug ON stores(slug);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_owner') THEN
CREATE INDEX idx_stores_owner ON stores(owner_id);
END IF;

    -- Domains
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domains_host') THEN
CREATE INDEX idx_domains_host ON domains(host);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domains_store') THEN
CREATE INDEX idx_domains_store ON domains(store_id);
END IF;

    -- Categories
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_store') THEN
CREATE INDEX idx_categories_store ON categories(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_parent') THEN
CREATE INDEX idx_categories_parent ON categories(parent_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_slug') THEN
CREATE INDEX idx_categories_slug ON categories(slug);
END IF;

    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_store') THEN
CREATE INDEX idx_products_store ON products(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_category') THEN
CREATE INDEX idx_products_category ON products(category_id);
END IF;

    -- Product Media
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_media_product') THEN
CREATE INDEX idx_product_media_product ON product_media(product_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_media_media') THEN
CREATE INDEX idx_product_media_media ON product_media(media_id);
END IF;

    -- Carts
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_session_id') THEN
CREATE INDEX idx_carts_session_id ON carts(session_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_user_id') THEN
CREATE INDEX idx_carts_user_id ON carts(user_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_store_id') THEN
CREATE INDEX idx_carts_store_id ON carts(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_expires_at') THEN
CREATE INDEX idx_carts_expires_at ON carts(expires_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_reminder_sent_at') THEN
CREATE INDEX idx_carts_reminder_sent_at ON carts(reminder_sent_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carts_updated_at') THEN
CREATE INDEX idx_carts_updated_at ON carts(updated_at);
END IF;

    -- Cart Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_cart_id') THEN
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_variant_id') THEN
CREATE INDEX idx_cart_items_variant_id ON cart_items(variant_id);
END IF;

    -- Orders
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_store') THEN
CREATE INDEX idx_orders_store ON orders(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_customer') THEN
CREATE INDEX idx_orders_customer ON orders(customer_id);
END IF;

    -- User Roles
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user') THEN
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
END IF;

    -- Customer Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_profiles_user') THEN
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
END IF;

    -- Customer Addresses
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_addresses_customer') THEN
CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_addresses_default') THEN
CREATE INDEX idx_customer_addresses_default ON customer_addresses(customer_id, is_default);
END IF;

    -- Wishlists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_customer') THEN
CREATE INDEX idx_wishlists_customer ON wishlists(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_store') THEN
CREATE INDEX idx_wishlists_store ON wishlists(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlists_default') THEN
CREATE INDEX idx_wishlists_default ON wishlists(customer_id, is_default);
END IF;

    -- Wishlist Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_items_wishlist') THEN
CREATE INDEX idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wishlist_items_product') THEN
CREATE INDEX idx_wishlist_items_product ON wishlist_items(product_id);
END IF;

    -- Saved Carts
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_carts_customer') THEN
CREATE INDEX idx_saved_carts_customer ON saved_carts(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_carts_store') THEN
CREATE INDEX idx_saved_carts_store ON saved_carts(store_id);
END IF;

    -- Saved Cart Items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saved_cart_items_cart') THEN
CREATE INDEX idx_saved_cart_items_cart ON saved_cart_items(saved_cart_id);
END IF;

    -- Coupons
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coupon_store') THEN
CREATE INDEX idx_coupon_store ON coupons(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coupon_code') THEN
CREATE INDEX idx_coupon_code ON coupons(store_id, code);
END IF;

    -- Coupon Redemptions
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_store') THEN
CREATE INDEX idx_redemption_store ON coupon_redemptions(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_coupon') THEN
CREATE INDEX idx_redemption_coupon ON coupon_redemptions(coupon_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_customer') THEN
CREATE INDEX idx_redemption_customer ON coupon_redemptions(customer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redemption_order') THEN
CREATE UNIQUE INDEX idx_redemption_order ON coupon_redemptions(order_id);
END IF;

    -- Store Themes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_theme_store') THEN
CREATE INDEX idx_theme_store ON store_themes(store_id);
END IF;

    -- Inventory Logs
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_variant') THEN
CREATE INDEX idx_inventory_logs_variant ON inventory_logs(variant_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_timestamp') THEN
CREATE INDEX idx_inventory_logs_timestamp ON inventory_logs(logged_at);
END IF;

    -- Redirect Rules
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_store') THEN
CREATE INDEX idx_redirect_store ON redirect_rules(store_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_domain') THEN
CREATE INDEX idx_redirect_domain ON redirect_rules(domain_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_active') THEN
CREATE INDEX idx_redirect_active ON redirect_rules(is_active);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_redirect_priority') THEN
CREATE INDEX idx_redirect_priority ON redirect_rules(priority);
END IF;

END $$;


-- =====================
-- V18: Missing Tables and Coupon Status Fix
-- =====================
-- Description: Adds all missing tables that exist as Entities but not in V17 baseline schema
-- Tables: phone_verifications, seo_assets, seo_settings, structured_data_templates, subscriptions
-- PLUS: Fixes coupon.is_active -> coupon.status migration

SET search_path TO public;

-- =====================
-- 1. Phone Verifications
-- =====================
CREATE TABLE IF NOT EXISTS phone_verifications (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    code VARCHAR(10) NOT NULL,
    store_id BIGINT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    channel VARCHAR(20),
    CONSTRAINT fk_phone_verifications_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_phone_number ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_created_at ON phone_verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_expires_at ON phone_verifications(expires_at);

-- =====================
-- 2. SEO Assets
-- =====================
CREATE TABLE IF NOT EXISTS seo_assets (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    size_bytes BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seo_assets_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seo_asset_store ON seo_assets(store_id);

-- =====================
-- 3. SEO Settings
-- =====================
CREATE TABLE IF NOT EXISTS seo_settings (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL UNIQUE,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(500),
    og_image_url VARCHAR(1000),
    twitter_handle VARCHAR(100),
    robots_txt TEXT,
    sitemap_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    robots_index BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seo_settings_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================
-- 4. Structured Data Templates
-- =====================
CREATE TABLE IF NOT EXISTS structured_data_templates (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    template_json TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_structured_data_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_struct_store_type ON structured_data_templates(store_id, type);

-- =====================
-- 5. Subscriptions
-- =====================
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    renewal_date TIMESTAMP,
    payment_method VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON subscriptions(renewal_date);

-- =====================
-- 6. FIX: Coupon Status Field (is_active -> status)
-- =====================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'status'
    ) THEN
        ALTER TABLE coupons ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
        RAISE NOTICE 'Added status column to coupons';
    END IF;
END $$;

UPDATE coupons
SET status = CASE
    WHEN is_active = TRUE THEN 'ACTIVE'
    WHEN is_active = FALSE THEN 'INACTIVE'
    ELSE 'ACTIVE'
END
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'is_active'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE coupons DROP COLUMN is_active;
        RAISE NOTICE 'Dropped is_active column from coupons';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_coupon_status' AND conrelid = 'coupons'::regclass
    ) THEN
        ALTER TABLE coupons ADD CONSTRAINT chk_coupon_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SCHEDULED'));
        RAISE NOTICE 'Added CHECK constraint for coupon status';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_status ON coupons(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'description'
    ) THEN
        ALTER TABLE coupons ADD COLUMN description VARCHAR(500);
        RAISE NOTICE 'Added description column to coupons';
    END IF;
END $$;

-- =====================================================
-- V10: DROPSHIPPING SYSTEM - PHASE 1
-- =====================================================
-- Dropshipping Sources (Supplier Links per Variant)
CREATE TABLE IF NOT EXISTS dropshipping_sources (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    supplier_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    supplier_url VARCHAR(1000) NOT NULL,
    supplier_name VARCHAR(255),
    purchase_price DECIMAL(10, 2) NOT NULL CHECK (purchase_price >= 0),
    estimated_shipping_days INTEGER CHECK (estimated_shipping_days >= 0),
    supplier_sku VARCHAR(255),
    cj_product_id VARCHAR(255),
    cj_variant_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,

    CONSTRAINT fk_dropshipping_sources_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_dropshipping_sources_creator
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_dropshipping_sources_variant
        UNIQUE (variant_id),
    CONSTRAINT check_supplier_type
        CHECK (supplier_type IN ('MANUAL', 'CJ'))
);

CREATE INDEX IF NOT EXISTS idx_dropshipping_sources_variant ON dropshipping_sources(variant_id);
CREATE INDEX IF NOT EXISTS idx_dropshipping_sources_creator ON dropshipping_sources(created_by);

-- Supplier Connections (API Tokens per Store)
CREATE TABLE IF NOT EXISTS supplier_connections (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    supplier_type VARCHAR(20) NOT NULL,
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_supplier_connections_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT uk_supplier_connections_store_type
        UNIQUE (store_id, supplier_type),
    CONSTRAINT check_supplier_connection_type
        CHECK (supplier_type IN ('CJ', 'ALIEXPRESS', 'ALIBABA'))
);

CREATE INDEX IF NOT EXISTS idx_supplier_connections_store ON supplier_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_connections_type ON supplier_connections(supplier_type);

-- Order Items Fulfillment Tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'fulfillment_status') THEN
        ALTER TABLE order_items ADD COLUMN fulfillment_status VARCHAR(50) DEFAULT 'PENDING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'supplier_order_id') THEN
        ALTER TABLE order_items ADD COLUMN supplier_order_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'supplier_tracking_number') THEN
        ALTER TABLE order_items ADD COLUMN supplier_tracking_number VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'supplier_carrier') THEN
        ALTER TABLE order_items ADD COLUMN supplier_carrier VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'ordered_from_supplier_at') THEN
        ALTER TABLE order_items ADD COLUMN ordered_from_supplier_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'fulfilled_at') THEN
        ALTER TABLE order_items ADD COLUMN fulfilled_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'fulfillment_notes') THEN
        ALTER TABLE order_items ADD COLUMN fulfillment_notes TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status ON order_items(fulfillment_status);

-- =====================
-- Comments
-- =====================
COMMENT ON TABLE dropshipping_sources IS 'Supplier links and purchase prices for dropshipping variants (ROLE_RESELLER)';
COMMENT ON COLUMN dropshipping_sources.supplier_url IS 'Full URL to supplier product (Alibaba, AliExpress, CJ, etc.)';
COMMENT ON COLUMN dropshipping_sources.purchase_price IS 'Purchase price from supplier for margin calculation';
COMMENT ON COLUMN order_items.fulfillment_status IS 'Dropshipping fulfillment: PENDING, ORDERED, SHIPPED, DELIVERED, CANCELLED';

COMMENT ON TABLE phone_verifications IS 'SMS/WhatsApp verification codes for order checkout';
COMMENT ON TABLE seo_assets IS 'SEO-related assets like OG images, favicons, etc.';
COMMENT ON TABLE seo_settings IS 'Store-specific SEO metadata and configuration';
COMMENT ON TABLE structured_data_templates IS 'JSON-LD schema.org templates with Mustache variables';
COMMENT ON TABLE subscriptions IS 'User subscription/plan management with billing cycles';
COMMENT ON COLUMN coupons.status IS 'Coupon status: ACTIVE, INACTIVE, EXPIRED, SCHEDULED';

-- =====================
-- V19: stock Spalte für Produkte (Lagerbestand für einfache Produkte ohne Varianten)
-- =====================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'stock'
    ) THEN
        ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ V19: Added stock column to products';
    ELSE
        RAISE NOTICE 'stock already exists in products - skipping';
    END IF;
END $$;

-- =====================
-- V20: preferred_language für Users (Email-Templates)
-- =====================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) NOT NULL DEFAULT 'en';
        ALTER TABLE users ADD CONSTRAINT chk_users_language CHECK (preferred_language IN ('en', 'de', 'ar'));
        RAISE NOTICE '✅ V20: Added preferred_language to users';
    ELSE
        RAISE NOTICE 'preferred_language already exists in users - skipping';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- =====================
-- Final Verification
-- =====================
DO $$
DECLARE
    status_exists BOOLEAN;
    is_active_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'status'
    ) INTO status_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'is_active'
    ) INTO is_active_exists;

    IF status_exists AND NOT is_active_exists THEN
        RAISE NOTICE '✅ V17 Extended - All tables created and coupon status fixed';
    ELSE
        RAISE EXCEPTION 'V17 Extended failed - coupon status migration incomplete: status=% is_active=%', status_exists, is_active_exists;
    END IF;
END $$;

-- =====================
-- V21: Store Banner Settings (Promo / Breaking-News Banner)
-- =====================
SET search_path TO public;

CREATE TABLE IF NOT EXISTS store_banner_settings (
    store_id BIGINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    position VARCHAR(10) NOT NULL DEFAULT 'top',
    bg_color VARCHAR(30) NOT NULL DEFAULT '#667eea',
    text_color VARCHAR(30) NOT NULL DEFAULT '#ffffff',
    animation_speed INTEGER NOT NULL DEFAULT 60,
    texts_json TEXT DEFAULT '{"de":"🎉 Du erhältst heute Rabatt auf ausgewählte Produkte!","en":"🎉 Get a discount on selected products today!","ar":"🎉 احصل على خصم على منتجات مختارة اليوم!"}',
    icon VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_banner_settings_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT chk_banner_position CHECK (position IN ('top', 'bottom')),
    CONSTRAINT chk_banner_speed CHECK (animation_speed >= 0 AND animation_speed <= 500)
);

CREATE INDEX IF NOT EXISTS idx_banner_store_id ON store_banner_settings(store_id);

-- ==================================================================================
-- V18: WhatsApp Notifications für bestehende Datenbanken
-- ==================================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE public.stores ADD COLUMN whatsapp_number VARCHAR(50);
        RAISE NOTICE '✅ V18: stores.whatsapp_number hinzugefügt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'whatsapp_notifications_enabled'
    ) THEN
        ALTER TABLE public.stores ADD COLUMN whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE '✅ V18: stores.whatsapp_notifications_enabled hinzugefügt';
    END IF;
END $$;

-- ==================================================================================
-- V22: Telegram Bot Integration
-- Neue Tabellen: telegram_store_config + telegram_import_log
-- VOLLSTÄNDIG IDEMPOTENT
-- ==================================================================================
SET search_path TO public;

-- Telegram Konfiguration pro Store (Bot-Token + Channel + Flags)
CREATE TABLE IF NOT EXISTS telegram_store_config (
    id                   BIGSERIAL PRIMARY KEY,
    store_id             BIGINT NOT NULL UNIQUE,
    bot_token            VARCHAR(500),
    channel_id           VARCHAR(100),
    notify_new_orders    BOOLEAN NOT NULL DEFAULT TRUE,
    notify_low_stock     BOOLEAN NOT NULL DEFAULT FALSE,
    post_new_products    BOOLEAN NOT NULL DEFAULT FALSE,
    low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
    import_limit         INTEGER NOT NULL DEFAULT 50,
    is_active            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telegram_config_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_config_store ON telegram_store_config(store_id);

-- Telegram Import-Protokoll (Deduplizierung via UNIQUE constraint)
CREATE TABLE IF NOT EXISTS telegram_import_log (
    id                BIGSERIAL PRIMARY KEY,
    store_id          BIGINT NOT NULL,
    channel_id        VARCHAR(100) NOT NULL,
    telegram_msg_id   BIGINT NOT NULL,
    product_id        BIGINT,
    status            VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    error_message     TEXT,
    imported_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telegram_import_log_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT uq_telegram_import
        UNIQUE (store_id, channel_id, telegram_msg_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_import_store ON telegram_import_log(store_id);
CREATE INDEX IF NOT EXISTS idx_telegram_import_status ON telegram_import_log(store_id, status);

COMMENT ON TABLE telegram_store_config IS 'Telegram Bot Konfiguration pro Store (BotFather Token + Channel)';
COMMENT ON TABLE telegram_import_log IS 'Protokoll der Telegram-Channel-Imports mit Deduplizierung';
COMMENT ON COLUMN telegram_store_config.bot_token IS 'BotFather Token – Bot muss Channel-Admin sein';
COMMENT ON COLUMN telegram_store_config.channel_id IS '@username oder numerische Channel-ID';
COMMENT ON COLUMN telegram_import_log.telegram_msg_id IS 'Telegram Message-ID für Duplikat-Check';

RAISE NOTICE '✅ V22: Telegram-Tabellen erstellt (telegram_store_config, telegram_import_log)';

-- ==================================================================================
-- V23: Telegram MTProto Channel Importer
-- Tabelle: telegram_mtproto_config (api_id + api_hash + session_string pro Store)
-- VOLLSTÄNDIG IDEMPOTENT
-- ==================================================================================
SET search_path TO public;

CREATE TABLE IF NOT EXISTS telegram_mtproto_config (
    id                      BIGSERIAL PRIMARY KEY,
    store_id                BIGINT NOT NULL UNIQUE,
    api_id                  INTEGER,
    api_hash                VARCHAR(255),
    phone                   VARCHAR(50),
    session_string          TEXT,               -- Telethon StringSession (verschlüsselt empfohlen)
    is_authenticated        BOOLEAN NOT NULL DEFAULT FALSE,
    watched_channels        TEXT DEFAULT '[]',  -- JSON-Array: ["@kanal1", "@kanal2"]
    last_message_ids        TEXT DEFAULT '{}',  -- JSON-Map: {"@kanal": 1234} für Delta-Import
    import_limit            INTEGER NOT NULL DEFAULT 50,
    is_active               BOOLEAN NOT NULL DEFAULT FALSE,
    pending_phone_code_hash VARCHAR(255),       -- Temporär während Auth-Flow
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telegram_mtproto_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_mtproto_store ON telegram_mtproto_config(store_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mtproto_active ON telegram_mtproto_config(is_authenticated, is_active);

COMMENT ON TABLE telegram_mtproto_config IS 'MTProto-Credentials pro Store (api_id+api_hash+session). NIEMALS session_string in Logs drucken!';
COMMENT ON COLUMN telegram_mtproto_config.session_string IS 'Telethon StringSession – bleibt gültig bis Logout. Nicht im Frontend anzeigen.';
COMMENT ON COLUMN telegram_mtproto_config.watched_channels IS 'JSON-Array der zu importierenden Channels';
COMMENT ON COLUMN telegram_mtproto_config.last_message_ids IS 'Delta-Import: letzte importierte Message-ID je Channel';

RAISE NOTICE '✅ V23: telegram_mtproto_config erstellt';



-- ════════════════════════════════════════════════════════════════════════════
-- V25: security_events – Erweitert für Enums + Login-Tracking + IP-Details
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    request_id VARCHAR(100),
    
    -- Event Classification
    event_type VARCHAR(50),          -- Enum: LOGIN_SUCCESS, LOGIN_FAILED, REGISTRATION_ATTEMPT, etc.
    http_method VARCHAR(10),         -- POST, GET, PUT, DELETE
    http_status INTEGER,
    
    endpoint VARCHAR(200) NOT NULL,
    
    -- IP Information (Multi-Proxy-Support)
    client_ip VARCHAR(50),           -- Berechnete echte IP (IpAddressUtil)
    remote_addr VARCHAR(50),         -- Request.getRemoteAddr()
    x_forwarded_for VARCHAR(200),    -- X-Forwarded-For Header
    x_real_ip VARCHAR(50),           -- X-Real-IP Header (NGINX)
    
    user_agent VARCHAR(500),
    
    -- DSGVO-konforme Email-Felder
    email_masked VARCHAR(100),       -- te***@example.com
    email_hash VARCHAR(64),          -- SHA-256(email + pepper)
    email_domain VARCHAR(100),       -- example.com
    
    phone_masked VARCHAR(50),        -- +49***1234
    
    -- Protection Mechanisms
    captcha_present BOOLEAN,
    captcha_valid BOOLEAN,
    honeypot_triggered BOOLEAN,
    rate_limit_type VARCHAR(50),     -- Enum: IP, EMAIL, DOMAIN, PHONE, ENDPOINT
    
    blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason VARCHAR(200),       -- Enum: CAPTCHA_INVALID, IP_RATE_LIMIT, etc.
    
    -- Mail-Related
    mail_type VARCHAR(50),           -- Enum: STORE_ACCESS, EMAIL_VERIFICATION, etc.
    mail_triggered BOOLEAN,          -- Mail wurde ausgelöst
    mail_sent BOOLEAN,               -- Mail tatsächlich versendet
    
    -- Emergency Controls
    kill_switch_triggered BOOLEAN,
    circuit_breaker_triggered BOOLEAN,
    
    -- Login-Tracking
    login_success BOOLEAN,           -- Bei Login-Events: true/false
    
    -- Bot Detection
    risk_score INTEGER,              -- 0-100 (optional)
    
    -- External Sources
    origin VARCHAR(200),             -- Origin-Header (CORS)
    referer VARCHAR(500),            -- Referer-Header
    
    -- Relations
    store_id BIGINT,
    user_id BIGINT,
    
    CONSTRAINT fk_security_events_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance-Indizes für Grafana
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_endpoint ON security_events(endpoint);
CREATE INDEX IF NOT EXISTS idx_security_events_client_ip ON security_events(client_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_blocked ON security_events(blocked);
CREATE INDEX IF NOT EXISTS idx_security_events_email_domain ON security_events(email_domain);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_email_hash ON security_events(email_hash);
CREATE INDEX IF NOT EXISTS idx_security_events_mail_type ON security_events(mail_type);
CREATE INDEX IF NOT EXISTS idx_security_events_login_success ON security_events(login_success);

-- Composite Indizes für spezifische Queries
CREATE INDEX IF NOT EXISTS idx_security_events_login_analysis 
    ON security_events(endpoint, login_success, created_at) 
    WHERE endpoint = '/api/auth/login';

CREATE INDEX IF NOT EXISTS idx_security_events_mail_analysis 
    ON security_events(mail_type, mail_sent, created_at) 
    WHERE mail_sent = true;

-- Constraints: Daten-Integrität auf DB-Ebene erzwingen
ALTER TABLE security_events
DROP CONSTRAINT IF EXISTS chk_mail_sent_not_when_blocked;

ALTER TABLE security_events
ADD CONSTRAINT chk_mail_sent_not_when_blocked
CHECK (
    mail_sent = FALSE
    OR blocked = FALSE
);

-- Dokumentation
COMMENT ON TABLE security_events IS 'Security Audit Log: CAPTCHA, Rate Limiting, Honeypot, Bot Protection, Login-Tracking';
COMMENT ON COLUMN security_events.email_masked IS 'DSGVO-konform: te***@example.com (nie volle E-Mail)';
COMMENT ON COLUMN security_events.email_hash IS 'SHA-256(normalized_email + server_pepper) für Analytics';
COMMENT ON COLUMN security_events.phone_masked IS 'DSGVO-konform: +49***1234 (nie volle Nummer)';
COMMENT ON COLUMN security_events.blocked IS 'true = Request blockiert, false = durchgelassen';
COMMENT ON COLUMN security_events.mail_triggered IS 'true = Request wollte eine E-Mail versenden (unabhängig ob blockiert)';
COMMENT ON COLUMN security_events.mail_sent IS 'true = E-Mail wurde TATSÄCHLICH erfolgreich versendet (nur wenn blocked=false)';
COMMENT ON COLUMN security_events.login_success IS 'Bei Login-Events: true = erfolgreich, false = fehlgeschlagen';


COMMENT ON CONSTRAINT chk_mail_sent_not_when_blocked ON security_events IS 
  'Verhindert inkonsistente Daten: blocked=true und mail_sent=true dürfen niemals gleichzeitig gesetzt sein.';

RAISE NOTICE '✅ V25: security_events erweitert';
