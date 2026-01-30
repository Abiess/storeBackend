-- Flyway Migration V1: Initial Schema
-- Erstellt alle benötigten Tabellen für das Store Backend
-- Optimiert für PostgreSQL - VOLLSTÄNDIG IDEMPOTENT

-- Explizit public Schema setzen
SET search_path TO public;

-- Plans Tabelle (muss zuerst erstellt werden wegen FK)
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    plan_id BIGINT,
    CONSTRAINT fk_users_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Stores Tabelle
CREATE TABLE IF NOT EXISTS stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    owner_id BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

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
    filename VARCHAR(255) NOT NULL,
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
    store_id BIGINT NOT NULL,
    category_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN DEFAULT FALSE,
    featured_order INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    sales_count BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Product Options
CREATE TABLE IF NOT EXISTS product_options (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_options_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Option Values
CREATE TABLE IF NOT EXISTS product_option_values (
    id BIGSERIAL PRIMARY KEY,
    option_id BIGINT NOT NULL,
    value VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_option_values_option FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
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
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_logs_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

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
    status VARCHAR(20) NOT NULL,
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
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_themes_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

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
        CREATE INDEX idx_coupon_code ON coupons(store_id, code_normalized);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coupon_status') THEN
        CREATE INDEX idx_coupon_status ON coupons(status);
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

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_theme_active') THEN
        CREATE INDEX idx_theme_active ON store_themes(store_id, is_active);
    END IF;

    -- Inventory Logs
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_variant') THEN
        CREATE INDEX idx_inventory_logs_variant ON inventory_logs(variant_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_logs_timestamp') THEN
        CREATE INDEX idx_inventory_logs_timestamp ON inventory_logs(timestamp);
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
