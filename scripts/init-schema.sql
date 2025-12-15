-- Database Schema Creation Script
-- Erstellt alle benötigten Tabellen für das Store Backend

-- Lösche existierende Tabellen (CASCADE löscht auch Foreign Keys)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_media CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_option_values CASCADE;
DROP TABLE IF EXISTS product_options CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS store_usage CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Plans Tabelle (muss zuerst erstellt werden wegen FK)
CREATE TABLE plans (
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
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    plan_id BIGINT,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- User Roles (Join-Tabelle)
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stores Tabelle
CREATE TABLE stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    owner_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Domains Tabelle
CREATE TABLE domains (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    host VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Store Usage Tracking
CREATE TABLE store_usage (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL UNIQUE,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    product_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Media Tabelle
CREATE TABLE media (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    minio_object_name VARCHAR(500) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    alt_text VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Categories Tabelle
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_id BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT uk_category_slug_per_store UNIQUE (store_id, slug)
);

-- Products Tabelle
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    category_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Product Options (z.B. Größe, Farbe)
CREATE TABLE product_options (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Option Values (z.B. S, M, L für Größe)
CREATE TABLE product_option_values (
    id BIGSERIAL PRIMARY KEY,
    option_id BIGINT NOT NULL,
    value VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
);

-- Product Variants (Kombinationen von Options)
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    option_values TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Media (Join-Tabelle)
CREATE TABLE product_media (
    product_id BIGINT NOT NULL,
    media_id BIGINT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, media_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Orders Tabelle
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    store_id BIGINT NOT NULL,
    customer_id BIGINT,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- Order Items
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    variant_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Order Status History
CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Initiale Daten: FREE Plan
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('FREE', 1, 0, 1, 100, 50, 100)
ON CONFLICT (name) DO NOTHING;

-- Erstelle Indizes für Performance
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_domains_host ON domains(host);
CREATE INDEX idx_domains_store ON domains(store_id);
CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- Grant permissions to storeapp user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO storeapp;

COMMIT;
