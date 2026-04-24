-- =====================================================================
-- Migration V002: Store-Themes & Free-Template-Katalog
-- =====================================================================
-- - Sichert die store_themes Tabelle ab (idempotent)
-- - Erstellt theme_templates Tabelle für wiederverwendbare Vorlagen
-- - Seedet 5 Free-Templates (Modern, Classic, Minimal, Elegant, Dark)
-- =====================================================================

BEGIN;

-- 1. store_themes Tabelle absichern ------------------------------------
CREATE TABLE IF NOT EXISTS store_themes (
    id              BIGSERIAL PRIMARY KEY,
    store_id        BIGINT NOT NULL,
    name            VARCHAR(255),
    type            VARCHAR(50),
    template        VARCHAR(50),
    colors_json     TEXT,
    typography_json TEXT,
    layout_json     TEXT,
    custom_css      TEXT,
    logo_url        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_themes_store FOREIGN KEY (store_id)
        REFERENCES stores(id) ON DELETE CASCADE
);

-- Spalten für Bestandsinstallationen sicherstellen
ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS layout_json TEXT;
ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS typography_json TEXT;
ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS colors_json TEXT;

CREATE INDEX IF NOT EXISTS idx_theme_store ON store_themes(store_id);
CREATE INDEX IF NOT EXISTS idx_theme_store_active ON store_themes(store_id, is_active);

-- 2. theme_templates Tabelle (Free-Template-Katalog) -------------------
CREATE TABLE IF NOT EXISTS theme_templates (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,         -- 'modern', 'classic', ...
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    type            VARCHAR(50) NOT NULL,                -- MODERN, CLASSIC, ...
    template        VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    preview_url     TEXT,
    colors_json     TEXT NOT NULL,
    typography_json TEXT NOT NULL,
    layout_json     TEXT NOT NULL,
    custom_css      TEXT,
    is_free         BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,       -- für Admin-Deaktivierung
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_theme_templates_free ON theme_templates(is_free, is_active);

-- 3. Seed: 5 Free-Templates --------------------------------------------
-- ON CONFLICT (code) DO NOTHING => idempotent, überschreibt nichts
INSERT INTO theme_templates (code, name, description, type, template, preview_url,
    colors_json, typography_json, layout_json, is_free, sort_order)
VALUES
('modern', 'Modern', 'Sauberes, modernes Design mit lebendigen Farben',
 'MODERN', 'GENERAL', '/assets/themes/modern-preview.jpg',
 '{"primary":"#667eea","secondary":"#764ba2","accent":"#f093fb","background":"#ffffff","text":"#1a202c","textSecondary":"#718096","border":"#e2e8f0","success":"#48bb78","warning":"#ed8936","error":"#f56565"}',
 '{"fontFamily":"''Inter'', sans-serif","headingFontFamily":"''Poppins'', sans-serif","fontSize":{"small":"0.875rem","base":"1rem","large":"1.125rem","xl":"1.5rem","xxl":"2.25rem"}}',
 '{"headerStyle":"fixed","footerStyle":"full","productGridColumns":3,"borderRadius":"medium","spacing":"normal"}',
 TRUE, 1),

('classic', 'Klassisch', 'Zeitloses Design für traditionelle Shops',
 'CLASSIC', 'GENERAL', '/assets/themes/classic-preview.jpg',
 '{"primary":"#2c5282","secondary":"#2d3748","accent":"#d69e2e","background":"#f7fafc","text":"#2d3748","textSecondary":"#718096","border":"#cbd5e0","success":"#38a169","warning":"#d69e2e","error":"#e53e3e"}',
 '{"fontFamily":"''Georgia'', serif","headingFontFamily":"''Playfair Display'', serif","fontSize":{"small":"0.875rem","base":"1rem","large":"1.125rem","xl":"1.5rem","xxl":"2.5rem"}}',
 '{"headerStyle":"static","footerStyle":"full","productGridColumns":3,"borderRadius":"small","spacing":"normal"}',
 TRUE, 2),

('minimal', 'Minimalistisch', 'Reduziertes Design mit Fokus auf Produkte',
 'MINIMAL', 'GENERAL', '/assets/themes/minimal-preview.jpg',
 '{"primary":"#000000","secondary":"#4a5568","accent":"#718096","background":"#ffffff","text":"#000000","textSecondary":"#718096","border":"#e2e8f0","success":"#38a169","warning":"#d69e2e","error":"#e53e3e"}',
 '{"fontFamily":"''Helvetica Neue'', sans-serif","headingFontFamily":"''Helvetica Neue'', sans-serif","fontSize":{"small":"0.8125rem","base":"0.9375rem","large":"1.0625rem","xl":"1.375rem","xxl":"2rem"}}',
 '{"headerStyle":"static","footerStyle":"minimal","productGridColumns":4,"borderRadius":"none","spacing":"spacious"}',
 TRUE, 3),

('elegant', 'Elegant', 'Luxuriöses Design für Premium-Produkte',
 'ELEGANT', 'GENERAL', '/assets/themes/elegant-preview.jpg',
 '{"primary":"#744210","secondary":"#2d3748","accent":"#d4af37","background":"#fafaf9","text":"#1c1917","textSecondary":"#78716c","border":"#e7e5e4","success":"#15803d","warning":"#ca8a04","error":"#dc2626"}',
 '{"fontFamily":"''Cormorant Garamond'', serif","headingFontFamily":"''Cinzel'', serif","fontSize":{"small":"0.9375rem","base":"1.0625rem","large":"1.1875rem","xl":"1.625rem","xxl":"2.75rem"}}',
 '{"headerStyle":"transparent","footerStyle":"full","productGridColumns":3,"borderRadius":"small","spacing":"spacious"}',
 TRUE, 4),

('dark', 'Dunkel', 'Modernes dunkles Theme für Tech-Produkte',
 'DARK', 'GENERAL', '/assets/themes/dark-preview.jpg',
 '{"primary":"#818cf8","secondary":"#a78bfa","accent":"#c084fc","background":"#0f172a","text":"#f1f5f9","textSecondary":"#94a3b8","border":"#334155","success":"#34d399","warning":"#fbbf24","error":"#f87171"}',
 '{"fontFamily":"''Inter'', sans-serif","headingFontFamily":"''Rajdhani'', sans-serif","fontSize":{"small":"0.875rem","base":"1rem","large":"1.125rem","xl":"1.5rem","xxl":"2.25rem"}}',
 '{"headerStyle":"fixed","footerStyle":"minimal","productGridColumns":3,"borderRadius":"medium","spacing":"normal"}',
 TRUE, 5)
ON CONFLICT (code) DO NOTHING;

COMMIT;

