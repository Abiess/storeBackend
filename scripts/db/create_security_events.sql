-- ════════════════════════════════════════════════════════════════════════════
-- SOFORTMASSNAHME: security_events Tabelle erstellen
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- AUSFÜHRUNG:
-- psql -U postgres -d storebackend -f scripts/db/create_security_events.sql
-- 
-- ODER via IDE/DBeaver/pgAdmin direkt ausführen
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop falls existiert (nur bei Neuerstellung)
-- DROP TABLE IF EXISTS security_events CASCADE;

CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    request_id VARCHAR(100),
    endpoint VARCHAR(200) NOT NULL,
    client_ip VARCHAR(50),
    forwarded_for VARCHAR(200),
    user_agent VARCHAR(500),
    email_masked VARCHAR(100),
    email_domain VARCHAR(100),
    phone_masked VARCHAR(50),
    captcha_present BOOLEAN,
    captcha_valid BOOLEAN,
    honeypot_triggered BOOLEAN,
    rate_limit_type VARCHAR(50),
    blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason VARCHAR(200),
    mail_triggered BOOLEAN,
    http_status INTEGER,
    store_id BIGINT,
    user_id BIGINT,
    CONSTRAINT fk_security_events_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indizes für Performance (Grafana Queries)
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_endpoint ON security_events(endpoint);
CREATE INDEX IF NOT EXISTS idx_security_events_client_ip ON security_events(client_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_blocked ON security_events(blocked);
CREATE INDEX IF NOT EXISTS idx_security_events_email_domain ON security_events(email_domain);

-- Kommentare (Dokumentation)
COMMENT ON TABLE security_events IS 'Security Audit Log: CAPTCHA, Rate Limiting, Honeypot, Bot Protection';
COMMENT ON COLUMN security_events.email_masked IS 'DSGVO-konform: te***@example.com (nie volle E-Mail)';
COMMENT ON COLUMN security_events.phone_masked IS 'DSGVO-konform: +49***1234 (nie volle Nummer)';
COMMENT ON COLUMN security_events.blocked IS 'true = Request blockiert, false = durchgelassen';
COMMENT ON COLUMN security_events.mail_triggered IS 'true = E-Mail wurde trotz Verdacht versendet';

-- Test-Event einfügen (optional, zum Testen der Grafana Dashboards)
INSERT INTO security_events (
    endpoint, 
    client_ip, 
    email_masked, 
    email_domain,
    captcha_present,
    captcha_valid,
    blocked,
    block_reason,
    mail_triggered,
    http_status,
    created_at
) VALUES (
    '/api/auth/forgot-password',
    '127.0.0.1',
    'te***@example.com',
    'example.com',
    true,
    false,
    true,
    'CAPTCHA validation failed',
    false,
    400,
    NOW()
);

COMMIT;

-- Prüfung
SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE blocked = true) as blocked_events,
    COUNT(DISTINCT endpoint) as unique_endpoints,
    MAX(created_at) as latest_event
FROM security_events;

\echo '✅ security_events Tabelle erfolgreich erstellt!'
