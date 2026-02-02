-- Store Slider Feature
-- Ermöglicht Default-Slider mit Store-spezifischen Bildern

-- Slider Settings pro Store
CREATE TABLE store_slider_settings (
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
CREATE TABLE store_slider_images (
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
CREATE INDEX idx_slider_images_store_id ON store_slider_images(store_id);
CREATE INDEX idx_slider_images_active_order ON store_slider_images(store_id, is_active, display_order);
CREATE INDEX idx_slider_images_type ON store_slider_images(store_id, image_type);

-- Default Slider Images URLs (werden bei Store-Erstellung verwendet)
CREATE TABLE default_slider_images (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL DEFAULT 'general', -- fashion, electronics, food, general, etc.
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_default_slider_category ON default_slider_images(category, is_active, display_order);

-- Initial Default Slider Images (Placeholder URLs - können später ersetzt werden)
INSERT INTO default_slider_images (category, image_url, alt_text, display_order) VALUES
('general', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=400&fit=crop', 'Willkommen in unserem Shop', 1),
('general', 'https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=400&fit=crop', 'Beste Angebote', 2),
('general', 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=1200&h=400&fit=crop', 'Premium Produkte', 3),
('fashion', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop', 'Fashion Collection', 1),
('fashion', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop', 'Style & Trends', 2),
('electronics', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=400&fit=crop', 'Tech Innovation', 1),
('electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=400&fit=crop', 'Latest Gadgets', 2),
('food', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop', 'Frische Zutaten', 1),
('food', 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=400&fit=crop', 'Leckere Gerichte', 2);

-- Rechte für storeapp User
GRANT ALL PRIVILEGES ON TABLE store_slider_settings TO storeapp;
GRANT ALL PRIVILEGES ON TABLE store_slider_images TO storeapp;
GRANT ALL PRIVILEGES ON TABLE default_slider_images TO storeapp;
GRANT ALL PRIVILEGES ON SEQUENCE store_slider_settings_id_seq TO storeapp;
GRANT ALL PRIVILEGES ON SEQUENCE store_slider_images_id_seq TO storeapp;
GRANT ALL PRIVILEGES ON SEQUENCE default_slider_images_id_seq TO storeapp;

