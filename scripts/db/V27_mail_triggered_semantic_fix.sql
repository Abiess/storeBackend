-- ============================================================================
-- Migration V27: mail_triggered vs mail_sent Semantic Fix
-- ============================================================================
-- Datum: 2026-07-15
-- Beschreibung: 
--   Trennung zwischen "Mail wurde angefordert" (mail_triggered) und 
--   "Mail wurde tatsächlich versendet" (mail_sent).
--   
--   BUG FIX: Vorher konnte es vorkommen, dass blocked=true und 
--            mail_sent=true gleichzeitig gesetzt waren.
--   
--   Semantik:
--   - mail_triggered = true: Request wollte eine E-Mail versenden
--   - mail_sent = true: E-Mail wurde TATSÄCHLICH erfolgreich versendet
--   
--   REGEL: blocked=true → mail_sent MUSS false sein!
-- ============================================================================

-- 1. Neues Feld: mail_triggered
ALTER TABLE security_events 
ADD COLUMN IF NOT EXISTS mail_triggered BOOLEAN DEFAULT NULL;

-- 2. Kommentare für Dokumentation
COMMENT ON COLUMN security_events.mail_triggered IS 
  'true = Request wollte eine E-Mail versenden (unabhängig ob blockiert)';

COMMENT ON COLUMN security_events.mail_sent IS 
  'true = E-Mail wurde TATSÄCHLICH erfolgreich versendet (nur wenn blocked=false). Bei blocked=true MUSS mail_sent false sein.';

-- 3. Index für Mail-Analyse (nur Events mit Mail-Anforderung)
CREATE INDEX IF NOT EXISTS idx_security_events_mail_triggered 
ON security_events(mail_triggered) 
WHERE mail_triggered = TRUE;

-- 4. Index für tatsächlich versendete Mails
CREATE INDEX IF NOT EXISTS idx_security_events_mail_sent 
ON security_events(mail_sent) 
WHERE mail_sent = TRUE;

-- 5. Daten-Migration: Alle bisherigen Events wo mail_sent gesetzt war
--    → auch mail_triggered setzen (waren alle Mail-Requests)
UPDATE security_events 
SET mail_triggered = mail_sent 
WHERE mail_sent IS NOT NULL AND mail_triggered IS NULL;

-- 6. Daten-Korrektur: Alle blockierten Events dürfen NICHT mail_sent=true haben
UPDATE security_events 
SET mail_sent = FALSE 
WHERE blocked = TRUE AND mail_sent = TRUE;

-- 7. CHECK CONSTRAINT: Datenbank erzwingt Konsistenz (Defense in Depth!)
--    REGEL: blocked=true UND mail_sent=true darf NIEMALS gleichzeitig vorkommen
ALTER TABLE security_events
DROP CONSTRAINT IF EXISTS chk_mail_sent_not_when_blocked;

ALTER TABLE security_events
ADD CONSTRAINT chk_mail_sent_not_when_blocked
CHECK (
    mail_sent = FALSE
    OR blocked = FALSE
);

COMMENT ON CONSTRAINT chk_mail_sent_not_when_blocked ON security_events IS 
  'Verhindert inkonsistente Daten: blocked=true und mail_sent=true dürfen niemals gleichzeitig gesetzt sein. Mail kann nur versendet werden wenn Request NICHT blockiert wurde.';

-- 8. Konsistenz-Check: Zeige Events mit Inkonsistenzen (nach Migration sollte dies leer sein)
DO $$
DECLARE
    inconsistent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO inconsistent_count
    FROM security_events
    WHERE blocked = TRUE AND mail_sent = TRUE;
    
    IF inconsistent_count > 0 THEN
        RAISE WARNING 'WARNUNG: % Events mit blocked=true UND mail_sent=true gefunden!', inconsistent_count;
    ELSE
        RAISE NOTICE '✅ OK: Keine inkonsistenten Events (blocked=true + mail_sent=true).';
        RAISE NOTICE '✅ CHECK CONSTRAINT aktiv - Datenbank erzwingt Konsistenz!';
    END IF;
END $$;

-- ============================================================================
-- Migration V27 abgeschlossen
-- ============================================================================
