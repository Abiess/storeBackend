-- Flyway Migration: Squashed Baseline up to V9
-- Enthält: V1 initial_schema, V2 initial_data, V3 permissions, V4 delivery tables, V5 cart_items timestamps, V9 store slider feature
-- Optimiert für PostgreSQL

SET search_path TO public;

-- =====================
-- V1__initial_schema.sql
-- =====================
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
CREATE INDEX idx_inventory_logs_timestamp ON inventory_logs("timestamp");
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
    CONSTRAINT chk_override_mode CHECK (override_mode IN ('default_only', 'owner_only', 'mixed')),
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
    CONSTRAINT chk_image_type CHECK (image_type IN ('default', 'owner_upload')),
    CONSTRAINT chk_media_consistency CHECK (
(image_type = 'default' AND media_id IS NULL) OR
(image_type = 'owner_upload' AND media_id IS NOT NULL)
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

-- FREE Plan
INSERT INTO plans (name, max_stores, max_custom_domains, max_subdomains, max_storage_mb, max_products, max_image_count)
VALUES ('FREE', 1, 0, 1, 100, 50, 100)
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
                                                        key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO public.platform_settings (key, value, description)
VALUES ('platform_fee_percentage', '0.05', 'Platform commission percentage (5%)')
    ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_settings (key, value, description)
VALUES ('recommended_reseller_margin', '0.30', 'Recommended reseller markup (30%)')
    ON CONFLICT (key) DO NOTHING;

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
CREATE INDEX idx_inventory_logs_timestamp ON inventory_logs("timestamp");
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

-- =====================
-- Comments
-- =====================
COMMENT ON TABLE phone_verifications IS 'SMS/WhatsApp verification codes for order checkout';
COMMENT ON TABLE seo_assets IS 'SEO-related assets like OG images, favicons, etc.';
COMMENT ON TABLE seo_settings IS 'Store-specific SEO metadata and configuration';
COMMENT ON TABLE structured_data_templates IS 'JSON-LD schema.org templates with Mustache variables';
COMMENT ON TABLE subscriptions IS 'User subscription/plan management with billing cycles';
COMMENT ON COLUMN coupons.status IS 'Coupon status: ACTIVE, INACTIVE, EXPIRED, SCHEDULED';

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
