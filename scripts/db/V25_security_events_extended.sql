-- ════════════════════════════════════════════════════════════════════════════
-- V25: security_events ERWEITERT - Enums + Neue Felder
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- AUSFÜHRUNG:
-- psql -U postgres -d storebackend -f scripts/db/V25_security_events_extended.sql
-- 
-- WICHTIG: Dieses Script ist idempotent (kann mehrfach ausgeführt werden)
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Neue Spalten hinzufügen (IF NOT EXISTS für Idempotenz)
-- ════════════════════════════════════════════════════════════════════════════

-- Event Type (Enum: LOGIN_SUCCESS, LOGIN_FAILED, REGISTRATION_ATTEMPT, etc.)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE security_events ADD COLUMN event_type VARCHAR(50);
        RAISE NOTICE 'Added column: event_type';
    END IF;
END $$;

-- HTTP Method (POST, GET, PUT, DELETE)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'http_method'
    ) THEN
        ALTER TABLE security_events ADD COLUMN http_method VARCHAR(10);
        RAISE NOTICE 'Added column: http_method';
    END IF;
END $$;

-- IP-Tracking erweitert (4 Felder für Multi-Proxy-Support)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'remote_addr'
    ) THEN
        ALTER TABLE security_events ADD COLUMN remote_addr VARCHAR(50);
        RAISE NOTICE 'Added column: remote_addr';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'x_forwarded_for'
    ) THEN
        ALTER TABLE security_events ADD COLUMN x_forwarded_for VARCHAR(200);
        RAISE NOTICE 'Added column: x_forwarded_for';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'x_real_ip'
    ) THEN
        ALTER TABLE security_events ADD COLUMN x_real_ip VARCHAR(50);
        RAISE NOTICE 'Added column: x_real_ip';
    END IF;
END $$;

-- Email-Hash (SHA-256 mit Server-Pepper)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'email_hash'
    ) THEN
        ALTER TABLE security_events ADD COLUMN email_hash VARCHAR(64);
        RAISE NOTICE 'Added column: email_hash';
    END IF;
END $$;

-- Mail Type (Enum: STORE_ACCESS, EMAIL_VERIFICATION, PASSWORD_RESET, etc.)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'mail_type'
    ) THEN
        ALTER TABLE security_events ADD COLUMN mail_type VARCHAR(50);
        RAISE NOTICE 'Added column: mail_type';
    END IF;
END $$;

-- Mail Sent (vs. mail_triggered)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'mail_sent'
    ) THEN
        ALTER TABLE security_events ADD COLUMN mail_sent BOOLEAN;
        RAISE NOTICE 'Added column: mail_sent';
    END IF;
END $$;

-- Kill Switch Triggered
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'kill_switch_triggered'
    ) THEN
        ALTER TABLE security_events ADD COLUMN kill_switch_triggered BOOLEAN;
        RAISE NOTICE 'Added column: kill_switch_triggered';
    END IF;
END $$;

-- Circuit Breaker Triggered
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'circuit_breaker_triggered'
    ) THEN
        ALTER TABLE security_events ADD COLUMN circuit_breaker_triggered BOOLEAN;
        RAISE NOTICE 'Added column: circuit_breaker_triggered';
    END IF;
END $$;

-- Login Success (für Login-Events)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'login_success'
    ) THEN
        ALTER TABLE security_events ADD COLUMN login_success BOOLEAN;
        RAISE NOTICE 'Added column: login_success';
    END IF;
END $$;

-- Risk Score (0-100, optional für Bot-Detection)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'risk_score'
    ) THEN
        ALTER TABLE security_events ADD COLUMN risk_score INTEGER;
        RAISE NOTICE 'Added column: risk_score';
    END IF;
END $$;

-- Origin Header
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'origin'
    ) THEN
        ALTER TABLE security_events ADD COLUMN origin VARCHAR(200);
        RAISE NOTICE 'Added column: origin';
    END IF;
END $$;

-- Referer Header
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'referer'
    ) THEN
        ALTER TABLE security_events ADD COLUMN referer VARCHAR(500);
        RAISE NOTICE 'Added column: referer';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Alte Spalte umbenennen (forwarded_for → x_forwarded_for)
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'security_events' AND column_name = 'forwarded_for'
    ) THEN
        -- Daten kopieren falls x_forwarded_for noch leer
        UPDATE security_events 
        SET x_forwarded_for = forwarded_for 
        WHERE x_forwarded_for IS NULL AND forwarded_for IS NOT NULL;
        
        -- Alte Spalte droppen
        ALTER TABLE security_events DROP COLUMN forwarded_for;
        RAISE NOTICE 'Renamed column: forwarded_for → x_forwarded_for';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Neue Indizes erstellen (Performance für Grafana)
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_email_hash ON security_events(email_hash);
CREATE INDEX IF NOT EXISTS idx_security_events_mail_type ON security_events(mail_type);
CREATE INDEX IF NOT EXISTS idx_security_events_login_success ON security_events(login_success);
CREATE INDEX IF NOT EXISTS idx_security_events_kill_switch ON security_events(kill_switch_triggered);
CREATE INDEX IF NOT EXISTS idx_security_events_circuit_breaker ON security_events(circuit_breaker_triggered);

-- Composite Index für Login-Analyse
CREATE INDEX IF NOT EXISTS idx_security_events_login_analysis 
ON security_events(endpoint, login_success, created_at) 
WHERE endpoint = '/api/auth/login';

-- Composite Index für Mail-Analyse
CREATE INDEX IF NOT EXISTS idx_security_events_mail_analysis 
ON security_events(mail_type, mail_sent, created_at) 
WHERE mail_sent = true;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Kommentare aktualisieren (Dokumentation)
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN security_events.event_type IS 'Event-Typ (Enum): LOGIN_SUCCESS, LOGIN_FAILED, REGISTRATION_ATTEMPT, etc.';
COMMENT ON COLUMN security_events.http_method IS 'HTTP-Methode: POST, GET, PUT, DELETE';
COMMENT ON COLUMN security_events.client_ip IS 'Berechnete echte Client-IP (via IpAddressUtil)';
COMMENT ON COLUMN security_events.remote_addr IS 'Request.getRemoteAddr() - direkte Verbindungs-IP';
COMMENT ON COLUMN security_events.x_forwarded_for IS 'X-Forwarded-For Header - volle Proxy-Kette';
COMMENT ON COLUMN security_events.x_real_ip IS 'X-Real-IP Header - NGINX Real-IP';
COMMENT ON COLUMN security_events.email_hash IS 'SHA-256(normalized_email + server_pepper) für Analytics';
COMMENT ON COLUMN security_events.mail_type IS 'Mail-Typ (Enum): STORE_ACCESS, EMAIL_VERIFICATION, PASSWORD_RESET, etc.';
COMMENT ON COLUMN security_events.mail_sent IS 'true = Mail tatsächlich versendet (vs. mail_triggered)';
COMMENT ON COLUMN security_events.kill_switch_triggered IS 'Emergency Kill Switch aktiv';
COMMENT ON COLUMN security_events.circuit_breaker_triggered IS 'Circuit Breaker hat Request blockiert';
COMMENT ON COLUMN security_events.login_success IS 'Bei Login-Events: true = erfolgreich, false = fehlgeschlagen';
COMMENT ON COLUMN security_events.risk_score IS 'Bot-Detection Risk-Score (0-100, optional)';
COMMENT ON COLUMN security_events.origin IS 'Origin-Header (CORS)';
COMMENT ON COLUMN security_events.referer IS 'Referer-Header (woher kam der Request)';

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Verifizierung
-- ════════════════════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'security_events';
    
    RAISE NOTICE '✅ security_events hat jetzt % Spalten', col_count;
    
    IF col_count < 30 THEN
        RAISE WARNING '⚠️ Erwartet mindestens 30 Spalten, gefunden: %', col_count;
    END IF;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- PRÜFUNG
-- ════════════════════════════════════════════════════════════════════════════

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'security_events'
ORDER BY ordinal_position;

\echo ''
\echo '✅ V25: security_events erfolgreich erweitert!'
\echo '📊 Neue Felder: event_type, http_method, remote_addr, x_forwarded_for, x_real_ip,'
\echo '               email_hash, mail_type, mail_sent, kill_switch_triggered,'
\echo '               circuit_breaker_triggered, login_success, risk_score, origin, referer'
\echo ''
\echo '🔍 Indizes: event_type, email_hash, mail_type, login_success,'
\echo '            kill_switch, circuit_breaker, + 2 composite'
\echo ''
