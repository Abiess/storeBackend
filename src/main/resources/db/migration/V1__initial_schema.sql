-- Flyway Migration V1: Initial Schema
-- Erstellt alle benötigten Tabellen für das Store Backend
-- Optimiert für PostgreSQL

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
    FOREIGN KEY (plan_id) REFERENCES plans(id)
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
    FOREIGN KEY (owner_id) REFERENCES users(id)
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Store Usage Tracking
CREATE TABLE IF NOT EXISTS store_usage (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL UNIQUE,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    product_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- User Roles (Join-Tabelle)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Product Options
CREATE TABLE IF NOT EXISTS product_options (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Option Values
CREATE TABLE IF NOT EXISTS product_option_values (
    id BIGSERIAL PRIMARY KEY,
    option_id BIGINT NOT NULL,
    value VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    attributes_json TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
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
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
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
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id)
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
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
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
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
    FOREIGN KEY (saved_cart_id) REFERENCES saved_carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_product_ids (
    coupon_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, product_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_category_ids (
    coupon_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, category_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_collection_ids (
    coupon_id BIGINT NOT NULL,
    collection_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, collection_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_customer_emails (
    coupon_id BIGINT NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    PRIMARY KEY (coupon_id, customer_email),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_domain_ids (
    coupon_id BIGINT NOT NULL,
    domain_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, domain_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
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
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
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
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_domains_host ON domains(host);
CREATE INDEX IF NOT EXISTS idx_domains_store ON domains(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_media ON product_media(media_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_store_id ON carts(store_id);
CREATE INDEX IF NOT EXISTS idx_carts_expires_at ON carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON customer_addresses(customer_id, is_default);
CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_store ON wishlists(store_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_default ON wishlists(customer_id, is_default);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_saved_carts_customer ON saved_carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_carts_store ON saved_carts(store_id);
CREATE INDEX IF NOT EXISTS idx_saved_cart_items_cart ON saved_cart_items(saved_cart_id);
CREATE INDEX IF NOT EXISTS idx_coupon_store ON coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_coupon_code ON coupons(store_id, code_normalized);
CREATE INDEX IF NOT EXISTS idx_coupon_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_redemption_store ON coupon_redemptions(store_id);
CREATE INDEX IF NOT EXISTS idx_redemption_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_redemption_customer ON coupon_redemptions(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemption_order ON coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_theme_store ON store_themes(store_id);
CREATE INDEX IF NOT EXISTS idx_theme_active ON store_themes(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_timestamp ON inventory_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_redirect_store ON redirect_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_redirect_domain ON redirect_rules(domain_id);
CREATE INDEX IF NOT EXISTS idx_redirect_active ON redirect_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_redirect_priority ON redirect_rules(priority);

