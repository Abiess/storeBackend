-- V26: GeoIP und ASN-Erweiterung für Security Events
-- Ergänzt geografische und Provider-Informationen für Threat Intelligence

-- ══════════════════════════════════════════════════════════════════════════════
-- GeoIP Spalten
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE security_events ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS continent VARCHAR(50);

-- ══════════════════════════════════════════════════════════════════════════════
-- ASN / Provider Spalten
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE security_events ADD COLUMN IF NOT EXISTS asn INTEGER;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS asn_org VARCHAR(200);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS isp VARCHAR(200);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS cloud_provider VARCHAR(50);
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS is_hosting_provider BOOLEAN DEFAULT FALSE;

-- ══════════════════════════════════════════════════════════════════════════════
-- Indexes für Performance
-- ══════════════════════════════════════════════════════════════════════════════

-- Country-based Analysis
CREATE INDEX IF NOT EXISTS idx_security_events_country_code 
    ON security_events(country_code, created_at DESC);

-- ASN-based Analysis (Bot Detection)
CREATE INDEX IF NOT EXISTS idx_security_events_asn 
    ON security_events(asn, created_at DESC) 
    WHERE asn IS NOT NULL;

-- Hosting Provider Analysis (Bot Networks)
CREATE INDEX IF NOT EXISTS idx_security_events_hosting 
    ON security_events(is_hosting_provider, created_at DESC) 
    WHERE is_hosting_provider = TRUE;

-- Cloud Provider Analysis
CREATE INDEX IF NOT EXISTS idx_security_events_cloud 
    ON security_events(cloud_provider, created_at DESC) 
    WHERE cloud_provider IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- Kommentare
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN security_events.country_code IS 'ISO 3166-1 alpha-2 country code (DE, US, CN)';
COMMENT ON COLUMN security_events.country_name IS 'Full country name in English';
COMMENT ON COLUMN security_events.city IS 'City name (if available from GeoIP)';
COMMENT ON COLUMN security_events.latitude IS 'Geographic latitude';
COMMENT ON COLUMN security_events.longitude IS 'Geographic longitude';
COMMENT ON COLUMN security_events.continent IS 'Continent name';
COMMENT ON COLUMN security_events.asn IS 'Autonomous System Number';
COMMENT ON COLUMN security_events.asn_org IS 'ASN Organization (Hetzner, AWS, OVH)';
COMMENT ON COLUMN security_events.isp IS 'Internet Service Provider';
COMMENT ON COLUMN security_events.cloud_provider IS 'Detected cloud provider (AWS, Azure, Google Cloud)';
COMMENT ON COLUMN security_events.is_hosting_provider IS 'TRUE if IP is from known hosting/cloud provider';

-- ══════════════════════════════════════════════════════════════════════════════
-- Validation & Reporting
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Report added columns
    RAISE NOTICE '✅ Migration V26 complete:';
    RAISE NOTICE '   - Added 11 GeoIP/ASN columns';
    RAISE NOTICE '   - Created 4 performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE '📍 GeoIP Fields:';
    RAISE NOTICE '   country_code, country_name, city, latitude, longitude, continent';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 ASN/Provider Fields:';
    RAISE NOTICE '   asn, asn_org, isp, cloud_provider, is_hosting_provider';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  Backend Configuration Required:';
    RAISE NOTICE '   geoip.enabled=true';
    RAISE NOTICE '   geoip.database.path=classpath:geoip/GeoLite2-City.mmdb';
    RAISE NOTICE '';
    RAISE NOTICE '📥 Download MaxMind GeoLite2:';
    RAISE NOTICE '   https://dev.maxmind.com/geoip/geolite2-free-geolocation-data';
END $$;
